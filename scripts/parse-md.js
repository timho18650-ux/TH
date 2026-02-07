/**
 * 解析行程 Markdown，產出結構化 itinerary JSON。
 * 讀取 UTF-8 檔案，輸出：航班、酒店摘要、已預訂餐廳、Day 1–4、路線 A/B/C、地點表（含 Google Maps 連結）。
 */

import fs from 'fs';
import path from 'path';

const UTF8 = 'utf8';

function parseTableRows(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  let inTable = false;
  let headerCells = [];
  for (const line of lines) {
    const trim = line.trim();
    if (!trim) continue;
    const isSeparator = /^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)*\|?\s*$/.test(trim);
    const isRow = trim.startsWith('|');
    if (isRow && !isSeparator) {
      const cells = trim
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, '').replace(/\s+/g, ' '));
      if (!inTable) {
        headerCells = cells;
        inTable = true;
      } else {
        const obj = {};
        headerCells.forEach((h, i) => {
          obj[h] = cells[i] ?? '';
        });
        rows.push(obj);
      }
    } else if (inTable && !isRow) {
      inTable = false;
    }
  }
  return rows;
}

function extractLinks(text) {
  const re = /\[([^\]]*)\]\((https:\/\/[^)]+)\)/g;
  const links = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    links.push({ text: m[1], url: m[2] });
  }
  return links;
}

function firstGoogleMapsUrl(links) {
  const found = links.find((l) => /google\.com\/maps|maps\.google|goo\.gl\/maps/.test(l.url));
  return found ? found.url : null;
}

export function parseItineraryMd(mdPath) {
  const raw = fs.readFileSync(mdPath, UTF8);
  const sections = raw.split(/(?=^##\s)/m).filter(Boolean);

  const result = {
    title: '曼谷 4 天成人混合行程規劃',
    flights: [],
    hotel: null,
    reservedRestaurants: [],
    placesFromMd: [],
    days: [],
    routes: { A: { title: '', rows: [] }, B: { title: '', rows: [] }, C: { title: '', rows: [] } },
  };

  for (const block of sections) {
    const head = block.slice(0, 200);
    if (head.includes('## 航班日程')) {
      const rows = parseTableRows(block);
      result.flights = rows.map((r) => ({
        direction: r['方向'] ?? r[''] ?? '',
        date: r['日期'] ?? '',
        flight: r['航班'] ?? '',
        depart: r['起飛'] ?? '',
        arrive: r['抵達'] ?? '',
      }));
    }
    if (head.startsWith('## 酒店')) {
      const nameMatch = block.match(/\*\*名稱\*\*[：:]\s*([^\n]+)/);
      const checkInMatch = block.match(/\*\*入住\*\*[：:]\s*([^\n]+)/);
      const checkOutMatch = block.match(/\*\*退房\*\*[：:]\s*([^\n]+)/);
      const roomMatch = block.match(/\*\*房型\*\*[：:]\s*([^\n]+)/);
      if (nameMatch) {
        result.hotel = {
          name: nameMatch[1].trim(),
          checkIn: checkInMatch ? checkInMatch[1].trim() : '',
          checkOut: checkOutMatch ? checkOutMatch[1].trim() : '',
          roomType: roomMatch ? roomMatch[1].trim() : '',
        };
      }
    }
    // skip other blocks
  }

  const mapSection = sections.find((s) => /^##\s*行程地圖/.test(s));
  if (mapSection) {
    const tables = mapSection.split(/(?=###\s)/m);
    let currentCategory = '';
    for (const t of tables) {
      if (t.includes('### 酒店')) currentCategory = '酒店';
      else if (t.includes('### 日按區')) currentCategory = '日按';
      else if (t.includes('### 紅燈區')) currentCategory = '紅燈區';
      else if (t.includes('### Soapy')) currentCategory = 'Soapy';
      else if (t.includes('### 已預訂餐廳')) currentCategory = '已預訂餐廳';
      else if (t.includes('### 景點')) currentCategory = '景點';
      else if (t.includes('### 安全套')) currentCategory = '採購';
      const rows = parseTableRows(t);
      for (const r of rows) {
        const name = r['地點'] ?? '';
        const category = (r['類別'] ?? currentCategory).trim() || currentCategory;
        const time = (r['預訂時間'] ?? '').trim();
        const links = extractLinks(JSON.stringify(r));
        const url = firstGoogleMapsUrl(links);
        if (name.trim()) {
          result.placesFromMd.push({
            name: name.trim(),
            category,
            reservedTime: time,
            googleMapsUrl: url || null,
          });
        }
      }
    }
  }

  for (const block of sections) {
    const head = block.slice(0, 200);
    if (head.includes('## 已預訂餐廳') && !head.includes('三條推薦')) {
      const rows = parseTableRows(block);
      result.reservedRestaurants = rows
        .filter((r) => r['日期'] && r['餐廳'])
        .map((r) => ({
          date: r['日期'] ?? '',
          time: r['時間'] ?? '',
          name: r['餐廳'] ?? '',
          note: r['備註'] ?? '',
        }));
    }
    if (head.includes('### 路線 A：')) {
      const titleMatch = block.match(/###\s*路線 A[：:]\s*([^\n|]+)/);
      result.routes.A.title = titleMatch ? titleMatch[1].trim() : '高評分路線';
      result.routes.A.rows = parseTableRows(block).filter((r) => r['日'] || r['時段']);
    }
    if (head.includes('### 路線 B：')) {
      const titleMatch = block.match(/###\s*路線 B[：:]\s*([^\n|]+)/);
      result.routes.B.title = titleMatch ? titleMatch[1].trim() : '性價比路線';
      result.routes.B.rows = parseTableRows(block).filter((r) => r['日'] || r['時段']);
    }
    if (head.includes('### 路線 C：')) {
      const titleMatch = block.match(/###\s*路線 C[：:]\s*([^\n|]+)/);
      result.routes.C.title = titleMatch ? titleMatch[1].trim() : 'Soapy 高檔路線';
      result.routes.C.rows = parseTableRows(block).filter((r) => r['日'] || r['時段']);
    }
    if (/## Day 1（2\/26）/.test(block)) {
      const rows = parseTableRows(block);
      result.days.push({ day: 1, date: '2/26', title: '抵達＋文化＋都會休閒', slots: rows.map((r) => ({ time: r['時段'] ?? '', activity: r['行程'] ?? '', note: r['備註'] ?? '' })) });
    }
    if (/## Day 2（2\/27）/.test(block)) {
      const rows = parseTableRows(block);
      result.days.push({ day: 2, date: '2/27', title: '日按＋紅燈區初探', slots: rows.map((r) => ({ time: r['時段'] ?? '', activity: r['行程'] ?? '', note: r['備註'] ?? '' })) });
    }
    if (/## Day 3（2\/28）/.test(block)) {
      const rows = parseTableRows(block);
      result.days.push({ day: 3, date: '2/28', title: '日按＋夜生活深入', slots: rows.map((r) => ({ time: r['時段'] ?? '', activity: r['行程'] ?? '', note: r['備註'] ?? '' })) });
    }
    if (/## Day 4（3\/1）/.test(block)) {
      const rows = parseTableRows(block);
      result.days.push({ day: 4, date: '3/1', title: '日按＋收尾', slots: rows.map((r) => ({ time: r['時段'] ?? '', activity: r['行程'] ?? '', note: r['備註'] ?? '' })) });
    }
  }

  return result;
}

export const defaultMdPath = () => path.join(process.env.TRIP_SOURCE || 'C:\\TH', '曼谷成人行程規劃.md');
