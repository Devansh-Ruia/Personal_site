---
name: add-fv-case
description: Append a measured function-vector case to Personal_site and validate it against the project schema. Use only when the user explicitly invokes $add-fv-case or asks to use the add-fv-case skill.
---

# Add function-vector case

1. Read the `precompute-fv` skill, `src/content.config.ts`, and `src/data/fv-cases.json`.
2. Require a unique slug `id`, `task`, `kind`, `description`, and at least one measured item. Each item needs `input`, `fvOutput`, `expected`, and `correct`. Use `failureMode` only for misses. Accept optional `accuracy` in 0..1 and `notes`.
3. Do not invent outputs, expected values, or scores. Ask for missing measured values instead of guessing. Keep failed items.
4. Append one object while preserving every existing entry exactly and keeping valid top-level array JSON.
5. Run `npm run check`. Report success or the exact schema error. Do not run a full build unless asked.
