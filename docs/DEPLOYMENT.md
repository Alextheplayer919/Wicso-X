# Cloudflare Pages deployment

Local prerequisites: Node 22.12 or newer, npm. `npm ci`, `npm test`, `npm run build`. Output is `dist`.

1. In Cloudflare Workers & Pages create a **Pages** project using Git integration (not a Direct Upload project). Authorize the Cloudflare GitHub app for Alextheplayer919/Wicso-X.
2. Production branch: `main`. Repository root: `/` (leave root directory blank). Framework: Vite (or None with explicit settings). Build command: `npm run build`. Output directory: `dist`. Set NODE_VERSION to `22` if the build image does not already use Node 22.
3. Enable automatic production deployments and preview builds for non-production branches. Current implementation branch is arena/f397b119-wicso-x; changes must be reviewed before merging into main.
4. Save and deploy. Verify logs, open deployment, import PNG/JPEG, test fit/1:1, refresh and confirm no broken assets. Push a reviewed change to main and verify a new production commit SHA. Push a branch change and verify its separate preview URL.

No Pages Functions, database, Wrangler configuration, API secrets or persistent server files are required. public/_headers supplies conservative response headers. Free plan has 500 builds/month, one concurrent build, 20-minute build timeout, 20,000 site files and 25 MiB maximum individual hosted asset. Local imported maps are not uploaded and not governed by the hosted asset cap.

**Status:** production build can be tested locally. Cloudflare account authorization and actual Git integration have NOT been performed by this implementation. Do not consider deployment complete until the above checks pass. GitHub source archives are not user project archives.
