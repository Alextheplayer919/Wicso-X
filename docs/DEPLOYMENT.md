# Cloudflare Pages deployment

WicsoX is a static Vite + TypeScript application. Cloudflare Pages builds the site from GitHub and publishes Vite's `dist/` directory. No Workers runtime, database, server-side functions or secrets are required for the current app.

## Build settings

In the Cloudflare dashboard:

1. Open **Workers & Pages → Create application → Pages → Connect to Git**.
2. Select `Alextheplayer919/Wicso-X`.
3. Use `main` as the production branch once the rewrite is reviewed and merged. Until then, use feature-branch preview deployments.
4. Configure:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repository root) |
| Node.js version | `22.12.0` |

Set `NODE_VERSION=22.12.0` in the Pages project's environment variables for production and preview builds. The repository's `.node-version` file records the same version. The project uses npm and commits its lockfile; if the build environment does not install dependencies automatically, use `npm ci && npm run build`.

## Preview and production deployments

- Production branch: `main` after the rewrite is ready.
- Use Pages preview deployments for feature branches and pull requests.
- Do not merge `rewrite/hybrid-editor` until TypeScript build, unit tests, browser tests and a real-device check pass.
- A GitHub commit is not proof of a successful Pages deployment. Verify the deployment status and open its URL.

## Headers

The repository's `public/_headers` file is copied by Vite into `dist/_headers`. Cloudflare Pages applies these static response headers. Keep this file conservative; do not add a restrictive Content-Security-Policy until Leaflet assets, icons, inline styles and future external resources have been audited.

## Custom domain

After the first successful deployment, open the Pages project, go to **Custom domains**, choose **Set up a custom domain**, and follow the DNS instructions. HTTPS is provisioned through Cloudflare after domain activation. A custom domain is optional; the generated `*.pages.dev` address works without buying one.

## Pre-release checklist

- [ ] Cloudflare Pages is connected to the intended GitHub repository.
- [ ] Production branch is set to `main` only after the rewrite is ready.
- [ ] Node.js is `22.12.0`.
- [ ] Build command is `npm run build` and output directory is `dist`.
- [ ] Build completes and Pages marks the deployment successful.
- [ ] Import PNG, JPG/JPEG and WebP on desktop and a real Android device.
- [ ] Test pan, zoom, save/open ZIP, and territory editing.
- [ ] Check browser console and static asset loading.
- [ ] Confirm preview deployments do not replace production.

**Current status:** Cloudflare Pages is the chosen deployment target. The Cloudflare account has not been connected and no live Pages deployment has been performed.
