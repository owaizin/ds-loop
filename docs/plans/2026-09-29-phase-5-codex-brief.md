# Phase 5 brief for Codex — token JSON, then SCSS

Read first: `VISION.md`, `CLAUDE.md` (especially "Adding an adapter"), `src/adapters/*`. No git writes.

The engine reads CSS custom properties and Tailwind in JS/TSX. Many design-system teams keep their
tokens in JSON and their styles in SCSS, so today those teams get a partial first run. This closes
the biggest coverage gap in the product.

## Part A — token JSON

New adapter `src/adapters/token-json.ts`, handling both shapes teams actually have:

- **W3C DTCG** (`$value`, `$type`, `$description`, nested groups, `{alias.references}`).
- **Style Dictionary** (`value`, `type`, deep nesting, `{alias.references}`), including its
  `$themes`-free plain form.

Rules for this adapter, from `CLAUDE.md`:

- `detect` looks for a JSON file whose shape matches, not for a filename. Files under
  `node_modules`, `dist`, `build` and coverage output are out of scope, via `core/files.ts`.
- Every value is a **declaration**, so `tokenName` is set, never null. The JSON pointer path goes in
  `selector` (e.g. `color.background.default`), and `property` carries the declared `$type` when
  present.
- **Aliases are references, not literals**, and must be classified the same way `var(--x)` is, so
  tokenization ratios stay comparable across storage formats. An alias that resolves to nothing is
  `ambiguous`, never dropped.
- A colour form the converter cannot parse is `ambiguous` and appears in coverage. Never `excluded`.
- `line` must be the real line number in the JSON file. Findings are worthless without it. Parse so
  that you can report it; a hand-rolled position-tracking walk is acceptable and has no dependency
  cost, but test it.
- `VERSION` starts at `0.1.0`. Add to `ADAPTERS` and export from `src/index.ts`.

Then check which existing rules can now judge these values, and make sure the tier and semantic
rules read JSON token names through the same configured patterns rather than assuming a `--` prefix.
Where a rule genuinely cannot judge this format, it must say so in coverage rather than stay silent.

## Part B — SCSS

New adapter `src/adapters/scss.ts`: `$variables`, `@use`/`@forward` (record, do not resolve),
nested rule bodies, and `map.get` references. Mark the ceiling with a `ponytail:` comment —
this is regex, not a Sass parser, and the upgrade path is a real parser.

`.scss` and `.sass` files must appear in the adapter's `extensions` and `reads`, so a team with
SCSS stops seeing "no adapter read this tree".

## Precision gate — this is the part that matters

`CLAUDE.md` is explicit that every precision defect so far was invisible in unit tests. So:

- Measure each adapter on **at least two public repos nobody here wrote** that actually use that
  format. Record the repo, the pinned SHA, what was found, and how many hits you hand-checked.
- Report the false-positive rate you observed, not the one you hope for. If a rule fires on
  something that is not a defect, fix the rule or narrow the adapter before shipping.
- Add a frozen fixture under `fixtures/` for each format, built from a public source, with
  `SOURCE.json`.

## Acceptance

- `check`, `type-check`, `test` pass. Tests: parsing both JSON dialects, alias classification,
  correct line numbers, unparseable colours surfacing as ambiguous, and SCSS nesting.
- Coverage output names the new formats correctly on a mixed repo.
- `docs/plans/2026-09-29-phase-5-report.md` records the public repos measured, the hand-checked
  hits, and anything that is still wrong.
