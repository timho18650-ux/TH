/**
 * 建置腳本：從行程來源目錄（預設 C:\TH）讀取 MD + KML，產出 dist/data/*.json 並複製前端到 dist。
 * 環境變數 TRIP_SOURCE 可覆寫來源目錄。
 * 參數 --single 時額外產出單一 HTML（內嵌 JSON）至 dist/trip-offline.html。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseItineraryMd } from './parse-md.js';
import { parseKmlFiles, getDefaultKmlPaths } from './parse-kml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourceDir = process.env.TRIP_SOURCE || 'C:\\TH';
const singleFile = process.argv.includes('--single');

const mdPath = path.join(sourceDir, '曼谷成人行程規劃.md');
const kmlPaths = getDefaultKmlPaths(sourceDir);

const distDir = path.join(rootDir, 'dist');
const dataDir = path.join(distDir, 'data');
const repoDataDir = path.join(rootDir, 'data');
const repoItineraryPath = path.join(repoDataDir, 'itinerary.json');
const repoPlacesPath = path.join(repoDataDir, 'places.json');

fs.mkdirSync(dataDir, { recursive: true });

let itinerary;
let places;

if (fs.existsSync(mdPath)) {
  try {
    itinerary = parseItineraryMd(mdPath);
    places = parseKmlFiles(kmlPaths);
  } catch (err) {
    console.error('解析失敗:', err.message);
    console.error('  MD:', mdPath);
    console.error('  KML:', kmlPaths.join(', '));
    process.exit(1);
  }
  console.log('已從來源讀取行程與地點資料');
  fs.mkdirSync(repoDataDir, { recursive: true });
  fs.writeFileSync(repoItineraryPath, JSON.stringify(itinerary, null, 2), 'utf8');
  fs.writeFileSync(repoPlacesPath, JSON.stringify(places, null, 2), 'utf8');
  console.log('已寫入 data/（可 commit 後讓 Vercel 顯示真實行程）');
} else if (fs.existsSync(repoItineraryPath) && fs.existsSync(repoPlacesPath)) {
  try {
    itinerary = JSON.parse(fs.readFileSync(repoItineraryPath, 'utf8'));
    places = JSON.parse(fs.readFileSync(repoPlacesPath, 'utf8'));
  } catch (err) {
    console.error('讀取 data/*.json 失敗:', err.message);
    process.exit(1);
  }
  console.log('已從 repo data/ 讀取行程與地點（無本機來源時使用）');
} else {
  console.warn('找不到行程 MD (' + mdPath + ') 且無 data/*.json，使用空白資料');
  itinerary = {
    title: '行程',
    flights: [],
    hotel: null,
    reservedRestaurants: [],
    placesFromMd: [],
    days: [],
    routes: { A: { title: '', rows: [] }, B: { title: '', rows: [] }, C: { title: '', rows: [] } },
  };
  places = [];
}

fs.writeFileSync(path.join(dataDir, 'itinerary.json'), JSON.stringify(itinerary, null, 2), 'utf8');
fs.writeFileSync(path.join(dataDir, 'places.json'), JSON.stringify(places, null, 2), 'utf8');
console.log('已寫入 dist/data/itinerary.json, dist/data/places.json');

const srcDir = path.join(rootDir, 'src');
for (const name of ['index.html', 'app.js', 'style.css']) {
  const src = path.join(srcDir, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(distDir, name));
    console.log('已複製 src/' + name + ' -> dist/');
  }
}
const swSrc = path.join(rootDir, 'src', 'sw.js');
if (fs.existsSync(swSrc)) {
  fs.copyFileSync(swSrc, path.join(distDir, 'sw.js'));
  console.log('已複製 src/sw.js -> dist/');
}

if (singleFile) {
  const htmlPath = path.join(rootDir, 'src', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const appJs = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');
  const styleCss = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
  const inlineData = 'window.__TRIP_DATA__=' + JSON.stringify({ itinerary, places }) + ';';
  html = html
    .replace(/<script\s+src="[^"]*app\.js"[^>]*><\/script>/i, '<script>' + inlineData + '\n' + appJs + '</script>')
    .replace(/<link\s+rel="stylesheet"\s+href="[^"]*style\.css"[^>]*>/i, '<style>' + styleCss + '</style>');
  fs.writeFileSync(path.join(distDir, 'trip-offline.html'), html, 'utf8');
  console.log('已產出 dist/trip-offline.html（內嵌資料）');
}
