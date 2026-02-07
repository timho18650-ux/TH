(function () {
  'use strict';

  function loadData() {
    if (window.__TRIP_DATA__) return Promise.resolve(window.__TRIP_DATA__);
    return Promise.all([
      fetch('data/itinerary.json').then(function (r) { return r.json(); }),
      fetch('data/places.json').then(function (r) { return r.json(); }),
    ]).then(function ([itinerary, places]) {
      return { itinerary, places };
    });
  }

  var state = { day: 0, route: 'A', placeCategory: '' };
  var data = { itinerary: null, places: [] };

  function openMaps(url) {
    if (url) window.open(url, '_blank', 'noopener');
  }

  function renderTitle() {
    if (!data.itinerary) return;
    var el = document.getElementById('title');
    var sub = document.getElementById('subtitle');
    if (el) el.textContent = data.itinerary.title || '行程';
    if (sub && data.itinerary.hotel) sub.textContent = data.itinerary.hotel.name || '';
  }

  function renderReserved() {
    var section = document.getElementById('reserved');
    if (!section || !data.itinerary || !data.itinerary.reservedRestaurants.length) return;
    var html = '<h2>已預訂餐廳</h2><ul class="reserved-list">';
    data.itinerary.reservedRestaurants.forEach(function (r) {
      var url = (data.itinerary.placesFromMd || []).find(function (p) { return p.name === r.name; });
      url = url && url.googleMapsUrl ? url.googleMapsUrl : null;
      html += '<li class="reserved-item">';
      html += '<span class="reserved-date">' + (r.date + ' ' + r.time) + '</span>';
      html += '<span class="reserved-name">' + r.name + '</span>';
      if (r.note) html += '<span class="reserved-note">' + r.note + '</span>';
      if (url) html += '<button type="button" class="btn-maps" data-url="' + url.replace(/"/g, '&quot;') + '">開啟地圖</button>';
      html += '</li>';
    });
    html += '</ul>';
    section.innerHTML = html;
    section.querySelectorAll('.btn-maps').forEach(function (btn) {
      btn.addEventListener('click', function () { openMaps(btn.getAttribute('data-url')); });
    });
  }

  function renderDayContent() {
    var container = document.getElementById('day-content');
    if (!container || !data.itinerary) return;
    var day = state.day;
    if (day === 0) {
      container.innerHTML = '<p class="hint">請選擇 Day 1–4 查看當日行程。</p>';
      return;
    }
    var d = data.itinerary.days && data.itinerary.days.find(function (x) { return x.day === day; });
    if (!d) {
      container.innerHTML = '';
      return;
    }
    var html = '<h2>Day ' + day + '（' + (d.date || '') + '）</h2><p class="day-title">' + (d.title || '') + '</p><table class="day-table"><thead><tr><th>時段</th><th>行程</th><th>備註</th></tr></thead><tbody>';
    (d.slots || []).forEach(function (s) {
      html += '<tr><td>' + (s.time || '') + '</td><td>' + (s.activity || '') + '</td><td>' + (s.note || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderRouteContent() {
    var container = document.getElementById('route-content');
    if (!container || !data.itinerary) return;
    var r = data.itinerary.routes && data.itinerary.routes[state.route];
    if (!r) {
      container.innerHTML = '';
      return;
    }
    var html = '<h2>路線 ' + state.route + '：' + (r.title || '') + '</h2><table class="route-table"><thead><tr><th>日</th><th>時段</th><th>行程</th><th>店家／備註</th></tr></thead><tbody>';
    (r.rows || []).forEach(function (row) {
      html += '<tr><td>' + (row['日'] || '') + '</td><td>' + (row['時段'] || '') + '</td><td>' + (row['行程'] || '') + '</td><td>' + (row['店家／備註'] || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function getPlaceCategories() {
    var set = new Set();
    (data.places || []).forEach(function (p) { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }

  function renderPlaces() {
    var list = document.getElementById('places-list');
    var filters = document.getElementById('places-filters');
    if (!list || !data.places) return;
    var categories = getPlaceCategories();
    if (filters && categories.length) {
      filters.innerHTML = '<label>分類：</label><select id="place-category"><option value="">全部</option>' +
        categories.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select>';
      filters.querySelector('select').addEventListener('change', function () {
        state.placeCategory = this.value;
        renderPlacesList();
      });
    }
    state.placeCategory = state.placeCategory || '';
    renderPlacesList();
  }

  function renderPlacesList() {
    var list = document.getElementById('places-list');
    if (!list) return;
    var items = data.places.filter(function (p) {
      return !state.placeCategory || p.category === state.placeCategory;
    });
    list.innerHTML = items.map(function (p) {
      var url = p.googleMapsUrl || ('https://www.google.com/maps?q=' + (p.lat && p.lng ? p.lat + ',' + p.lng : encodeURIComponent(p.name)));
      return '<li class="place-item"><div class="place-name">' + (p.name || '') + '</div>' +
        (p.category ? '<div class="place-cat">' + p.category + '</div>' : '') +
        (p.description ? '<div class="place-desc">' + p.description + '</div>' : '') +
        '<button type="button" class="btn-maps" data-url="' + url.replace(/"/g, '&quot;') + '">開啟地圖</button></li>';
    }).join('');
    list.querySelectorAll('.btn-maps').forEach(function (btn) {
      btn.addEventListener('click', function () { openMaps(btn.getAttribute('data-url')); });
    });
  }

  function setDay(n) {
    state.day = n;
    document.querySelectorAll('.day-tabs .tab').forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-day') === String(n));
      t.classList.toggle('active', t.getAttribute('data-day') === String(n));
    });
    renderDayContent();
  }

  function setRoute(r) {
    state.route = r;
    document.querySelectorAll('.route-tabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-route') === r);
    });
    renderRouteContent();
  }

  function init() {
    loadData().then(function (r) {
      data.itinerary = r.itinerary;
      data.places = r.places || [];
      renderTitle();
      renderReserved();
      renderDayContent();
      renderRouteContent();
      renderPlaces();
    });

    document.querySelectorAll('.day-tabs .tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setDay(parseInt(btn.getAttribute('data-day'), 10)); });
    });
    document.querySelectorAll('.route-tabs .tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setRoute(btn.getAttribute('data-route')); });
    });

    setDay(0);
    setRoute('A');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
