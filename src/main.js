import './style.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import osmtogeojson from 'osmtogeojson';

// State
let map;
let currentBounds;
let currentGeoJsonData = null; // OSM Data
let uploadedGeoJson = null; // User Uploaded Data

// Initialization
function initMap() {
    const mapElement = document.getElementById('map-container');

    // Default view
    const defaultLat = 35.6106936;
    const defaultLng = 139.3490244;
    const defaultZoom = 16; // Zoomed in a bit more for campus view

    map = L.map(mapElement).setView([defaultLat, defaultLng], defaultZoom);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Update bounds on move
    map.on('moveend', updateBounds);
    updateBounds(); // Initial bounds
}

function updateBounds() {
    const bounds = map.getBounds();
    currentBounds = {
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast()
    };
}

// View Switching
function setMode(mode) {
    const mapContainer = document.getElementById('map-container');
    const svgViewer = document.getElementById('svg-viewer');
    const btnFetch = document.getElementById('btn-fetch');
    const resultActions = document.getElementById('result-actions');
    const fileUploadGroup = document.getElementById('file-upload').closest('.input-group');

    if (mode === 'map') {
        mapContainer.classList.remove('hidden');
        svgViewer.classList.add('hidden');

        // UI Controls
        btnFetch.classList.remove('hidden');
        fileUploadGroup.classList.add('hidden'); // Hide upload in map mode
        resultActions.classList.add('hidden');

        // Invalidate size to ensure map renders correctly if it was hidden
        setTimeout(() => map.invalidateSize(), 100);

    } else if (mode === 'svg') {
        mapContainer.classList.add('hidden');
        svgViewer.classList.remove('hidden');

        // UI Controls
        btnFetch.classList.add('hidden');
        fileUploadGroup.classList.remove('hidden'); // Show upload in svg mode
        resultActions.classList.remove('hidden');
    }
}

