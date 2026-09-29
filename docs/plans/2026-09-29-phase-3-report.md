# Phase 3 implementation report — 2026-09-29

## Phase 3b correction

The original implementation record below is historical. The corpus subsequently reached
11 pinned repos, but its ratios lacked denominators and included unread styling formats.
Phase 3b requires **100 classified occurrences per dimension** and **three contributors per
range**, both UNCALIBRATED policies in `src/config/benchmark.ts`. Ratios below the sample
floor are `null` (not measured), never zero; fewer than three contributors produces
`too few reference repos to state a range` in both report and dashboard.

Current validated references: Radix Themes (systems, MIT); no products. Only colour,
spacing, typography and shadow qualify for that system, so their contributor counts are one;
radius, z-index and duration have zero. All product dimensions have zero contributors.

The `unmeasurable` list records Chakra UI (CSS-in-JS), Excalidraw (SCSS), and Flowise (MUI
CSS-in-JS), with their previous coverage and explicit pending-recomputation status. These
formats are not read by the current adapters. Seven other existing pins are held in
`pendingMeasurements`, contributing nothing until denominator verification succeeds.
GitHub DNS failed in this session; only the cached Radix Themes pin could be recomputed.
No ratios or counts were fabricated. The requested full corpus recomputation is incomplete.

See [the Phase 3b report](2026-09-29-phase-3b-report.md) for current sets, exclusions,
contributor counts, validation results and the command to finish collection.

## Original Phase 3 implementation record

**The implementation and required checks are complete; the reference corpus is incomplete.**
The requested 6–10 repositories per set could not be collected because this sandbox cannot
resolve `github.com`. There is one measured system and no measured products. No candidate
measurements, pins, or licences have been invented to fill that gap.

## Delivered

- `src/core/team-shape.ts` records workspace packages, production imports using
  `analyseConsumers`, manifest `private` and `exports` fields, application commands,
  CODEOWNERS locations, stories and the explicitly marked `components/ui` heuristic.
  Facts name source paths; unsupported workspace analysis, unreadable manifests and
  incomplete story discovery say `not checked`. Manifest publishability is evidence of
  eligibility, not proof that anyone publishes or consumes the package externally.
- `context` prints these facts. The consulting report includes them under “Where you are now.”
- `src/core/benchmark.ts` chooses products for application commands/internal private
  production consumers; otherwise an export-bearing, non-private package selects systems.
  Documentation/example/playground directories are excluded from application signals.
  Unestablished shapes fall back to products. The inference and override are disclosed.
- Report and dashboard show tokenization ratios for colour, spacing, typography, radius,
  shadow, z-index and duration, with observed minimum, maximum, median and inclusive
  `below range` / `in range` / `above range` comparisons. Contributors are named per dimension.
  There are no percentiles, grades, overall scores or invented benchmark cutoffs.
- The scorecard's existing instrument comparator now accepts the shared instrument fields.
  Benchmark comparisons use that same function. If any contributing reference differs in
  adapters or configuration hash, no numeric comparison is displayed for the dimension.
  A missing team ratio is `not checked`; missing reference data is explicitly identified.
- `report` and `dashboard` accept `--against products|systems`, validate the value, and state
  the selected set and why. The dashboard registry and guard refresh preserve overrides.
- `scripts/benchmark.mjs` fetches pinned Git snapshots into fresh OS temporary directories,
  checks the recorded licence notice, runs the engine with `DEFAULT_CONFIG`, and writes
  measured metadata. It cleans up the snapshots and runs no upstream build/install scripts.
  `--verify` re-measures one pinned repository and fails on ratio or instrument drift.
  `--pin` promotes a candidate only after a successful measurement. `--cache` fetches the
  same pinned object from an existing clone for offline use; it never reads its dirty tree.
  `--data` supports independent manifests and drift checks.
- The package includes `benchmarks/reference.json`. Both source and compiled engines read
  it locally. `src/` gained no network calls, models or runtime dependencies.
- Usage and collection instructions are in `docs/guide/benchmark.md`.

## Measured public reference

