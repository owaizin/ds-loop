# Phase 14 brief for Codex: the benchmark can never compare

Read `CLAUDE.md` first, then `docs/guide/benchmark.md`. **No git writes**: no commit, no branch,
no staging, nothing under `.git`. The reviewer commits.

## The defect, measured

`compareReferences` (`src/core/benchmark.ts`) calls `comparability()` from
`src/commands/scorecard.ts`. That function requires the run's `manifest.adapter` string to equal
each contributing reference's `adapters` string exactly. The adapter *set* depends on what a
repository contains: no `.scss` files, no `scss` adapter. The corpus that was just re-measured
(`benchmarks/reference.json`, config `5b0a0820`) mixes these sets inside every dimension that has
three or more contributors:

- `css-custom-props@0.6.0 + css-rule-bodies@0.3.0` (Radix Themes, Radix Primitives)
- `css-custom-props@0.6.0 + tailwind-jsx@0.5.0 + css-rule-bodies@0.3.0` (Mantine, Primer, Supabase, Refine)
- `... + token-json@0.2.0` (Appsmith), `... + token-json@0.2.0 + scss@0.2.0` (PostHog)
- `css-rule-bodies@0.3.0 + scss@0.2.0` (Excalidraw)

Simulated result for a run with matching config: every dimension with three or more contributors
returns `not comparable — instrument differs`. **No run can ever get a range.** The feature has
never been able to produce the output it exists for. Its tests are green because each test builds
references that share one adapter string.

## The decision (made, not open)

For **benchmark comparison only**, "same instrument" means:

1. the same `configHash`, and
2. **no adapter id present on both sides at a different version**.

Parse `id@version` pairs from the `' + '`-joined string. An adapter that only one side has means
that side's source had that format. It does not mean the ruler changed. A string that does not
parse is **not comparable**. Never treat unparseable as a match.

**Do not change `comparability()` in `scorecard.ts`.** For a scorecard delta on the *same* source,
a change in the adapter set is real news ("the instrument moved") and stays strict. Add a separate
function in `src/core/benchmark.ts`.

When a comparison is refused, the status stays `not comparable — instrument differs`. That string
is stable. Where a reason is shown, name the adapter and the two versions, or the two config hashes.

## Do not touch

- `benchmarks/reference.json`, `scripts/benchmark.mjs`, `src/config/benchmark.ts`. The data is
  freshly measured. Never hand-edit a pinned number.
- `src/commands/scorecard.ts` semantics.
- `src/core/report-html*.ts`, `consult-html.ts`, `dashboard-html.ts`. Another Codex task is
  editing them right now. The benchmark section is rendered in `src/core/benchmark.ts`
  (`benchmarkHtml`), which is yours.
- Thresholds (`minOccurrences`, `minContributors`).

## Tests (`test/benchmark.test.ts`)

- References with different adapter sets but shared adapters at equal versions and an equal
  config hash → a numeric range (`in range` / `below range` / `above range`).
- A shared adapter at a different version → `not comparable — instrument differs`.
- A different config hash → `not comparable — instrument differs`.
- An unparseable adapter string → not comparable.
- A regression test that loads the **real** `benchmarks/reference.json` and asserts that at least
  one dimension in each set yields a numeric range for a run using config `5b0a0820` and the
  adapter string `css-custom-props@0.6.0 + tailwind-jsx@0.5.0 + css-rule-bodies@0.3.0`. This is
  the test that would have caught the defect. It will need updating when the corpus is
  re-measured under a new config, and that is intended.

## Docs

`docs/guide/benchmark.md` line ~38 describes the instrument rule. Update it to the rule above, in
plain words. Its "Current reference coverage" section was just rewritten. Do not restructure it,
but you may add one sentence stating which dimensions now produce a range. If the guide contains
a `<!-- verified: -->` sample for this output, run the command and paste the real output. Never
edit a sample by hand.

## Precision gate: counts

Run `node --experimental-strip-types src/cli.ts report <path> --against systems --out <scratch>.html`
and the same with `--against products`, on `/tmp/precision/primer`, `/tmp/precision/excalidraw`
and `/tmp/precision/posthog`. Scratch files go inside this worktree; **delete them before you
finish**. For each run, report the status per dimension. For each numeric range, check by hand
that its min, median and max match the values in `reference.json` for the contributing repos
listed. Report *N of N ranges checked*. If any run still produces zero numeric ranges, say so and
say why.

## Done means

`npm run check && npm run type-check && npm test` pass. Report the test count before and after.
Write `docs/plans/2026-09-30-phase-14-report.md` with: the rule as implemented, the precision
counts, and anything you did not do or could not verify.
