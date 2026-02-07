---
name: trip-itinerary-parsing
description: Parses and builds Trip Viewer itinerary data from Markdown and KML; covers parse-md.js, parse-kml.js, build.js, and JSON schema. Use when modifying parsing scripts, MD/KML format, or build pipeline.
---

# Trip Itinerary Parsing

## When to Apply

Apply when editing parse-md.js, parse-kml.js, build.js, or when changing the structure of 曼谷成人行程規劃.md or the KML files.

## Conventions (see .cursor/rules/parsing-build.mdc)

- MD: sections by `## `; tables GFM pipe; Day 1–4 and routes A/B/C by exact heading patterns; guides by `GUIDE_SECTION_TITLES`.
- KML: Document → Folders (category from Folder name) → Placemarks (name, description, Point coordinates); googleMapsUrl from first Maps link in description or from lat,lng.
- Build: source dir from `TRIP_SOURCE` or `C:\TH`; MD path `曼谷成人行程規劃.md`; KML paths from `getDefaultKmlPaths(sourceDir)`.

## Output Schema

- **itinerary.json**: title, flights[], hotel, reservedRestaurants[], placesFromMd[], days[], routes.A|B|C, guides[].
- **places.json**: array of { id, name, category, lat, lng, description, googleMapsUrl }.

## Adding KML Files

To include another KML (e.g. 曼谷成人行程_地圖.kml), add its path in `getDefaultKmlPaths()` in parse-kml.js. Order determines merge order; duplicate place names may appear from multiple files.

## Error Handling in Build

- If MD missing and no repo data/*.json, build currently uses empty default; prefer logging a clear warning and optionally exiting with non-zero.
- Wrap parseItineraryMd/parseKmlFiles in try/catch; log file path and error message; exit process with code 1 on parse failure so CI/deploy can fail fast.
