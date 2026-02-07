/**
 * 解析 KML，產出地點 JSON：id, name, category, lat, lng, description, googleMapsUrl。
 * 支援 Folder = 分類、Placemark = 點位；description 內擷取首個 Google Maps 連結，否則用座標建 URL。
 */

import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const UTF8 = 'utf8';

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirstGoogleMapsUrl(html) {
  if (!html || typeof html !== 'string') return null;
  const m = html.match(/href=["'](https:\/\/[^"']*google\.com\/maps[^"']*)["']/i)
    || html.match(/href=["'](https:\/\/[^"']*goo\.gl[^"']*)["']/i);
  return m ? m[1] : null;
}

function coordsToGoogleMapsUrl(lng, lat) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function parsePlacemark(pm, category, index) {
  const name = pm.name ?? pm.Name ?? '';
  const desc = pm.description ?? pm.Description ?? '';
  const descText = typeof desc === 'string' ? desc : (desc['#text'] ?? '');
  const point = pm.Point ?? pm.point;
  let lat = null, lng = null;
  if (point) {
    const coord = (point.coordinates ?? point.Coordinates ?? '').trim().split(/[\s,]+/);
    if (coord.length >= 2) {
      lng = parseFloat(coord[0]);
      lat = parseFloat(coord[1]);
    }
  }
  const googleMapsUrl = extractFirstGoogleMapsUrl(descText) || coordsToGoogleMapsUrl(lng, lat);
  return {
    id: `kml-${category}-${index}`,
    name: name.trim() || '未命名',
    category,
    lat,
    lng,
    description: stripHtml(descText).slice(0, 200),
    googleMapsUrl,
  };
}

function walkFolders(node, categories = [], acc = []) {
  if (!node) return acc;
  const folder = node.Folder ?? node.folder;
  const folders = Array.isArray(folder) ? folder : folder ? [folder] : [];
  const placemarks = node.Placemark ?? node.placemark;
  const pms = Array.isArray(placemarks) ? placemarks : placemarks ? [placemarks] : [];

  for (const f of folders) {
    const name = f.name ?? f.Name ?? '';
    const cat = (name && typeof name === 'string') ? name.replace(/^\d+_/, '') : '其他';
    walkFolders(f, [...categories, cat], acc);
  }

  const category = categories.length ? categories[categories.length - 1] : '其他';
  pms.forEach((pm, i) => {
    acc.push(parsePlacemark(pm, category, acc.length));
  });

  return acc;
}

export function parseKmlFiles(kmlPaths) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const all = [];
  for (const p of kmlPaths) {
    if (!fs.existsSync(p)) continue;
    const xml = fs.readFileSync(p, UTF8);
    const doc = parser.parse(xml);
    const kml = doc.kml ?? doc.KML;
    const document = kml?.Document ?? kml?.document;
    if (document) {
      const places = walkFolders(document);
      all.push(...places);
    }
  }
  return all;
}

export function getDefaultKmlPaths(sourceDir) {
  const base = sourceDir || process.env.TRIP_SOURCE || 'C:\\TH';
  return [
    path.join(base, '曼谷成人行程_地圖_1_基礎.kml'),
    path.join(base, '曼谷成人行程_地圖_2_三條路線.kml'),
    path.join(base, '曼谷成人行程_地圖.kml'),
  ];
}
