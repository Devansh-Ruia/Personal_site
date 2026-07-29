---
name: precompute-fv
description: Explain the Personal_site function-vector case schema and UI mapping. Use only when the user explicitly invokes $precompute-fv or asks to use the precompute-fv skill.
---

# Precompute a function-vectors case

The demo on `/fv` is precomputed and static. No inference runs in the browser.
Each case is one object in the array in `src/data/fv-cases.json`, validated by
the `fvCases` schema in `src/content.config.ts`. This skill documents what each
field means and how it renders, so cases stay consistent.

## What a case is

A function vector (FV) is a single activation-space vector, extracted from a
model's processing of in-context task exemplars, that when added at a layer
makes the model perform that task on a new query. A case captures one task and
a set of probe queries, each with the FV output next to the correct answer, so
the hits and misses show side by side.

## Case fields

| Field         | Type                                | Meaning                                               | Renders as                             |
| ------------- | ----------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| `id`          | string                              | Unique slug.                                          | Dropdown option value. Must be unique. |
| `task`        | string                              | Human name of the task.                               | Dropdown label.                        |
| `kind`        | 'works' \| 'half-works' \| 'breaks' | How well the FV does on this task.                    | Colored badge on the card.             |
| `description` | string                              | One line: what the task is.                           | Shown under the badge.                 |
| `items`       | array                               | The probe queries and their FV outputs. At least one. | The list of input to output rows.      |
| `accuracy`    | number (optional)                   | Task accuracy in 0..1, e.g. 0.36.                     | Shown as a percent next to the badge.  |
| `notes`       | string (optional)                   | Author aside.                                         | Small line under the items.            |

## Item fields (each entry in `items`)

| Field         | Type                                             | Meaning                                    | Renders as                             |
| ------------- | ------------------------------------------------ | ------------------------------------------ | -------------------------------------- |
| `input`       | string                                           | The bare probe query.                      | Left of the arrow, always visible.     |
| `fvOutput`    | string                                           | What the FV produced (the steered output). | Right of the arrow, always visible.    |
| `expected`    | string                                           | The correct answer.                        | Shown only after the reveal toggle.    |
| `correct`     | boolean                                          | Whether `fvOutput` is right.               | Drives the hit/miss mark after reveal. |
| `failureMode` | 'echo' \| 'near-miss' \| 'degenerate' (optional) | Why a miss missed. Omit on hits.           | Tag after the expected answer.         |

Failure modes: `echo` when `fvOutput` equals the `input` (the FV did nothing),
`near-miss` for a wrong but related word, `degenerate` for a stray or garbage
token.

## UI mapping

The `<select>` lists tasks by `task`. Picking one shows that case's badge,
description, optional accuracy, notes, and its `items`. Each item shows
`input -> fvOutput` by default. The single reveal button then shows, per item,
a hit/miss mark, the `expected` answer, and any `failureMode`. Switching tasks
resets to unrevealed.

## Conventions

- `items` are real precomputed results. Show the misses too, that honesty is the
  point of the demo. Do not fabricate outputs, drop failures, or invent an
  `expected` the model was not actually scored against.
- `correct` should reflect whether `fvOutput` is the right answer for `input`.
- All strings use straight quotes, not curly.
- If a value was not given to you, do not guess it. Leave the case out and say
  what is missing rather than filling a plausible number.

## Validate

After editing, run `npm run check`. The schema fails the build if a required
field is missing or mistyped, so a green check means the case is well formed.
