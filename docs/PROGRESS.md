# Project progress and remaining work

Updated: **17 October 2026**. Current package: **v0.3.0**.

This document is the implementation handoff for the first pull request. The application is a working, local-first image mapping editor, **not the complete WICSO specification**. Package version numbers label development increments; they do not imply a published GitHub Release or a deployed website.

## Executive summary

The repository began with only a README. It now contains a static Vite + TypeScript application using Leaflet for non-geographical image maps and zip.js for portable projects. No account, backend, remote map service, database, paid API or AI is required.

The supported end-to-end workflow is:

1. Import a PNG/JPEG/WebP made in an external drawing application.
2. Pan/zoom without changing its source artwork.
3. Create country dossiers and import flag images.
4. Trace and edit simple polygon territories and assign countries/occupation.
5. Download a complete project ZIP.
6. Open that ZIP in a fresh browser session and restore supported records, artwork and assets.

This workflow has passed automated headless Chromium tests. It still requires cross-browser, physical-device, performance and hosted-deployment verification before being called a fully validated public release.

## Milestone status

| Milestone | Status | Implemented / outstanding |
| --- | --- | --- |
| 1. Foundation | Implemented; browser coverage incomplete | Raster import, locked original, aspect ratio, pan/zoom, fit, 1:1, keyboard navigation and responsive layout. Physical touch testing, other browser engines and large-map stress tests remain. |
| 2. Portability | Implemented for format v1 | ZIP save/open, original bytes, metadata, notes, view/layers, assets, unknown-data retention, validation and pre-replacement backup downloads. No older schema exists to migrate; future format changes need explicit migrations and fixtures. No autosave/recovery storage yet. |
| 3. Territories and dossiers | Core subset implemented; not the full milestone | Simple-polygon tracing, selection, vertex correction/insertion/removal, rename/delete, ownership/occupation, country colors, dossier fields, flags and stable references. Split/merge, holes/multipolygons and nested subdivisions remain. |
| 4. War mapping | Not implemented | Navigation is a roadmap placeholder, not an editor. |
| 5. Infrastructure | Not implemented | Navigation is a roadmap placeholder, not an editor. |
| 6. History and reliability | Partial | Session mapping undo/redo, ownership-transfer records, replacement backup requests and archive checks exist. Full snapshots, comparison/restore, recovery, migration coverage and broader testing remain. |
| 7. Deployment and mobile | Documented/planned; not deployed | Static production build works and simulated mobile Chromium is covered. No actual Cloudflare account connection, verified Git deployment, native Android project, signed APK or GitHub Release has been created. |

## Implemented features

### Image workspace

- PNG, JPEG and WebP selection/drop with extension/signature checks and asynchronous browser decoding.
- Original File/Blob retained separately from vectors; no source resizing or recompression.
- Fictional/image-pixel coordinates, with no real-world country/border assumptions.
- Pan, zoom, fit and original scale; image-layer visibility and original-file download.
- File/dimension guards and understandable errors; failed imports preserve the loaded project.

### Portable projects

- Outer ZIP format v1 with `manifest.json`, `world.json`, `history.json`, original artwork and extra assets.
- Project UUID, timestamps, name, notes, map view and visibility restoration.
- ZIP structural/CRC checks, artwork SHA-256, JSON/version validation, unsafe/duplicate path rejection, encryption rejection and size/count/compression-ratio bounds.
- Actual decompressed output limits, not only central-directory size checks.
- Compatible unknown fields and non-required asset files retained; unknown entities are not silently reinterpreted.
- Replacement confirmation followed by a backup ZIP download request before changing the workspace.
- Save status and close warnings. Downloads remain user-controlled; the app cannot guarantee that a browser actually retained a file.

### Territory editor

- Simple closed polygons with 3–500 vertices, constrained to image bounds.
- Click/tap tracing, map/list selection, vertex dragging, midpoint insertion and vertex removal.
- Rename/delete, country ownership, optional occupying country, controlled/contested/occupied state and notes.
- Country political colors, unassigned-region colors, selection outlines and independent territory visibility.
- Validation for zero-area, repeated vertices, self-intersections and nonadjacent self-touching.
- Dated ownership changes, deletion confirmation and reference-safe country deletion.
- Up to 50 in-memory mapping undo/redo revisions. Undo covers mapping records/assets, not arbitrary project settings or an immutable historical timeline.

### Country dossiers

- Stable IDs independent of names/colors/flags.
- Government, leadership, capital, population, economy, armed forces, alliances/diplomacy, conflicts, claims and history/notes.
- Custom fields as a JSON object of text values.
- Raster flag import, preview and ZIP persistence; flag limits and content checks.
- Accessible desktop/mobile entry point through the map toolbar and record dialogs.

## What still needs to be added

### Priority 1 — stabilize and deploy the existing slice

