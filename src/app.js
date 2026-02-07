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

  var state = { day: 0, placeCategory: '', placeSearch: '', mainView: 'itinerary' };
  var data = { itinerary: null, places: [] };

  function openMaps(url) {
    if (url) window.open(url, '_blank', 'noopener');
  }

  function buildNameToUrl() {
    var map = {};
    function add(name, url) {
      var t = name && name.trim();
      if (t && url) map[t] = url;
      var noPrefix = t && t.replace(/^\[[ABC]\]\s*/, '');
      if (noPrefix && noPrefix !== t) map[noPrefix] = url;
    }
    (data.places || []).forEach(function (p) { add(p.name, p.googleMapsUrl); });
    (data.itinerary && data.itinerary.placesFromMd || []).forEach(function (p) { add(p.name, p.googleMapsUrl); });
    return map;
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function linkifyPlaceNames(text, nameToUrl) {
    if (!text || !nameToUrl) return escapeHtml(text);
    var safe = escapeHtml(text);
    var names = Object.keys(nameToUrl).filter(function (n) { return n.length >= 2; });
    names.sort(function (a, b) { return b.length - a.length; });
    names.forEach(function (name) {
      var url = nameToUrl[name];
      var re = new RegExp(escapeRegex(name), 'g');
      safe = safe.replace(re, '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" class="place-link">$&</a>');
    });
    return safe;
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
    var days = data.itinerary.days || [];
    if (day === 0) {
      if (!days.length) {
        container.innerHTML = '<p class="hint">請選擇 Day 1–4 查看當日行程。</p>';
        return;
      }
      var html = '<p class="hint">點選下方區塊查看該日詳情。</p><div class="day-summary-list">';
      days.forEach(function (d) {
        var firstSlots = (d.slots || []).slice(0, 2);
        var summary = firstSlots.map(function (s) { return s.activity || s.time || ''; }).filter(Boolean).join('、') || '查看詳情';
        html += '<button type="button" class="day-summary-block" data-day="' + d.day + '">';
        html += '<span class="day-summary-title">Day ' + d.day + '（' + (d.date || '') + '）</span>';
        html += '<span class="day-summary-sub">' + (d.title || '') + '</span>';
        html += '<span class="day-summary-preview">' + escapeHtml(summary) + '</span>';
        html += '</button>';
      });
      html += '</div>';
      container.innerHTML = html;
      container.querySelectorAll('.day-summary-block').forEach(function (btn) {
        btn.addEventListener('click', function () { setDay(parseInt(btn.getAttribute('data-day'), 10)); });
      });
      return;
    }
    var d = days.find(function (x) { return x.day === day; });
    if (!d) {
      container.innerHTML = '';
      return;
    }
    var nameToUrl = buildNameToUrl();
    var html = '<h2>Day ' + day + '（' + (d.date || '') + '）</h2><p class="day-title">' + (d.title || '') + '</p><table class="day-table"><thead><tr><th>時段</th><th>行程</th><th>備註</th></tr></thead><tbody>';
    (d.slots || []).forEach(function (s) {
      html += '<tr><td>' + escapeHtml(s.time || '') + '</td><td>' + linkifyPlaceNames(s.activity || '', nameToUrl) + '</td><td>' + linkifyPlaceNames(s.note || '', nameToUrl) + '</td></tr>';
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
    if (filters) {
      filters.innerHTML = '<input type="search" id="place-search" class="place-search" placeholder="搜尋地點或分類" aria-label="搜尋地點或分類" />' +
        (categories.length ? '<label>分類：</label><select id="place-category"><option value="">全部</option>' +
          categories.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select>' : '');
      var searchEl = document.getElementById('place-search');
      if (searchEl) {
        searchEl.value = state.placeSearch || '';
        searchEl.addEventListener('input', function () {
          state.placeSearch = this.value.trim();
          renderPlacesList();
        });
      }
      var selectEl = filters.querySelector('select');
      if (selectEl) {
        selectEl.addEventListener('change', function () {
          state.placeCategory = this.value;
          renderPlacesList();
        });
      }
    }
    state.placeCategory = state.placeCategory || '';
    renderPlacesList();
  }

  function renderPlacesList() {
    var list = document.getElementById('places-list');
    if (!list) return;
    var q = (state.placeSearch || '').toLowerCase();
    var items = data.places.filter(function (p) {
      var catMatch = !state.placeCategory || p.category === state.placeCategory;
      var searchMatch = !q || (p.name && p.name.toLowerCase().indexOf(q) !== -1) || (p.category && p.category.toLowerCase().indexOf(q) !== -1) || (p.description && p.description.toLowerCase().indexOf(q) !== -1);
      return catMatch && searchMatch;
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

  function renderGuides() {
    var container = document.getElementById('guides-list');
    if (!container || !data.itinerary || !data.itinerary.guides || !data.itinerary.guides.length) return;
    container.innerHTML = data.itinerary.guides.map(function (g) {
      return '<article class="guide-block" id="guide-' + (g.id || '') + '"><h2 class="guide-title">' + escapeHtml(g.title || '') + '</h2><div class="guide-body">' + (g.html || '') + '</div></article>';
    }).join('');
  }

  function setMainView(view) {
    state.mainView = view;
    var mainEl = document.getElementById('main-content');
    var guidesEl = document.getElementById('guides-content');
    if (mainEl) mainEl.hidden = view !== 'itinerary';
    if (guidesEl) guidesEl.hidden = view !== 'guides';
    document.querySelectorAll('.main-tabs .main-tab').forEach(function (t) {
      var isActive = t.getAttribute('data-main') === view;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });
  }

  function setLoading(show) {
    var loading = document.getElementById('loading');
    var error = document.getElementById('error');
    var header = document.getElementById('app-header');
    var body = document.getElementById('app-body');
    if (loading) loading.hidden = !show;
    if (error) error.hidden = true;
    if (header) header.hidden = show;
    if (body) body.hidden = show;
  }

  function setError(show) {
    var loading = document.getElementById('loading');
    var error = document.getElementById('error');
    var header = document.getElementById('app-header');
    var body = document.getElementById('app-body');
    if (loading) loading.hidden = true;
    if (error) error.hidden = !show;
    if (header) header.hidden = show;
    if (body) body.hidden = show;
  }

  function setContentVisible() {
    var loading = document.getElementById('loading');
    var error = document.getElementById('error');
    var header = document.getElementById('app-header');
    var body = document.getElementById('app-body');
    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    if (header) header.hidden = false;
    if (body) body.hidden = false;
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme || 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f0f0f5' : '#1a1a2e');
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀';
  }

  function initTheme() {
    var saved = localStorage.getItem('trip-theme');
    applyTheme(saved === 'light' ? 'light' : 'dark');
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var root = document.documentElement;
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        localStorage.setItem('trip-theme', next);
        applyTheme(next);
      });
    }
  }

  function doRender() {
    renderTitle();
    renderReserved();
    renderDayContent();
    renderPlaces();
    renderGuides();
  }

  function init() {
    initTheme();
    if (window.__TRIP_DATA__) {
      setContentVisible();
      data.itinerary = window.__TRIP_DATA__.itinerary;
      data.places = window.__TRIP_DATA__.places || [];
      doRender();
    } else {
      setLoading(true);
      loadData()
        .then(function (r) {
          data.itinerary = r.itinerary;
          data.places = r.places || [];
          setContentVisible();
          doRender();
        })
        .catch(function () {
          setError(true);
        });
    }

    var retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        setLoading(true);
        loadData()
          .then(function (r) {
            data.itinerary = r.itinerary;
            data.places = r.places || [];
            setContentVisible();
            doRender();
          })
          .catch(function () {
            setError(true);
          });
      });
    }

    document.querySelectorAll('.main-tabs .main-tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setMainView(btn.getAttribute('data-main')); });
    });
    document.querySelectorAll('.day-tabs .tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setDay(parseInt(btn.getAttribute('data-day'), 10)); });
    });
    setDay(0);
    setMainView('itinerary');

    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      var scrollThreshold = 300;
      function onScroll() {
        backToTop.hidden = window.scrollY <= scrollThreshold;
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
