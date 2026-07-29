---
name: new-post
description: Scaffold a draft MDX project writeup with schema-compatible frontmatter. Use only when the user explicitly invokes $new-post or asks to use the new-post skill.
---

# New post

Create `src/content/projects/<slug>.mdx`. Derive `<slug>` from the supplied title by lowercasing, replacing spaces with hyphens, stripping punctuation, and collapsing repeated hyphens. If the target exists, stop without overwriting it.

Match the `projects` schema in `src/content.config.ts`:

```mdx
---
title: '<Title Case input, or TODO if unclear>'
summary: 'TODO: one-line summary shown in the projects list.'
date: <current local date, YYYY-MM-DD>
tags: []
draft: true
---

## TODO: first section

TODO: Write this project narrative in the author's voice.
```

Do not write the prose. Keep `draft: true`. Report the created path and remind the user to fill the TODOs and set `draft: false` when ready.
