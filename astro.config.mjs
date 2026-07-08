import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static output is the default. Deployed to Cloudflare Pages:
//   build command: npm run build   output dir: dist   (no adapter needed)
export default defineConfig({
  // TODO: set to your real domain so canonical URLs and any feeds are correct.
  site: 'https://TODO-your-domain.example',
  integrations: [mdx()],
});
