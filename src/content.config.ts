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

// One probe item: the FV (steered) output next to the correct answer.
const fvItem = z.object({
  input: z.string(), // the bare probe query
  fvOutput: z.string(), // what the function vector produced
  expected: z.string(), // the correct answer
  correct: z.boolean(),
  failureMode: z.enum(['echo', 'near-miss', 'degenerate']).optional(), // on misses
});

// Precomputed function-vector cases. This is "the JSON" the author edits:
// src/data/fv-cases.json is a top-level array of these objects. Validated at
// build and by `astro check`. See .claude/skills/precompute-fv for the format.
const fvCases = defineCollection({
  loader: file('./src/data/fv-cases.json'),
  schema: z.object({
    id: z.string(), // slug, used as the dropdown option value
    task: z.string(), // display name, e.g. "Antonyms"
    kind: z.enum(['works', 'half-works', 'breaks']), // the card framing
    description: z.string(), // one line: what this task/function is
    items: z.array(fvItem).min(1), // the probes and their FV outputs
    accuracy: z.number().optional(), // task accuracy, e.g. 0.36
    notes: z.string().optional(), // optional author note
  }),
});

export const collections = { projects, fvCases };
