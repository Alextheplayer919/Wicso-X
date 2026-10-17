# Validation history — 17 October 2026

This is a chronological record of development checkpoints, not a statement that every older limitation still applies. **The current checkpoint is v0.3.0 below.** See [PROGRESS.md](PROGRESS.md) for the consolidated current status and remaining work.

## Foundation v0.1.0

- `npm run build`: strict TypeScript and optimized static build pass. Application JS approximately 170 kB / 52 kB gzip; CSS approximately 29 kB / 10 kB gzip.
- `npm test`: four tests pass, covering supported raster extensions, unsupported/empty/oversized files, varying aspect ratios and dimension limits.
- `tests/browser.mjs`: passed against both the development server and production preview (`dist`). Headless Chromium integration checks for PNG/JPEG/WebP import, preserved original file bytes, aspect ratio, original scale, fit, drag pan, keyboard shortcuts, artwork visibility, corrupt image rejection with previous map retained, unsupported ZIP rejection, guide dialog, 390px mobile viewport without horizontal overflow, and zero uncaught page errors.
- Desktop empty state screenshot visually inspected at 1440×1000.
- `npm audit`: zero known dependency vulnerabilities at implementation time.

Browser provisioning note: network restrictions block the standard Playwright CDN. Tests were run with npm-distributed @sparticuz/chromium and its bundled AL2023 NSS/NSPR libraries extracted to a temporary directory, using LD_LIBRARY_PATH. No binary artifacts are committed.

Not yet verified: Safari/Firefox, physical Android/iOS, pinch gestures on a real touchscreen, large-image memory/performance on constrained phones, actual Cloudflare deployment or automatic Git-triggered builds. The foundation is not the full initial usable release described in the specification: that requires the next ZIP and editable-data milestones. There are no archive round-trip claims yet.

## Portability release v0.2.0 — 17 October 2026

- Production build passes (approximately 346 kB JS / 126 kB gzip, including local ZIP library; no external runtime CDN).
- Unit suite: **22 tests pass**. Includes metadata validation, format-version rejection, source/asset byte preservation, stable IDs and opaque entity/history round trips, unknown fields, duplicate paths, traversal, checksum corruption, JSON limits, invalid view/layers, reserved export paths, missing files, encrypted archives, entry count and raster signature checks.
- `tests/portability.mjs` passes against production preview: import → name/notes edit → save ZIP → open in a fresh browser context → save again. Asserts artwork bytes, country/territory references, retained flag data, unknown metadata, notes, hidden artwork and view. Also verifies malformed ZIP leaves the current project intact, a replacement requests a valid backup archive, and mobile project details can be edited without horizontal overflow.
- Foundation browser regression suite passes against the updated production build.
- No automatic entity rendering or reference-schema validation is claimed; tests assert opaque values survive, not that territory tools exist.
- v1 is the first format. No older schema exists to migrate; unsupported versions are rejected intact. Migration tests will be required when introducing v2.
- Download success means the browser accepted the download request; user-retained storage cannot be guaranteed by JavaScript. Check downloads and keep source archives.
- Physical-device touch/large-image stress tests and actual Cloudflare Git builds remain unverified.

## Mapping release v0.3.0 — 17 October 2026

- **31 unit tests pass** across image validation, project archives, and the new entity model. Tests cover simple-polygon validation, self-intersection/self-touching/degenerate geometry rejection, missing/duplicate country references, malformed dossier fields, retained unknown properties, flag persistence, rename stability, ownership events, and preservation of legacy root collections.
- Production build passes: approximately 367 kB JS / 132 kB gzip; no new runtime dependency for tracing. Native Leaflet polygons/markers provide the editing interface.
- `tests/mapping.mjs` passes against production preview: create country + flag + custom fields; trace territory; select via map; view/rename country without changing owner references; block deleting referenced country; drag/insert/remove boundary vertices; undo/redo; ownership transfer event; independent layer visibility; export/reopen in a fresh context; mobile touch access/tracing cancellation; confirmed territory deletion and undo; unsaved-record close confirmation.
- Desktop map and mobile record screenshots captured; desktop rendering inspected. This caught and fixed a global icon CSS rule that incorrectly resized Leaflet's SVG viewport.
- Existing image/navigation and ZIP-portability browser suites continue to pass against production preview.
- Flag image contents are signature-checked on ZIP import/export; browser opening also decodes flags and enforces the 4-megapixel guard before replacing the loaded project.
- Simulated mobile Chromium is not a substitute for physical iOS/Android testing. Safari/Firefox, physical pinch/drag ergonomics, large datasets, and Cloudflare deployment remain unverified.
- No split/merge, multipolygon holes, nested subdivisions, military editor, infrastructure editor, full historical timeline, recovery database or APK is claimed.
