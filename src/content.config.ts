import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// Project writeups, authored as MDX in src/content/projects/*.mdx
const projects = defineCollection({
  // [^_]*.mdx keeps files like _example.mdx as templates, not built routes.
  loader: glob({ pattern: '[^_]*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// One reusable pair of ICL exemplars that define the task/function.
const fvPair = z.object({
  input: z.string(),
  output: z.string(),
});

// Precomputed function-vector cases. This is "the JSON" the author edits:
// src/data/fv-cases.json is a top-level array of these objects. Validated at
// build and by `astro check`. See .claude/skills/precompute-fv for the format.
const fvCases = defineCollection({
  loader: file('./src/data/fv-cases.json'),
  schema: z.object({
    id: z.string(), // slug, used as the dropdown option value
    task: z.string(), // display name, e.g. "Antonyms"
    description: z.string(), // one line: what this task/function is
    contrast: z.object({
      pairs: z.array(fvPair).min(1), // the exemplars that define the function
    }),
    probe: z.string(), // the query prompt shown to the model
    unsteered: z.string(), // model output with no function vector added
    steered: z.string(), // model output with the function vector added
    layer: z.number().optional(), // layer the vector was extracted/added at
    strength: z.number().optional(), // steering coefficient
    notes: z.string().optional(), // optional author note
  }),
});

export const collections = { projects, fvCases };