- Review this PR and exercise the acceptance workflow manually using real WICSO artwork/projects.
- Add CI so unit/build/browser checks run automatically on pull requests and pushes. Tests currently run locally; no CI workflow is configured.
- Make browser-test provisioning portable for contributors/CI. Current scripts use npm-distributed Chromium and require system NSS/NSPR libraries; this sandbox needed a temporary library extraction (see TESTING.md).
- Test Firefox and Safari, physical Android/iOS, keyboard-only editing and screen-reader behavior. Existing mobile coverage is simulated Chromium, not a physical-device certification.
- Stress-test real large maps/archives, many entities, complex polygons and constrained mobile memory. Consider image-header probing before decode, worker processing and tiled display if measurements justify them.
- Connect the repository to Cloudflare Pages using the documented Git integration. Verify branch preview, production build, correct deployed commit and automatic deployment after a reviewed main-branch change. A local preview is not a Cloudflare deployment.
- Review download/backup behavior where browsers restrict multiple automatic downloads; users must still check downloads and retain source archives.

### Priority 2 — finish territory/profile editing

- Split and merge regions with explicit rules for IDs, ownership, shared boundaries and historical records.
- Polygon holes/multipolygons, nested administrative subdivisions and better topology/snapping tools.
- Decide how overlapping territories should be represented; currently individual polygon validity does not enforce a nonoverlapping world topology.
- Improve country-record browsing/search, flag workflows and context panels as actual community usage grows.
- Add safe, explicit conversion/import tooling if legacy opaque root entity collections need to become editor records. They are currently retained unchanged, not automatically converted.

### Priority 3 — war mapping

- Independent editable front lines, battle/formation markers, contested/occupation zones, advances/retreats, defensive positions, encirclements, ceasefire lines and demilitarized zones.
- Dated operational annotations, faction styles, visibility and record associations.
- User-entered developments only: no simulated battles or generated outcomes.
- Stable IDs, schema/reference checks and ZIP tests for every new object type before expanding further.

### Priority 4 — connected infrastructure

- A node/edge network model for railways and roads, with editable connections and segments.
- Bridges, tunnels, ports, airports and user-defined categories.
- Ownership, operational status, styles, labels and descriptions.
- Independent selection/layers and round-trip tests for network connectivity.

### Priority 5 — historical timeline and recovery

- Dated snapshots/events, date navigation, compare views and political/military historical states.
- Snapshot restoration without erasing the historical record, with backup/confirmation semantics.
- Optional author attribution; no mandatory accounts.
- Optional IndexedDB recovery/autosave with clear temporary-storage warnings. The downloadable ZIP remains authoritative.
- Testable schema migrations when a genuinely new format/schema is introduced; reject unsupported versions safely until then.
- Broaden failure/fuzz/performance tests and review memory bounds and long-session undo behavior.

### Priority 6 — Android distribution

- Add a Capacitor shell sharing this web build and ZIP format, not a separate application.
- Implement/test native file picking and saving/sharing under Android scoped storage.
- Test WebView rendering, touch editing, recovery and large-image memory use on actual hardware.
- Configure Android tooling, app identity, release signing and protected key handling.
- Publish versioned signed APKs with release notes through GitHub Releases. Never commit signing keys or credentials.

### Optional / investigation only

- PSD/layered-format import requires tested parser coverage and clear limitations; it is not supported today.
- Automatic boundary detection is not implemented and must not replace reliable manual tracing.
- A flag designer is optional and lower priority than the core roadmap.

## Acceptance and validation evidence

Current automated results are recorded in [TESTING.md](TESTING.md). At this handoff:

- `npm test`: **31 unit tests**.
- `npm run build`: strict TypeScript and optimized static production build.
- `npm run test:browser`: image/navigation and invalid-file regression suite.
- `npm run test:portability`: save/open in a fresh context, original-byte and extension-data preservation, backup requests and mobile project details.
- `npm run test:mapping`: tracing, map selection, country/flag/custom-field editing, rename/reference stability, vertex correction/insertion/removal, undo/redo, ownership history, visibility, fresh-session ZIP restoration and mobile interactions.
- Dependency audit reported zero known vulnerabilities when last run; this is not a security certification.

Browser suites require a running site and a suitable Chromium environment. There are no automatic GitHub checks yet. Do not equate local success with verified Cloudflare deployment, full cross-browser support or completion of the entire specification.

## Architecture and compatibility handoff

- Node **22.12+**, npm, Vite, strict TypeScript, Leaflet CRS.Simple, zip.js, locally bundled Lucide icons.
- `npm run build` → `dist`. Production branch intended for Cloudflare: `main`.
- Additive supported editor schema: `world.mapping.version = 1`; geometry uses top-left image-pixel coordinates. Legacy root collections remain opaque. See [MAPPING.md](MAPPING.md) and [PROJECT_FORMAT.md](PROJECT_FORMAT.md).
- Keep artwork immutable and preserve unknown compatible data. No mandatory backend/account/cloud storage should be introduced without a justified requirement.
- Preserve stable IDs across renaming. New object types need documented schemas, validation and fresh-session ZIP tests.

## Related documents

- [Architecture and official research](ARCHITECTURE.md)
- [ZIP contract and archive limits](PROJECT_FORMAT.md)
- [Mapping workflow, schema and current limits](MAPPING.md)
- [Validation history and unverified areas](TESTING.md)
- [Cloudflare setup and deployment verification](DEPLOYMENT.md)
