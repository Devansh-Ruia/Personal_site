import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const configuredSite = process.env.SITE_URL?.trim();
let site;

if (configuredSite) {
  const parsedSite = new URL(configuredSite);
  const hasUnsupportedParts =
    parsedSite.username ||
    parsedSite.password ||
    parsedSite.pathname !== '/' ||
    parsedSite.search ||
    parsedSite.hash;

  if (!['http:', 'https:'].includes(parsedSite.protocol) || hasUnsupportedParts) {
    throw new Error(
      'SITE_URL must be an http(s) origin without credentials, a path, a query, or a hash.',
    );
  }

  site = parsedSite.href;
}

// Static output is the default. Deployed to Cloudflare Pages:
//   build command: npm run build   output dir: dist   (no adapter needed)
export default defineConfig({
  site,
  integrations: [mdx(), ...(site ? [sitemap()] : [])],
});
