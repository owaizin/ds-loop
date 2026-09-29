# Phase 3b brief for Codex — the benchmark must not publish our blind spots as their numbers

Read `docs/plans/2026-09-29-phase-3-codex-brief.md` and `benchmarks/reference.json` first. No git writes.

The corpus is now 11 repos. Reviewing the measurements found a defect that would have shipped a
misleading benchmark.

## The defect

`chakra-ui/chakra-ui` records `style-tokenization-color: 0`. Chakra is not a system with zero
tokenization — it styles with CSS-in-JS, which no adapter reads. The engine found almost nothing,
and a ratio computed over almost nothing came out as `0`. The same is true of
`excalidraw/excalidraw` and `FlowiseAI/Flowise` (SCSS and MUI respectively), both recording `0`
across every dimension.

Published as a reference range, those rows say "real design systems tokenize as little as 0%".
That is a measurement of **our coverage**, not of their system, and it would make a struggling
codebase look above average. This is the benchmark's single most important failure mode.

## The fix

1. **Record the denominator, not just the ratio.** For every dimension, store the occurrence count
   the ratio was computed from, alongside the existing `ratios`. Also store total values extracted.
   A ratio without its sample size cannot be audited, and this file is the audit.
2. **A minimum sample size per dimension.** Below it, that dimension is recorded as
   `not measured` for that repo and **contributes to no range**. It is never recorded as `0`.
   The floor is a tuned number, so it belongs in `src/config/` with an `UNCALIBRATED` comment like
   every other threshold — nothing in `src/` outside `config/` may hardcode it. Pick a defensible
   starting value and say why in the comment.
3. **A repo whose every dimension falls below the floor is not a reference.** Drop it from
   `references`, and record it in a new `unmeasurable` list with the reason ("styles with
   CSS-in-JS, which no adapter reads") and its coverage. Keeping that list is the honest result:
   it documents the formats ds-loop cannot yet characterise, which is phase 5's work queue.
4. **A range needs enough repos to be a range.** State the contributing repo count beside every
   comparison. Below three contributors, the report and dashboard say
   `too few reference repos to state a range` for that dimension instead of showing one. Same
   config-owned threshold treatment.
5. **`scripts/benchmark.mjs` enforces this at pin time**: refuse to promote a candidate whose
   dimensions are all below the floor, with a message naming the likely unread format. It already
   refuses a repo with no tokenization measured at all (`radix-ui/colors`, a pure palette) — this
   extends that guard rather than replacing it.
6. **Re-measure nothing.** The pinned SHAs are good; recompute from a fresh run of the same pins
   using `--cache` where a checkout is still around, or re-fetch. Do not hand-edit ratios.

## Also

`docs/guide/benchmark.md` and the phase 3 report must state the sample floor, the minimum
contributor count, and the `unmeasurable` list with its reasons. A reader has to be able to see
what the benchmark cannot see.

## Acceptance

- `check`, `type-check`, `test` pass. Tests cover: a dimension below the floor never contributing;
  a repo with all dimensions below the floor being excluded; and a range with fewer than three
  contributors rendering as `too few reference repos`.
- `benchmarks/reference.json` contains no `0` ratio that came from an unread format.
- `docs/plans/2026-09-29-phase-3b-report.md` lists the final sets, the excluded repos with
  reasons, and the per-dimension contributor counts.
