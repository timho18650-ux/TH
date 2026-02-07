/* 簡易 Service Worker：快取靜態資源與 data JSON，離線可讀 */
const CACHE = 'trip-viewer-v1';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './style.css',
        './data/itinerary.json',
        './data/places.json',
      ]).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.url.indexOf(self.location.origin) !== 0) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (res) {
        const clone = res.clone();
        if (res.status === 200 && (e.request.url.endsWith('.json') || e.request.url.match(/\.(html|js|css)$/))) {
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return res;
      });
    })
  );
});
