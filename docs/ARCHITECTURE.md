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

Milestones 1 and 2 are implemented; territory tracing and dossier editing are now available (see MAPPING.md). See PROJECT_FORMAT.md for the actual implemented contract and limits; future entity schemas remain proposals. Split/merge, full history, browser autosave, APK and actual Netlify deployment remain unimplemented.

## Interface shell (v0.4.0)

The interface is hand-written markup in `src/main.ts` plus one stylesheet, `src/style.css`; no CSS framework, no component library and no runtime theme package. Lucide icons are bundled locally and rendered inline, as before.

Theme tokens are CSS custom properties on `:root`, overridden by `:root[data-theme="light"]`; `color-scheme` is set per theme so native controls and scrollbars match. Only `data-theme` on `<html>` changes between themes, so every component rule is written once against tokens. A short inline script in `index.html` applies the stored preference before first paint to avoid a flash; `localStorage` is the preference store and `prefers-color-scheme` is the fallback. Theme state is cosmetic only and is never written into a project ZIP.

The layout is a single flex column (`#app` → top bar, shell, footer) with the shell splitting into a rail and the canvas. Floating canvas furniture (details card, zoom controls, territory editing bar) is absolutely positioned inside `.canvas-area`; the audit in TESTING.md checks that they do not overlap at desktop, laptop and phone widths. The rebuild deliberately preserved every element id, status string and accessible name so the existing Playwright suites needed no changes. Territory vectors use a small native Leaflet editing controller rather than introducing Geoman or paid geometry tools. zip.js is bundled locally; reads use bounded streams with workers disabled for predictable packaging. Future optimization can move large processing into workers.

## Official research sources
- https://docs.netlify.com/start/quickstarts/deploy-from-repository/ — import an existing GitHub/GitLab/Bitbucket repository, continuous deployment on push, and where to add a custom domain.
- https://docs.netlify.com/build/configure-builds/overview/ — build command, publish directory, base directory, deploy-log visibility.
- https://docs.netlify.com/build/configure-builds/file-based-configuration/ — `netlify.toml`; file settings override the same fields in the Netlify UI, so a fork rebuilds identically.
- https://docs.netlify.com/manage/domains/get-started-with-domains/ — register a domain with Netlify or bring your own, then choose Netlify DNS or external DNS (Netlify recommends `www` as primary with external DNS).
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ — Free plan: 300 credits/month with a hard limit; 15 credits per production deploy, 20 per GB bandwidth, 2 per 10,000 requests, 10 per GB-hour compute; Deploy Previews and branch deploys are free; build minutes are not metered separately.
- https://docs.netlify.com/build/configure-builds/manage-dependencies/ — Node.js version selection via `NODE_VERSION`, `.nvmrc` or `.node-version`; npm/pnpm/yarn detection.
- https://docs.netlify.com/manage/routing/headers/ — custom response headers via `_headers` or `netlify.toml` `[[headers]]`. User maps are local files in the browser, not deployed assets, so they are not governed by any hosting asset cap.
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


## Hosting decision update

The earlier Netlify deployment research below is historical and superseded. The current hosting target is **Cloudflare Pages**. See [DEPLOYMENT.md](DEPLOYMENT.md) for the authoritative build settings, Git integration, preview workflow and headers configuration. The Netlify configuration file has been removed from the active rewrite branch.
