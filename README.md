# WICSO Mapper

A free, local-first workspace for maps you create elsewhere. **Mapping release v0.3.0** — not a map generator or simulator.

## Run

Node 22+ and npm:

```sh
npm ci
npm run dev
```

Open the displayed URL. Choose **Import map** or drop one PNG/JPEG/WebP. Drag to pan, scroll/pinch to zoom, press **F** to fit or **1** for 1:1 scale. Original artwork is locked, preserved byte-for-byte, and downloadable from Map Details. Use **Project details** to name your world and add notes. **Save ZIP** downloads a portable archive; **Open ZIP** restores it in a fresh session. Replacing a loaded project requires confirmation and requests a backup ZIP first; invalid imports leave the previous project intact.

**Browser sessions are in memory only. Download a ZIP to keep your work and check your downloads.** There is no autosave, split/merge, PSD import or Android APK yet. Territory tracing, vertex editing, country dossiers and flags are available. War/infrastructure controls explain the future roadmap. Maps are not uploaded. No accounts, backend, remote tiles, paid API or AI.

## Territories and countries

Use **Trace territory** to place three or more vertices on the artwork and **Finish trace** to assign a country. Click a territory to edit its record or boundary. **Countries & regions** opens dossiers and country creation on desktop/mobile. Undo/redo restores the last 50 mapping edits. **Save ZIP** includes all supported mapping records and flag images. See [mapping tools and limits](docs/MAPPING.md).

## Validate

```sh
npm test
npm run build
npm run preview
```

`node tests/browser.mjs`, `node tests/portability.mjs`, and `node tests/mapping.mjs` run integration tests against the running site; set `TEST_URL` for the desired dev/production preview URL. It uses Playwright plus a bundled headless Chromium (test-only dependency). Linux needs Chromium system libraries, including NSS/NSPR. Standard Playwright browser installation may be used instead by changing the launch options. Screenshots go to ignored `test-results/`.

## Documentation

Start with the [progress report and prioritized remaining work](docs/PROGRESS.md) for the current implementation status, testing evidence, limitations, and deployment/mobile handoff.

- [Research, architecture, proposed ZIP format and milestones](docs/ARCHITECTURE.md)
- [Exact Cloudflare Pages Git integration settings](docs/DEPLOYMENT.md)
- [Implemented ZIP format and safety limits](docs/PROJECT_FORMAT.md)
- [Test results and remaining limitations](docs/TESTING.md)

Static Vite/TypeScript + Leaflet CRS.Simple; no geographic assumptions. Initial import guards: 100 MiB compressed size, 64 megapixels, 16,384 pixels per edge. Very large images may still exceed device memory during decoding. Source artwork is never resized or recompressed.

Cloudflare Pages is the intended host: `npm run build`, output `dist`, production branch `main`. Actual account connection/deployment has not been performed. Future Android packaging will reuse this web build and portable project format.
