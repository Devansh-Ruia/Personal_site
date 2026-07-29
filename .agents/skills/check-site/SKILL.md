---
name: check-site
description: Run Personal_site type, lint, and build validation without changing files. Use only when the user explicitly invokes $check-site or asks to use the check-site skill.
---

# Check Personal_site

Run from the repository root, in order:

1. `npm run check`
2. `npm run lint`
3. `npm run build`

Do not fix failures unless asked. Report pass or fail for every step. For failures, include the exact error lines and file locations, grouped by command. If all commands pass, report that in one line.
