# Phase 3 brief for Codex — the benchmark

Read first: `VISION.md`, `CLAUDE.md`, `docs/plans/2026-09-29-vision-build-plan.md`. No git writes.

A team with no design-system experience cannot read "colour tokenization 41%" and know whether
that is good. The benchmark answers that with measurements from real public code, never with a
grade we invented.

## The trap this design exists to avoid

A product app and a design-system library are not comparable. A token library is ~100% tokenized
because it *is* the tokens. Comparing a startup's app against Radix would make every startup look
broken. So there are two reference sets, and the user is never asked which they are.

| The repo looks like | Compared against |
|---|---|
| A product, or a monorepo whose shared UI is consumed internally | open-source **products** built on a shared UI package |
| A design-system library: publishable, consumed as a package | open-source **design systems** |

## What to build

1. **`src/core/team-shape.ts`** — structural facts, measured, no judgement and no thresholds:
   workspace packages; which packages are consumed by another package in production (reuse
   `analyseConsumers`); whether the shared package is publishable (`private` flag, `exports`);
   whether a CODEOWNERS file exists; whether stories exist. Every fact names the file it came
   from. A fact not checked prints `not checked`, never `none`. Mark the single-app heuristic
   (looking for a `components/ui` directory) with a `ponytail:` comment.
   Add the facts to `context` output and to the report's "where you are now".
2. **`benchmarks/reference.json`** — for each reference repo: name, URL, pinned commit SHA,
   which set it belongs to, the ratios ds-loop measured, plus `adapters` and `configHash` from
   that run, and the date. **No vendored source code.** Public repos only, MIT/Apache/BSD, named
   with their licence. Aim for 6–10 per set. Choose them yourself from well-known open-source
   repos that ds-loop can actually read (CSS custom properties or Tailwind in JS/TSX); record any
   you rejected and why.
3. **`scripts/benchmark.mjs`** — clones each repo at its pinned SHA into a temp dir, runs the
   engine, writes `reference.json`. Anyone can re-run it and get the same numbers. It is a dev
   script: it may use the network, `src/` still may not.
4. **Comparison in the report and dashboard.** Per dimension: the team's ratio, the reference
   range and median, and a plain verdict of `below range` / `in range` / `above range`. No
   percentile, no letter grade, no overall score. The report states which set was used, why, and
   that the user can override it with `--against products|systems`.
   When the user's `adapters` or `configHash` differ from a reference row, that dimension prints
   `not comparable — instrument differs` instead of a number. Reuse the scorecard's rule.
   A dimension the user's run could not measure prints `not checked`.

## Constraints

- `src/` keeps no network, no model call, no runtime dependency. The benchmark data is a JSON file
  read from disk.
- Ratios only. No count is comparable across repos.
- No thresholds outside `src/config/` — the range comes from the data, not from a constant.
- Reference repos are public and named. Nothing from the private calibration corpus.

## Acceptance

- `check`, `type-check`, `test` pass. Tests cover: set selection from team shape; the
  instrument-differs path; a dimension missing from the reference data; and range maths.
- `scripts/benchmark.mjs --verify` re-measures one pinned repo and fails if the ratio moved,
  so a drifted reference set is caught rather than trusted.
- Write `docs/plans/2026-09-29-phase-3-report.md`, including the repo list with licences and
  anything you could not measure.
