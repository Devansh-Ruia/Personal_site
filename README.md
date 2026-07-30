# Personal site

Devansh Ruia's static Astro portfolio. It contains MDX project writeups and a
static function-vectors method note. The precomputed case viewer remains held
until its stored results have reproducible provenance.

## Develop

```sh
npm install
npm run dev        # local dev server
npm run check      # types + Astro diagnostics
npm run lint       # eslint
npm test           # production build + output and hook tests
npm run build      # static build to dist/
npm run format     # prettier --write .
npm run format:check
```

Node 22.20.0 is pinned in `.node-version`.

## Repository workflow

- `AGENTS.md` is the source of project rules, including the required
  Maker-Checker workflow.
- `.agents/skills` contains the project skills for project posts, function-vector
  cases, precomputation, and site checks.
- `.codex/hooks.json` and `.codex/hooks/format.mjs` define and implement the
  repository formatting hook. Hook tests live under `.codex/hooks/tests`.

## Content integrity

Project writeups live in `src/content/projects` and are validated by
`src/content.config.ts`. Drafts are excluded from the project index and generated
routes. Do not invent dates, links, benchmark results, or project claims.

Function-vector cases live in `src/data/fv-cases.json`. They are precomputed,
never live inference. A case should not be published until its model,
intervention location, head source, scoring rule, split or seed, and run artifact
are recorded together.

## Deployment

Cloudflare Pages builds with `npm run build` and serves `dist`. `SITE_URL` must be
set to the verified production origin before canonical URLs, absolute social
metadata, and the sitemap are emitted. See `DEPLOYMENT.md` for the remaining
dashboard steps.
