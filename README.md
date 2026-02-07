# Trip Viewer

離線行程檢視：從 Markdown ＋ KML 建置手機友善單頁，依日次／路線切換、一鍵開 Google Maps。可 PWA 離線或單檔 HTML 本地開啟。

## 需求

- **行程來源**：目錄內需有
  - `曼谷成人行程規劃.md`
  - `曼谷成人行程_地圖_1_基礎.kml`
  - `曼谷成人行程_地圖_2_三條路線.kml`
- **建置**：Node.js 18+

## 安裝與建置

```bash
npm install
```

預設讀取 `C:\TH` 作為行程來源。若路徑不同，可設環境變數：

```bash
# Windows PowerShell
$env:TRIP_SOURCE = "D:\my-trip"
npm run build

# 或一次產出單檔 HTML（內嵌資料，可傳到手機離線開）
npm run build:single
```

- **一般建置**：`npm run build` → 產出 `dist/`（index.html、app.js、style.css、data/*.json、sw.js）。
- **單檔離線**：`npm run build:single` → 額外產出 `dist/trip-offline.html`（內嵌行程與地點資料，無需網路）。

## 在當地使用

### 方式一：部署到網址

將 `dist/` 部署到 Vercel、Netlify 或 GitHub Pages。手機開該網址，首次載入後 PWA 會快取，之後可離線瀏覽。

**Vercel / 從 GitHub 部署**：建置時會優先使用 repo 裡的 `data/itinerary.json` 與 `data/places.json`（若存在）。因此只要把建好的 JSON 放進 `data/` 並 push，Vercel 就會顯示真實行程。本機若有行程來源（如 `C:\TH`），執行 `npm run build` 會自動寫入 `data/`，再 `git add data/`、`git commit`、`git push` 即可更新線上內容。

### 方式二：單檔傳到手機

1. 執行 `npm run build:single`。
2. 將 `dist/trip-offline.html` 用 Line／Email／雲端傳到手機。
3. 在手機上以瀏覽器開啟該檔案，無需網路即可查看行程與一鍵開地圖。

（若內容敏感，建議只用方式二或自架主機，避免公開 URL。）

## 專案結構

```
trip-viewer/
├── scripts/
│   ├── parse-md.js    # 解析 MD → itinerary JSON
│   ├── parse-kml.js   # 解析 KML → places JSON
│   └── build.js       # 建置：讀來源、寫 dist、可產單檔
├── src/
│   ├── index.html
│   ├── app.js         # 日次／路線切換、地點列表、開地圖
│   ├── style.css      # 手機優先樣式
│   └── sw.js          # PWA Service Worker
├── dist/              # 建置輸出（可部署或打包）
├── package.json
└── README.md
```

## 上傳到 GitHub

1. **在 GitHub 建立新 repo**
   - 到 [github.com/new](https://github.com/new)
   - Repository name 填 `trip-viewer`（或自訂）
   - 不要勾選 "Add a README"（本地已有）
   - 建立後記下 repo 網址，例如：`https://github.com/你的帳號/trip-viewer.git`

2. **在本機連線並推送**
   - 在專案目錄 `c:\trip-viewer` 執行（請把下面網址改成你的 repo）：

```bash
cd c:\trip-viewer
git remote add origin https://github.com/你的帳號/trip-viewer.git
git push -u origin main
```

   - 若已加過 `origin`，可先刪除再加：`git remote remove origin`
   - 推送時會要求登入 GitHub（或使用 Personal Access Token／SSH）。

3. **之後若要更新並再推**
```bash
git add .
git commit -m "更新說明"
git push
```

若行程來源（如 `C:\TH`）不在本 repo，請勿加入版控；僅程式碼與 README 納入版控即可。`dist/` 已在 `.gitignore`，不會被推送。
