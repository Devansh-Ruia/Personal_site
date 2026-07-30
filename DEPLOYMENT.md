# Deployment

The site is static and is intended for Cloudflare Pages. No Wrangler project
configuration is included because the Cloudflare account and project name have
not been verified.

## Local production build

Use Node 22.20.0, then install and build from a clean checkout:

```sh
npm ci
npm run build
```

Cloudflare serves the generated `dist` directory.

## Site URL

Set `SITE_URL` to the verified production origin in the Cloudflare build
environment only after that origin is owned and configured. It must be a full
HTTP or HTTPS origin without a path, query, hash, or credentials.

When `SITE_URL` is present, Astro emits canonical and absolute social metadata,
and the sitemap integration emits a sitemap. When it is absent, the build omits
those absolute URLs and the sitemap.

## Cloudflare Pages dashboard

1. In Cloudflare, open **Workers & Pages**, choose **Create application**, then
   choose the **Pages** tab and import this Git repository.
2. Select `main` as the production branch.
3. Set the build command to `npm run build`.
4. Set the build output directory to `dist`.
5. Choose and verify the project name, which determines the initial
   `*.pages.dev` address.
6. Add `SITE_URL` as a production environment variable after the production
   origin is known.
7. Trigger a build, verify the Pages address, then configure and verify any
   custom domain in the dashboard.

Do not deploy until the Cloudflare account, project name, and production origin
have been confirmed.
