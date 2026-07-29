# Personal site

Astro static site. Portfolio and project writeups. Deployed to Cloudflare Pages.

## Stack

- Astro (static output), MDX for project writeups via Astro's content layer.
- Plain CSS with design tokens in src/styles/tokens.css. No CSS framework.
- Prettier (with prettier-plugin-astro) for format, ESLint for lint, astro check
  for types. npm for scripts.

## Principles

- Austere and content-first. The site should be fast and mostly static HTML.
- One interactive island, static everywhere else. Exactly one component ships
  client JS: src/components/FunctionVectors.astro. Every other page is static.
- New features justify their JS cost. If a change adds client JS or a
  dependency, say what it buys and why static HTML will not do. Prefer no JS.
- Straight quotes, not curly, in copy and code.
- Prose in pages and writeups is the author's to write. Leave it as TODO, do not
  fill in a bio or voice.

## Explicit skills

- `$new-post`: scaffold a new MDX writeup in `src/content/projects` with frontmatter.
- `$add-fv-case`: append an entry to `src/data/fv-cases.json` in schema and validate.
- `$check-site`: run typecheck, lint, and build validation, then report what breaks.

## Function vectors demo

- Data is precomputed and static, never live inference. Cases live in
  src/data/fv-cases.json, validated by the fvCases schema in src/content.config.ts.
- Format and UI mapping are documented in `$precompute-fv`. Use it before adding
  cases so they stay consistent.

## Worktrees

- Not set up. Reach for a git worktree only when building two independent
  features at once and you want them isolated. For normal single-track work,
  stay on main.

## Development workflow: Maker-Checker

Every code change MUST go through this workflow:

1. **Understand**: Read the requirements. Ask clarifying questions if needed.
2. **Make**: Use `$maker` to implement the changes.
3. **Check**: Use `$checker` to review what the Maker wrote.
4. **Fix**: If the Checker found Critical or Important issues, use `$maker` to fix
   them.
5. **Re-check**: Run `$checker` again after fixes. Repeat until the verdict is
   APPROVE.
6. **Commit**: Only after `$checker` approves.

Never skip `$checker`. Never let `$maker` review its own code.
