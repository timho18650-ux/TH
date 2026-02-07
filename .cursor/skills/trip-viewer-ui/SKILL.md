---
name: trip-viewer-ui
description: Optimizes Trip Viewer front-end UI and UX including loading and error states, theme, touch targets, and accessibility. Use when modifying index.html, style.css, or UI logic in app.js.
---

# Trip Viewer UI

## When to Apply

Apply when changing the itinerary viewer interface: layout, styles, loading/error handling, tabs, place links, or PWA/single-file UI.

## Conventions (see .cursor/rules/ui-conventions.mdc)

- Mobile-first; touch targets ≥ 44px via `--tap`.
- Use CSS variables for colors; no hardcoded hex in new styles.
- Show loading state before data; show error message and retry on fetch failure.
- Map buttons: class `btn-maps`, `data-url`; in-text place links: class `place-link`, `target="_blank"` `rel="noopener"`.
- Keep tab panels accessible: `role="tablist"`, `role="tab"`, `aria-selected`.

## Loading and Error Flow

1. On init, show a loading message in `#app` (e.g. a `<p id="loading">載入行程中…</p>`).
2. Call `loadData()`; on resolve, hide loading, set `data.itinerary` / `data.places`, run all render functions.
3. On reject, hide loading, show an error block (e.g. `<div id="error">無法載入行程，<button>重試</button></div>`) and wire the button to call `loadData()` again then re-render.

## Single-File Mode

`trip-offline.html` inlines `window.__TRIP_DATA__`; no fetch. Detect via `window.__TRIP_DATA__` and skip loading state; render immediately.