// Data Fetching
async function fetchData() {
    const statusEl = document.getElementById('status-message');

    if (!currentBounds) return;

    statusEl.textContent = 'OSMデータを取得中...';

    const bbox = `${currentBounds.south},${currentBounds.west},${currentBounds.north},${currentBounds.east}`;
    const query = `
    [out:json][timeout:60];
    (
      way["highway"](${bbox});
      way["building"](${bbox});
      way["waterway"](${bbox});
      relation["building"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;

    const url = 'https://overpass-api.de/api/interpreter';

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            if (response.status === 504) {
                throw new Error("タイムアウト: 選択範囲が広すぎます。ズームインして範囲を狭めてください。");
            }
            throw new Error(`エラー: ${response.statusText}`);
        }

        const osmData = await response.json();
        statusEl.textContent = `データ受信完了。SVGを生成中...`;

        // Convert to GeoJSON
        currentGeoJsonData = osmtogeojson(osmData);

        generateSVG();
        setMode('svg');
        statusEl.textContent = '完了。';

    } catch (error) {
        console.error(error);
        statusEl.textContent = error.message;
        alert(error.message);
    }
}

// GeoJSON/CSV Upload
function handleFileUpload(e) {
    const file = e.target.files[0];
    const statusEl = document.getElementById('status-message');

    if (!file) {
        uploadedGeoJson = null;
        generateSVG(); // Re-render to remove overlay if file cleared
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        let data = null;

        // Check if it's CSV based on extension or content
        if (file.name.toLowerCase().endsWith('.csv')) {
            try {
                data = parseCsvToGeoJson(content);
                statusEl.textContent = 'CSVを読み込みました。';
            } catch (err) {
                console.error(err);
                statusEl.textContent = '無効なCSVファイルです。';
                alert('CSVの解析に失敗しました。フォーマット: 緯度,経度 (各行)');
                e.target.value = '';
                return;
            }
        } else {
            // Assume JSON
            try {
                data = JSON.parse(content);
                statusEl.textContent = 'GeoJSONを読み込みました。';
            } catch (err) {
                console.error(err);
                statusEl.textContent = '無効なJSONファイルです。';
                alert('GeoJSON/JSONの解析に失敗しました。');
                e.target.value = '';
                return;
            }
        }

        if (data) {
            uploadedGeoJson = data;
            console.log('Overlay data loaded', uploadedGeoJson);
            // Trigger re-render to show overlay immediately
            generateSVG();
        }
    };
    reader.readAsText(file);
}

function parseCsvToGeoJson(csvText) {
    // Simple CSV parser assuming "latitude,longitude" or "lat,lon" columns, or just raw numbers.
    // We will treat the entire CSV sequence as a single LineString for now, 
    // or multiple LineStrings if there's an ID column? 
    // Let's assume simplest case: One path per file (single LineString).

    const lines = csvText.split(/\r?\n/);
    const coords = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Skip header if it contains letters (naive check)
        if (/^[a-zA-Z]/.test(line)) return;

        const parts = line.split(',');
        if (parts.length >= 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);

            // Allow reverse order detection? No, let's stick to standard order or attempt to detect.
            // Usually CSVs are lat,lon. GeoJSON is lon,lat.
            // Let's assume Lat, Lon order in CSV.

            if (!isNaN(lat) && !isNaN(lng)) {
                // Push as [lon, lat] for GeoJSON
                coords.push([lng, lat]);
            }
        }
    });

    if (coords.length < 2) {
        throw new Error("CSV内に有効な座標が見つかりません");
    }

    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coords
                },
                properties: { source: "csv-upload" }
            }
        ]
    };
}

// Projection Helper (Simple Mercator)
function project(lat, lng) {
    const R = 6378137;
    const MAX_LAT = 85.0511287798;
    const d2r = Math.PI / 180;

    const x = R * lng * d2r;
    let y = Math.max(Math.min(MAX_LAT, lat), -MAX_LAT) * d2r;
    y = R * Math.log(Math.tan((Math.PI / 4) + (y / 2)));

    return { x, y };
}

function generateSVG() {
    const container = document.getElementById('svg-viewer'); // Changed from svg-container
    container.innerHTML = '';

    const minPt = project(currentBounds.south, currentBounds.west);
    const maxPt = project(currentBounds.north, currentBounds.east);

    const width = maxPt.x - minPt.x;
    const height = maxPt.y - minPt.y;

    const svgSize = 1000;
    const aspectRatio = width / height;
    const svgWidth = aspectRatio >= 1 ? svgSize : svgSize * aspectRatio;
    const svgHeight = aspectRatio >= 1 ? svgSize / aspectRatio : svgSize;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    // Add some padding or keep exact? Keeping exact for now to match map
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    svg.innerHTML = `<rect width="${svgWidth}" height="${svgHeight}" fill="white"/>`;

    // 1. Draw OSM Data (Background)
    if (currentGeoJsonData) {
        const osmGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        osmGroup.setAttribute('stroke', '#333');
        osmGroup.setAttribute('fill', 'none');
        osmGroup.setAttribute('stroke-width', '1');
        osmGroup.setAttribute('stroke-linecap', 'round');
        osmGroup.setAttribute('stroke-linejoin', 'round');
        osmGroup.id = 'osm-layer';

        renderGeoJSONToGroup(currentGeoJsonData, osmGroup, minPt, maxPt, svgWidth, svgHeight);
        svg.appendChild(osmGroup);
    }

    // 2. Draw Uploaded Data (Foreground)
    if (uploadedGeoJson) {
        const uploadGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        uploadGroup.setAttribute('stroke', 'black'); // Strictly black as requested
        uploadGroup.setAttribute('fill', 'none');
        uploadGroup.setAttribute('stroke-width', '2'); // Slightly thicker to stand out? Or keep 1?
        uploadGroup.setAttribute('stroke-linecap', 'round');
        uploadGroup.setAttribute('stroke-linejoin', 'round');
        uploadGroup.id = 'overlay-layer';

        renderGeoJSONToGroup(uploadedGeoJson, uploadGroup, minPt, maxPt, svgWidth, svgHeight);
        svg.appendChild(uploadGroup);
    }

    container.appendChild(svg);
    setupDownload(svg);
}

function renderGeoJSONToGroup(geoJson, group, minPt, maxPt, w, h) {
    const features = Array.isArray(geoJson) ? geoJson : (geoJson.features || [geoJson]);

    features.forEach(feature => {
        const geometry = feature.geometry;
        if (!geometry) return;

        const type = geometry.type;
        const coords = geometry.coordinates;

        if (type === 'LineString') {
            const pathData = coordsToPath(coords, minPt, maxPt, w, h);
            if (pathData) appendPath(group, pathData);
        } else if (type === 'Polygon') {
            coords.forEach(ring => {
                const pathData = coordsToPath(ring, minPt, maxPt, w, h);
                if (pathData) appendPath(group, pathData);
            });
        } else if (type === 'MultiPolygon') {
            coords.forEach(polygon => {
                polygon.forEach(ring => {
                    const pathData = coordsToPath(ring, minPt, maxPt, w, h);
                    if (pathData) appendPath(group, pathData);
                });
            });
        } else if (type === 'MultiLineString') {
            coords.forEach(line => {
                const pathData = coordsToPath(line, minPt, maxPt, w, h);
                if (pathData) appendPath(group, pathData);
            });
        }
    });
}

function coordsToPath(coords, minPt, maxPt, w, h) {
    if (coords.length < 2) return null;

    const mapX = (x) => ((x - minPt.x) / (maxPt.x - minPt.x)) * w;
    const mapY = (y) => h - ((y - minPt.y) / (maxPt.y - minPt.y)) * h;

    let d = '';
    // Optimization: Simple simplification or straight rendering
    for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        const p = project(pt[1], pt[0]); // lat, lng
        const x = mapX(p.x);
        const y = mapY(p.y);

        // Bounds check optimization could be added here to avoid drawing way off screen

        if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
        else d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    return d;
}

function appendPath(group, d) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    group.appendChild(path);
}

function setupDownload(svgElement) {
    const btnDownload = document.getElementById('btn-download');
    // Clone to remove old listeners
    const newBtn = btnDownload.cloneNode(true);
    btnDownload.parentNode.replaceChild(newBtn, btnDownload);

    newBtn.addEventListener('click', () => {
        const fileName = `osm-export-${Date.now()}.svg`;
        const svgContent = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setMode('map'); // Ensure initial state
    document.getElementById('btn-fetch').addEventListener('click', fetchData);
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    document.getElementById('btn-reselect').addEventListener('click', () => {
        setMode('map');
    });
});
