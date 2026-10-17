# Architecture and research — 17 October 2026

## Proposed architecture (before implementation)
Static Vite + strict TypeScript, vanilla DOM and Leaflet 1.9 CRS.Simple. No backend, accounts, analytics, remote tiles or AI. BSD-2-Clause Leaflet provides touch pan/zoom and image overlays, with pixel-space bounds rather than geographic assumptions. React is unnecessary for the foundation. Canvas libraries such as Konva offer fine-grained drawing, but Leaflet already supplies navigation and a vector ecosystem. Future geometry work will evaluate MIT Leaflet-Geoman Free; do not assume its paid split/union features are available. Geometry is separate from source artwork.

Browser File input and drag/drop provide imports; object URLs avoid base64 duplication. Decode before replacing the old image, revoke stale URLs, retain the original File bytes. PNG/JPEG/WebP are the initial import candidates, to be verified in browser tests. SVG is not an accepted user format. PSD is deferred: ag-psd has unsupported features and memory/alpha concerns. No reliable automatic territory detection is promised.

Large image strategy: no full-size canvas or re-encoding. Asynchronous HTMLImageElement.decode with Blob URL, original pixel dimensions, CSS/GPU navigation. Decoded RGBA requires approximately width × height × 4 bytes; a compressed small file can still consume substantial memory. Warn before large files, reject >100 MiB files, reject >64 megapixel decoded images and >16,384-pixel edges. These are conservative app guards, not universal browser guarantees; decoding itself can exceed mobile memory. Future worker header probing and tiled display should precede very-large-map support. No performance claim for arbitrary images.

## Portable format v1 (Milestone 2 now implemented; see PROJECT_FORMAT.md)
ZIP: manifest.json (format="wicso-project", version=1, project UUID, timestamps, artwork path/type/dimensions/hash), world.json, history.json, artwork/original.ext, assets/{uuid}.ext. world contains stable UUID entities: countries, territories, military objects, network nodes/edges, labels, layer settings. Geometry uses image-pixel x/y, top-left origin; convert y for Leaflet. Foreign keys use IDs, never names. Country custom fields retain user-defined JSON data.

Choose BSD-3-Clause zip.js for worker/stream support and Zip64 rather than synchronous whole-buffer ZIP processing. Load it only when portability ships. Retain unknown fields and entries on compatible versions; reject newer incompatible versions without opening or altering workspace. Sequential version migrations operate on a copy. Validate schema, references, duplicates, counts, archive sizes and decompressed limits before committing an import. Reject absolute paths, backslashes, '..' components, duplicate names, encrypted archives and suspicious compression ratios. Do not extract onto a filesystem. Preserve original archive backup before migrations/destructive changes; never silently omit unsupported data. Snapshot history is independent of restored current state. Test byte-for-byte artwork, assets, IDs, geometry and history round trips. Browser recovery via IndexedDB is optional, never the authoritative save.

## Roadmap and gates
1. Foundation: import/display/aspect ratio, fit/1:1, navigation, touch, errors, source preservation. Build and browser tests before continuing.
2. Portable ZIP: implement schema, validation, migrations, assets, round-trip tests before adding entity tools.
3. Territories/dossiers: trace/edit, UUID relations, flags; test ownership changes.
4. War mapping: independent dated vector objects, no simulation.
5. Infrastructure: connected node/edge networks, not decorative lines.
6. History/reliability: snapshots, restore backups, compare, undo/redo, recovery.
7. Deployment/mobile: verify Pages Git builds/previews, device performance, Android packaging.

Milestones 1 and 2 are implemented; territory tracing and dossier editing are now available (see MAPPING.md). See PROJECT_FORMAT.md for the actual implemented contract and limits; future entity schemas remain proposals. Split/merge, full history, browser autosave, APK and actual Cloudflare deployment remain unimplemented. Territory vectors use a small native Leaflet editing controller rather than introducing Geoman or paid geometry tools. zip.js is bundled locally; reads use bounded streams with workers disabled for predictable packaging. Future optimization can move large processing into workers.

## Official research sources
- https://developers.cloudflare.com/pages/configuration/git-integration/ — GitHub/GitLab automatic deployment on push.
- https://developers.cloudflare.com/pages/configuration/build-configuration/ — build command/output directory.
- https://developers.cloudflare.com/pages/platform/limits/ — free: 500 builds/month, one concurrent build, 20 minute timeout, 20,000 files, 25 MiB asset limit. User maps are local, not deployed assets.
- https://docs.github.com/en/get-started/using-git/about-git — commits/branches track revisions; main is intended production, feature branches isolated.
- https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository — version tags, release notes and binary assets for future signed APKs.
- https://developer.mozilla.org/en-US/docs/Web/API/File — picker/drop File is a Blob; object URLs and createImageBitmap.
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas — platform-dependent dimension limits.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL — avoid memory-heavy base64 for large images.
- https://leafletjs.com/examples/crs-simple/crs-simple.html and https://leafletjs.com/reference.html — fictional image maps, image overlays and coordinate ordering.
- https://github.com/geoman-io/leaflet-geoman — editing tools; evaluate free vs Pro per feature.
- https://gildas-lormeau.github.io/zip.js/api/index.html — streams, workers, Zip64, BSD-3-Clause.
- https://github.com/Agamnentzar/ag-psd — layered format limitations; not currently supported.
- https://capacitorjs.com/docs/apis/filesystem — Android scoped-storage limits, app-private vs shared storage.

## Future Android packaging
Reuse dist with Capacitor webDir=dist; isolate import/export behind a file-service adapter. System picker/Storage Access Framework required for user-owned archives; do not assume broad filesystem permissions work on Android 11+. Test WebView blob downloads or replace with native save/share adapter. App-private recovery is not portable storage. Android Studio/JDK/SDK and a privately stored release keystore are needed for signed APK builds; never commit signing keys. Distribute signed versioned APKs and release notes via GitHub Releases after device tests. No native shell is shipped yet.
