# Implementation Plan - OSM to SVG Line Art Exporter

このドキュメントでは、OpenStreetMapのデータを線画(SVG)としてエクスポートするツールの実装手順を定義します。

## Phase 1: プロジェクトセットアップ (Project Setup)
- [x] Viteを使用したバニラJSプロジェクトの初期化
- [x] 必要なライブラリのインストール
    - `leaflet` (地図表示)
    - `osmtogeojson` (OSMデータの変換用)
- [x] プロジェクト構造の整備 (`index.html`, `src/style.css`, `src/main.js` 等)

## Phase 2: 地図表示とUI実装 (Map Interface)
- [x] Leafletを使用した基本地図の表示
- [x] UIの実装
    - サイドバー/コントロールパネル (「データを取得」「SVGダウンロード」ボタン)
    - 通知/ローディング表示エリア
- [x] 現在の表示範囲（Bounding Box）の取得ロジック実装

## Phase 3: データ取得と変換ロジック (Data Fetching & Conversion)
- [x] Overpass APIへのクエリ構築機能の実装
    - 現在のバウンディングボックスに基づいて、道路(highways)、建物(buildings)、水域(water)などを取得するクエリを作成
- [x] データ取得処理の実装 (`fetch` API使用)
- [x] `osmtogeojson` を使用して、OSM XML/JSON を GeoJSON に変換
- [x] GeoJSONデータをSVG要素（`<path>`）に変換するレンダリングロジックの実装
    - 緯度経度 -> SVG座標への投影変換 (Mercator projection)

## Phase 4: SVGプレビューとダウンロード (Preview & Export)
- [x] 取得したデータを画面上のSVGコンテナに描画してプレビュー表示
- [x] 「SVGダウンロード」機能の実装
    - SVG DOMをテキスト化し、Blobとしてファイル保存させる処理

## Phase 5: UI改善とGeoJSONアップロード機能 (Enhanced UI & GeoJSON Upload) - **NEW**
- [x] **メインビューの切り替え実装**
    - 現在のサイドバープレビューを廃止し、メイン画面（地図エリア）を「地図モード」と「線画モード」で切り替えられるようにする。
    - 「Fetch」後に線画モードへ遷移、「Reselect」ボタンで地図モードへ戻る機能の実装。
- [x] **GeoJSONアップロード機能**
    - サイドバーにファイルアップロードのインプットを追加。
    - アップロードされたGeoJSONをパースして内部状態に保持。
    - **CSVサポート追加**: 緯度経度付きCSVファイルも読み込み可能にし、内部でGeoJSON相当のLineStringとして扱う。
- [x] **GeoJSONの重ね合わせ描画**
    - SVG生成時に、OSMデータに加えてアップロードされたGeoJSONデータも描画するロジックを追加。
    - アップロードデータは黒色（または指定の線スタイル）で描画。
    - 座標変換はOSMデータと同様のプロジェクションを適用。

## Phase 6: スタイリングと調整 (Styling & Polish)
- [ ] 線画のスタイル調整（道路の太さ、建物のスタイルなど）
- [ ] UIデザインのブラッシュアップ（モダンで使いやすいデザインへ）