| Repository | Set | Licence checked | Pinned commit | Audited scope |
|---|---|---|---|---|
| [Radix Themes](https://github.com/radix-ui/themes) | systems | MIT, root `LICENSE` | `1faff10ac26ae17f09944d418c6949b93fc6b566` | `packages/radix-ui-themes` |

This snapshot was available in a pre-existing public checkout at
`/private/tmp/ds-loop-public-themes-20260927`. The benchmark fetched its committed object into
a new temporary repository before measuring it. The source was not copied into this project.

Measurement date: **2026-09-29**. Instrument:
`css-custom-props@0.5.0 + css-rule-bodies@0.2.0`, configuration hash `3c93c488`.

| Tokenization dimension | Measured ratio |
|---|---:|
| Colour | 0.970 |
| Spacing | 0.842 |
| Typography | 0.838 |
| Radius | 0.667 |
| Shadow | 0.370 |
| Z-index | 0.000 |
| Duration | 0.031 |

These are recorded engine ratios, not claims about visual quality. With one reference,
minimum, maximum and median are the same observation. This is not an industry distribution.

Coverage remains incomplete: the selected scope was read by the CSS adapters; P3 colours
were recognised but not convertible, some values were undecided/unclassified, and
`token/tier-model-undetectable` and `token/raw-value-in-style` could not fully judge.
The exact coverage object is retained with the measurement. No rendered behaviour, runtime
component adoption, external package consumption or organisational ownership was measured.

Legacy palette ratios are retained in the JSON for reproducibility but excluded from the
benchmark table because their zero-denominator placeholders are not measurements. Shared
component ratios keyed by unrelated package names are also excluded from cross-repo comparisons.

## Unmeasured shortlist

The following are **candidates, not references**. The licence column records a provisional
licence to verify at a pinned checkout, not an assertion that this run validated it. Scopes
also need review before promotion, including mixed-licence subtrees and whether the selected
code represents a product using shared UI. Candidates have no ratios and never enter ranges.

| Candidate | Intended set | Provisional licence | Proposed scope |
|---|---|---|---|
| `excalidraw/excalidraw` | products | MIT | repository root |
| `FlowiseAI/Flowise` | products | Apache-2.0 | `packages/ui` |
| `supabase/supabase` | products | Apache-2.0 | `apps/studio` |
| `langflow-ai/langflow` | products | MIT | `src/frontend` |
| `appsmithorg/appsmith` | products | Apache-2.0 | `app/client` |
| `payloadcms/payload` | products | MIT | repository root |
| `radix-ui/colors` | systems | MIT | repository root |
| `radix-ui/primitives` | systems | MIT | repository root |
| `shadcn-ui/ui` | systems | MIT | repository root |
| `chakra-ui/chakra-ui` | systems | MIT | repository root |
| `mantinedev/mantine` | systems | MIT | repository root |
| `primer/react` | systems | MIT | repository root |

Not selected: `tldraw/tldraw` and `calcom/cal.com`, because an allowed permissive licence
was not verified in this run. `hoppscotch/hoppscotch` was deferred because Vue template
extraction is outside the current adapters; its current source/licence was also not verified.
These reasons are recorded separately in the manifest.

## Verification

- `npm run check` — passed.
- `npm run type-check` — passed.
- `npm test` — **243 passed, 0 failed**.
- `npm run build` — passed. Rebuilding also refreshed the pre-existing compiled CLI used by
  guard-hook integration tests.
- Eight new tests cover odd/even medians, extrema and inclusive boundaries, both instrument
  mismatch paths, missing team/reference dimensions, set isolation, workspace/internal UI
  selection, standalone publication structure, documentation/story exclusions, missing facts,
  HTML integration, CLI validation and shipped reference metadata. The dashboard guard test
  additionally verifies that an explicit system comparison survives refresh.
- `node --experimental-strip-types scripts/benchmark.mjs --verify
  --cache=/private/tmp/ds-loop-public-themes-20260927` — passed against the pinned snapshot.
- The same verification with `--data=/tmp/ds-loop-phase3-drift.json`, containing a deliberately
  altered colour ratio — failed as expected with `radix-ui/themes: ratios drifted`.
- Generated `/tmp/ds-loop-phase3-report.html` from the actual Radix package. All seven measured
  dimensions were `in range` against the identical pinned reference.
- Default network `--verify` and the initial candidate clone failed with
  `ssh: Could not resolve hostname github.com: -65563`. The Git configuration's HTTPS-to-SSH
  rewrite and account configuration were left unchanged.

No Git command wrote inside this repository. All benchmark Git mutations were in newly created
OS temporary directories. No private calibration material was accessed or added.

## Remaining acceptance gap

A network-enabled run must review and measure enough candidates to reach 6–10 references per
set, replace unsuitable candidates, and run network `--verify` successfully. Until then,
products correctly display `not checked — no reference data for this dimension`, and systems
have only the one-source observation disclosed above. Phase 3 must not be called fully accepted
with the present corpus.
