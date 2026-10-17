# Netlify deployment

Local prerequisites: Node 22.12 or newer, npm. `npm ci`, `npm test`, `npm run build`. Output is `dist`.

## Repository configuration (already committed)

`netlify.toml` in the repository root pins the build so a fork rebuilds identically:

```toml
[build]
  command = "npm ci && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

Netlify reads this file automatically; settings here override the same fields in the Netlify UI. `npm ci` (rather than `npm install`) installs exactly what `package-lock.json` records. Response headers are declared in the same file, so there is no separate `_headers` file to keep in sync.

## Connect the repository

1. In the Netlify dashboard choose **Add new project → Import an existing project**, then pick GitHub and authorize Netlify for `Alextheplayer919/Wicso-X` [1](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).
2. Netlify auto-detects Vite and pre-fills the build command and publish directory; `netlify.toml` already supplies them. Confirm **Build command** `npm ci && npm run build` and **Publish directory** `dist`. Base directory stays empty (repository root) [2](https://docs.netlify.com/build/configure-builds/overview/).
3. Production branch: `main`. Enable Deploy Previews for branches and pull requests — they are free on every credit-based plan [3](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).
4. Save and deploy. Check the deploy log, open the deployment, import a PNG/JPEG, test fit and 1:1, then refresh and confirm no broken assets.
5. Push a reviewed change to `main` and verify a new production deploy with the new commit SHA. Push a branch change and verify its separate Deploy Preview URL.

## Custom domains

Netlify assigns a default `<site>.netlify.app` address at first deploy; it is not the only option. To use your own name:

1. Open the project, then **Domain management → Add a domain**.
2. Choose **Add a domain you already own**, or **Buy a new domain** to register one through Netlify [1](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).
3. Point DNS at Netlify, either with **Netlify DNS** (recommended: automatic wildcard SSL renewal, automatic deploy subdomains, and no apex-domain performance penalty) or, if you keep an external DNS provider, a CNAME for `www` and an A/ALIAS record for the apex domain. With external DNS, Netlify recommends making `www` the primary domain [4](https://docs.netlify.com/manage/domains/get-started-with-domains/).
4. Netlify provisions the HTTPS certificate automatically; allow time for DNS propagation.

Custom domains with SSL are included on the Free plan. No paid add-on is required to stop using the `netlify.app` address.

## Plan limits to be aware of

Credit-based Free accounts include **300 credits/month with a hard limit** — once the balance is exhausted, Netlify serves a "Site not available" page until the next cycle; there is no automatic top-up on Free [3](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/). Draw-down rates:

| Usage | Credits |
| --- | --- |
| Production deploy | 15 each |
| Bandwidth | 20 per GB |
| Web requests | 2 per 10,000 |
| Compute (functions, Preview servers, Agent Runners) | 10 per GB-hour |
| Deploy Previews and branch deploys | 0 |

Build minutes are no longer metered separately; they are covered by the 15-credit production deploy. Failed deploys and rolling back to a previous production deploy cost nothing. A static site like WicsoX spends almost all of its budget on production deploys and bandwidth: roughly 20 production deploys, or about 15 GB of traffic, per month before the hard limit.

## Verify before calling it deployed

- [ ] Deploy log shows `npm ci && npm run build` on Node 22 and a successful `dist` publish.
- [ ] Opening the production URL loads the app with no console errors.
- [ ] Importing a PNG/JPEG/WebP works and the original can be downloaded unchanged.
- [ ] A custom domain resolves and shows a valid certificate (if configured).
- [ ] A push to `main` produces a new production deploy with the expected commit SHA.
- [ ] A branch push produces a separate Deploy Preview URL.

**Status:** the production build is tested locally (`npm run build`, `npm run preview`) and the configuration above is committed. Netlify account authorization and the actual Git integration have NOT been performed by this implementation. A local preview is not a Netlify deployment. GitHub source archives are not user project archives.
