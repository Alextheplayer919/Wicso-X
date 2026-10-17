# WicsoX

A free, local-first workspace for maps you create elsewhere. **Interface and hosting release v0.4.0** — not a map generator or simulator.

## Run

Node 22.12+ and npm:

```sh
npm ci
npm run dev
```

Open the displayed URL. Choose **Import** or drop one PNG/JPEG/WebP file. Drag to pan, scroll or pinch to zoom, press **F** to fit or **1** for 1:1 scale. Original artwork is locked, preserved byte-for-byte, and downloadable from the details card. Use the project name in the top bar to rename your world and add notes. **Save** downloads a portable archive; **Open** restores a ZIP. Replacing a loaded project requires confirmation and requests a backup ZIP first; invalid imports leave the previous project intact.

**Browser sessions are in memory only. Download a ZIP to keep your work and check your downloads.** There is no autosave, split/merge, PSD import or Android APK yet. Territory tracing, vertex editing, country dossiers and flags are available. War and infrastructure controls are roadmap placeholders. Maps are not uploaded. No accounts, backend, remote tiles, paid API or AI.

## Interface

The shell is deliberately small:

- **Top bar** — WicsoX, the project name (click to edit name and notes), and **Import / Open / Save**, plus a theme switch and **Quick guide**.
- **Left rail** — import, fit, artwork visibility, and **Countries & regions**.
- **Canvas** — the map itself. A details card sits top-right with dimensions, file size and format; zoom controls sit bottom-right; territory tools appear bottom-left while tracing.
- **Footer** — status, current file, keyboard hints and the roadmap.

Dark and light themes share one set of CSS custom properties on `:root`; the theme switch is stored in `localStorage` and defaults to the operating-system preference.

## Territories and countries

Use **Trace territory** to place three or more vertices on the artwork and **Finish trace** to assign a country. Click a territory to edit its record or boundary. **Countries & regions** opens dossiers and country creation. Undo/redo restores the last 50 mapping edits. **Save** includes all supported mapping records and flag images. See [mapping tools and limits](docs/MAPPING.md).

## Validate

```sh
npm test
npm run build
npm run preview
```

`node tests/browser.mjs`, `node tests/portability.mjs` and `node tests/mapping.mjs` run integration tests against the running site; set `TEST_URL` to the dev or preview URL you want to check. They use Playwright plus a bundled headless Chromium (test-only dependency). On Linux, Chromium needs system libraries including NSS/NSPR. Screenshots go to ignored `test-results/`.

## Documentation

Start with the [progress report and prioritized remaining work](docs/PROGRESS.md) for the current implementation status, testing evidence, limitations, and deployment/mobile handoff.

- [Research, architecture, proposed ZIP format and milestones](docs/ARCHITECTURE.md)
- [Netlify Git integration, custom domains and plan limits](docs/DEPLOYMENT.md)
- [Implemented ZIP format and safety limits](docs/PROJECT_FORMAT.md)
- [Test results and remaining limitations](docs/TESTING.md)

Static Vite/TypeScript + Leaflet CRS.Simple; no geographic assumptions. Initial import guards: 100 MiB compressed size, 64 megapixels, 16,384 pixels per edge. Very large images may still exceed device memory during decoding. Source artwork is never resized or recompressed.

Netlify is the intended host: build `npm ci && npm run build`, publish `dist`, production branch `main`, configuration in `netlify.toml`. The actual account connection and deployment have not been performed. Future Android packaging will reuse this web build and portable project format.
