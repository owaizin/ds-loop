# Phase 3b implementation report — 2026-09-29

**The eligibility changes are implemented. Full corpus recomputation is blocked.**
Git and curl both failed to resolve `github.com` in this session. Only Radix Themes had
an available cached pinned checkout. The other ten snapshots have not been recomputed;
no occurrence counts were inferred from their old ratios. Phase 3b is not fully accepted
until those runs finish.

## Delivered

- `src/config/benchmark.ts` owns the UNCALIBRATED floors: **100 classified occurrences
  per dimension** and **three contributing repositories per range**. At 100 occurrences,
  one observation changes a ratio by at most one percentage point. This screens out
  small incidental stylesheets; it cannot establish whole-repository coverage. Three
  independent sources are a minimum starting corpus, not an industry distribution.
- Measured schema-2 rows store all seven tokenization ratios, their exact denominators
  (`literals + references + mixed`), and `totalValues` across the extraction adapters.
  Ambiguous and excluded style values do not enter those denominators. Below-floor ratios
  are `null` (not measured). A sufficiently sampled true zero remains valid.
- Comparison eligibility is enforced when loading and comparing references. A repo with
  no eligible dimension contributes nothing; a low-sample dimension cannot affect range
  bounds or the instrument comparison. Existing instrument-mismatch suppression remains
  after the minimum contributor check. Missing team measurements remain `not checked`.
- Report and dashboard share the table rendering. Each dimension states its contributing
  repo count and names. Below three contributors the table displays
  `too few reference repos to state a range` and no minimum, maximum or median.
- `scripts/benchmark.mjs` computes the same eligibility, refuses below-floor candidate
  promotion without writing the manifest, and retains the pure-palette rejection.
  Ordinary refreshes move fully ineligible sources into `unmeasurable` with coverage and
  a reason. CSS-in-JS dependencies and unread extensions inform likely-format messages;
  absent evidence is disclosed rather than treated as proof of a format.
- Verification now detects occurrence-count and total-extraction drift as well as ratio,
  adapter and configuration drift. No pin was advanced, no upstream install/build was run,
  and all benchmark Git mutations remained in fresh OS temporary directories.
- Legacy palette ratios are omitted from newly computed benchmark records: they are not
  benchmark dimensions and include zero-denominator placeholders. This does not alter
  audit or scorecard ratios. Eligibility policy is separate from the source instrument,
  whose existing configuration hash remains unchanged.

## Final validated sets in this working tree

| Repository | Set | Licence | Pinned SHA | Scan scope |
|---|---|---|---|---|
| `radix-ui/themes` | systems | MIT | `1faff10ac26ae17f09944d418c6949b93fc6b566` | `packages/radix-ui-themes` |

There are **1 validated systems and zero validated products**.
Radix Themes was fetched from `/private/tmp/ds-loop-public-themes-20260927` into a fresh
checkout at its original SHA. Its total extraction is **3291 values**, with
instrument `css-custom-props@0.5.0 + css-rule-bodies@0.2.0` and config `3c93c488`.

| Dimension | Themes denominator | Themes ratio | System contributors | Product contributors |
|---|---:|---:|---:|---:|
| color | 335 | 0.97 | 1 | 0 |
| spacing | 417 | 0.842 | 1 | 0 |
| typography | 136 | 0.838 | 1 | 0 |
| radius | 75 | not measured | 0 | 0 |
| shadow | 119 | 0.37 | 1 | 0 |
| z-index | 11 | not measured | 0 | 0 |
| duration | 32 | not measured | 0 | 0 |

These are the current validated contributor counts, not estimates for the pending corpus.
No dimension currently qualifies for a range. Coverage remains partial: Radix P3 values,
unclassified expressions, and checks that could not judge remain in the recorded coverage.

## Unmeasurable sources

These exclusions and format reasons come from the supplied Phase 3b brief. Their existing
coverage, instruments and pins are retained in `unmeasurable`. Their misleading ratios were
removed. Each row explicitly says occurrence recomputation is pending; it does **not**
pretend a new run established a count or a total extraction.

