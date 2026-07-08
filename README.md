# Personal site

Astro static site. Portfolio and MDX project writeups, plus one interactive
"function vectors" demo. Deployed to Cloudflare Pages (build `npm run build`,
output `dist`).

## Develop

```
npm install
npm run dev        # local dev server
npm run check      # types + Astro diagnostics
npm run lint       # eslint
npm run build      # static build to dist/
npm run format     # prettier --write .
```

## Layout

- `src/pages` routes, `src/layouts` shared shell, `src/components` UI.
- `src/content/projects/*.mdx` writeups (schema in `src/content.config.ts`).
- `src/data/fv-cases.json` precomputed function-vector cases (typed, validated).
- `src/styles/tokens.css` design tokens, `global.css` base styles.

## Claude Code

See `CLAUDE.md`. Commands: `/new-post`, `/add-fv-case`, `/check`. Skill:
`precompute-fv`. A save hook formats and lint-fixes touched files.
