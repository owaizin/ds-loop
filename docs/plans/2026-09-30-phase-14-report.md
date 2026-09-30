# Phase 14 report

Implemented the benchmark-only instrument rule in `src/core/benchmark.ts`.

## Rule and regression coverage

`benchmarkComparability` requires equal configuration hashes and parses both adapter
strings as `id@version` entries joined by ` + `. Shared adapter IDs must have identical
versions. Adapters present on only one side, including completely disjoint valid sets,
do not prevent comparison. Empty strings, `none`, malformed entries and duplicate IDs
are refused. Every eligible contributor is checked; incompatible rows are not dropped.

Refusals retain `not comparable — instrument differs`. The dimension's reason and HTML
table name the contributing repository and either the adapter with both versions, the
configuration hashes, or the side with an unparseable adapter string. Existing missing
team measurements and contributor-floor precedence are unchanged.

Scorecard comparability remains unchanged and strict. No thresholds, reference data,
benchmark scripts, or report/dashboard renderer files were edited. The guide now explains
the rule and identifies color, spacing and typography as eligible range dimensions in
both sets. It contains no verified output sample requiring replacement.

Four tests were added: mixed adapter sets producing all three numeric statuses; shared
version/configuration refusal with rendered reasons; malformed strings on either side;
and the real corpus using config `5b0a0820` with
`css-custom-props@0.6.0 + tailwind-jsx@0.5.0 + css-rule-bodies@0.3.0`.
The corpus test requires color, spacing and typography ranges in each set.
The existing numeric test setup now audits the frozen Radix Colors fixture: the previous
workspace fixture reports adapter `none`, which must no longer pass instrument validation.

## Precision gate

Executed the following command for each of `primer`, `excalidraw`, and `posthog`, with
both `systems` and `products`:

```bash
node --experimental-strip-types src/cli.ts report /tmp/precision/<repo> --against <set> --out .phase14-scratch/<repo>-<set>.html
```

The requested PostHog run scans the repository root; its pinned reference scans
`frontend`. Their team ratios therefore need not match. These runs validate the
comparison against the pinned corpus, not a remeasurement of its upstream SHAs.

### Status per dimension

Each cell gives the team ratio and status. **Few** means the exact rendered status
`too few reference repos to state a range`.

| Run | Color | Spacing | Typography | Radius | Shadow | Z-index | Duration | Ranges checked |
|---|---|---|---|---|---|---|---|---|
| excalidraw-products | 0.846; in range | 0.022; in range | 0.042; in range | 0.447; Few | 0.291; Few | 0.509; Few | 0; Few | 3 of 3 |
| excalidraw-systems | 0.846; in range | 0.022; below range | 0.042; below range | 0.447; Few | 0.291; Few | 0.509; Few | 0; Few | 3 of 3 |
| posthog-products | 0.805; in range | 0.033; in range | 0.125; above range | 0.462; Few | 0.139; Few | 0.277; Few | 0.011; Few | 3 of 3 |
| posthog-systems | 0.805; in range | 0.033; below range | 0.125; below range | 0.462; Few | 0.139; Few | 0.277; Few | 0.011; Few | 3 of 3 |
| primer-products | 0.977; above range | 0.695; above range | 0.921; above range | 0.798; Few | 0.594; Few | 0; Few | 0.1; Few | 3 of 3 |
| primer-systems | 0.977; in range | 0.695; in range | 0.921; in range | 0.798; Few | 0.594; Few | 0; Few | 0.1; Few | 3 of 3 |

**18 of 18 ranges checked**, covering all six successful CLI runs. No run produced zero
numeric ranges. Every run produced three ranges; the remaining four dimensions lack
three eligible reference contributors. All six scratch HTML reports were deleted after
verification.

### Independent range arithmetic

Read the contributing rows directly from `benchmarks/reference.json` and checked the
rendered tables by hand. The calculations below show the sorted source values and the
expected minimum, median and maximum. Contributor names were also checked against each
rendered list; an independent Python check verifies the same numbers and statuses.

| Set / dimension | Sorted contributors and values | Min | Median calculation | Max |
|---|---|---|---|---|
| systems / color | radix-ui/primitives 0.574; mantinedev/mantine 0.867; primer/react 0.977; radix-ui/themes 0.991 | 0.574 | (0.867 + 0.977) / 2 = 0.922 | 0.991 |
| systems / spacing | radix-ui/primitives 0.039; mantinedev/mantine 0.472; primer/react 0.695; radix-ui/themes 0.842 | 0.039 | (0.472 + 0.695) / 2 = 0.5835 | 0.842 |
| systems / typography | mantinedev/mantine 0.645; radix-ui/themes 0.851; primer/react 0.921 | 0.645 | middle value = 0.851 | 0.921 |
| products / color | refinedev/refine 0.19; PostHog/posthog 0.817; excalidraw/excalidraw 0.846; appsmithorg/appsmith 0.903 | 0.19 | (0.817 + 0.846) / 2 = 0.8315 | 0.903 |
| products / spacing | refinedev/refine 0.006; excalidraw/excalidraw 0.022; PostHog/posthog 0.04; supabase/supabase 0.169; appsmithorg/appsmith 0.523 | 0.006 | middle value = 0.04 | 0.523 |
| products / typography | refinedev/refine 0.023; excalidraw/excalidraw 0.042; PostHog/posthog 0.058 | 0.023 | middle value = 0.042 | 0.058 |

The existing renderer exposes floating-point representations for three medians:
`0.9219999999999999`, `0.5834999999999999`, and `0.8314999999999999` respectively.
These agree with the arithmetic above; numeric presentation was not changed.

## Validation and limitations

- Before changes: **358 tests**, 357 passed, 1 failed. The dashboard cache test failed
  with `EPERM` because this worktree's `node_modules` symlink points outside its writable
  sandbox.
- For verification, temporarily replaced that symlink with a local dependency copy
  excluding `.cache`. Restored the original symlink afterward; no dependency versions
  or package files changed.
- After changes: **362 tests, 362 passed**, no skipped or cancelled tests.
- `npm run type-check`: passed.
- `npm run check`: failed only on pre-existing formatting in
  `benchmarks/reference.json`. The requested chained command stopped at that failure;
  type-check and tests were then run separately. The brief explicitly forbids editing
  this file, so the full lint gate remains unresolved.
- Targeted Biome check for both changed TypeScript files: passed. `git diff --check`: passed.
- No git writes were performed in this worktree.