| Repository | Set | Licence | Reason | Pinned SHA |
|---|---|---|---|---|
| `excalidraw/excalidraw` | products | MIT | Styles with SCSS, which no adapter reads. | `5a406e51875157bece389b9bc92d41ff241d5f3d` |
| `FlowiseAI/Flowise` | products | Apache-2.0 | Styles with MUI CSS-in-JS, which no adapter reads. | `9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb` |
| `chakra-ui/chakra-ui` | systems | MIT | Styles with CSS-in-JS, which no adapter reads. | `961161428b8c59157ad921dd23303b73c294d73f` |

## Pins awaiting denominator verification

These seven rows are in `pendingMeasurements`, outside `references`. Their original
measurements are retained under `previousMeasurement` for audit, with no invented counts.
This temporary quarantine avoids publishing unverified sample sizes as reference data.
Their licences below are retained metadata from the prior measurements, not rechecked here.

| Repository | Intended set | Recorded licence | Unchanged SHA |
|---|---|---|---|
| `radix-ui/primitives` | systems | MIT | `f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae` |
| `shadcn-ui/ui` | systems | MIT | `db2db460a26fa84fb65c8d903b213925fbdee9ed` |
| `mantinedev/mantine` | systems | MIT | `f38933cb4f1c534600f4ff59ee3ddbb4685a4bc4` |
| `primer/react` | systems | MIT | `a89299ae77e8f444599f94d7e9ca368c17be3f9a` |
| `supabase/supabase` | products | Apache-2.0 | `93a262d185fcba2d919692c32e88ce0f97a9ec98` |
| `langflow-ai/langflow` | products | MIT | `df9711c952a8e798e8fbbad8f25fe60be5ff6018` |
| `appsmithorg/appsmith` | products | Apache-2.0 | `50a5bf0d71c3fac856f55a20f80fbdec7c57b100` |

The unpinned candidates remain `payloadcms/payload` and `radix-ui/colors`. Existing rejected
entries remain unchanged. No new repositories were added to fill the missing measurements.

## Verification

- `npm run check` — passed.
- `npm run type-check` — passed.
- `npm test` — **247 passed, 0 failed**.
- `npm run build` — passed to refresh the compiled CLI used by integration tests.
- Regression tests cover insufficient samples, all-dimension exclusion, the exact sample
  boundary, genuine measured zero, null/missing dimensions, instrument mismatches,
  minimum contributor counts, range maths, and shared report/dashboard HTML rendering.
  The two initial defect tests failed before implementation and passed after the fix.
- Cached `--verify --repo=radix-ui/themes` — passed at the original pin.
- A separate manifest with its colour occurrence count incremented by one — verification
  failed as expected with `occurrences drifted`.
- A separate candidate manifest scanning the pinned Themes `separator.css` — `--pin`
  refused promotion; the candidate manifest stayed unchanged. This deliberately small
  scope is a guard test, not a new reference measurement.
- Refreshing that same tiny scope as an existing reference moved it to `unmeasurable`
  with all ratios null, denominator counts, total extraction and coverage retained.
- Network collection failed at Git fetch (`ssh: Could not resolve hostname github.com`);
  direct curl independently returned `Could not resolve host: github.com`. Git identity,
  remote rewriting, global settings and hooks were not changed.

## Remaining work

Run the same pins from a shell that can resolve GitHub, or supply local caches:

```bash
npm run benchmark
npm run benchmark -- --repo=chakra-ui/chakra-ui --cache=/absolute/path/to/chakra-clone
npm run benchmark -- --verify --repo=radix-ui/themes
```

The default refresh includes references, unmeasurable rows and pending measurements.
Successful runs replace old metadata, record counts, and either promote eligible rows or
retain them as unmeasurable. They do not advance existing SHAs. Reformat the resulting JSON
with the repository's Biome formatter, update the set/count tables in both reports and the
guide, then run the three required checks again. Full occurrence and extraction counts for
ten pins, and the resulting final multi-repo ranges, remain unverified.

No Git command wrote inside this repository. No private calibration material was used.
