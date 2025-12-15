# プロジェクト名: OSM to SVG Line Art Exporter

## 概要
OpenStreetMap (OSM) の地図データを活用し、指定したエリアを「線画（アートワーク）」として表示・SVG形式でダウンロードできるWebツールを作成する。

## 要件定義

### 1. 地図表示と範囲選択 (Map Interface & Selection)
*   **地図表示**: 画面上にOpenStreetMapを表示する。
*   **範囲選択**: ユーザーが地図をパン・ズームして、エクスポートしたい対象エリア（現在のビューポート、または矩形選択）を指定できる。

### 2. データ取得と変換 (Data Fetching & Conversion)
*   **データソース**: 指定された範囲の地理データ（道路、建物、水域など）を **Overpass API** を使用して取得する。
*   **変換処理**: 取得したOSMデータ（Node, Way, Relation）を解析し、SVGのパスデータに変換する。
    *   道路網、建物、自然地形などを適切な太さ・スタイルの線画として表現する。
    *   メルカトル図法などの投影変換を行い、緯度経度を画面上のXY座標に変換する。

### 3. 線画プレビュー (Live Preview)
*   変換されたベクターデータを、ブラウザ画面上に「線画スタイル」でプレビュー表示する。
*   背景の地図タイルとは別に、あるいは地図タイルの代わりに、生成されたSVGを描画する。

### 4. SVGダウンロード (Export Function)
*   画面上に「SVGとしてダウンロード」ボタンを設置する。
*   クリック時、生成されたSVGデータをクリーンな `.svg` ファイルとしてダウンロード保存する。

## 技術スタック
*   **Frontend**: HTML5, CSS3, JavaScript (Vite + Vanilla JS 推奨)
*   **Map Library**: Leaflet.js
*   **API**: Overpass API
*   **Utility**: `osmtogeojson` (OSMデータをGeoJSONに変換し、扱いやすくするため)
