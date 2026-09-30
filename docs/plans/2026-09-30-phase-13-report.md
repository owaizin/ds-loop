# Phase 13 report — reachability in HTML

Implemented in this worktree, with no git writes. The renderer work is complete; the
requested five-location precision sample is unavailable for Primer and Excalidraw
because neither audit associates a finding location with `no-static-importer`.

## Changes by surface

- **Consult report:** headline tokenization ratios and finding groups now have reached
  companions. Finding cards retain their existing counts and add the state and located
  occurrence pair. Severity, area and navigation finding counts are also paired.
  Import limits and the totals basis appear only in “What we couldn't check”.
- **Standalone audit:** static and lazily browsed finding cards show the same evidence.
  Finding group totals, pagination and CSS inventory measurements have reached companions.
  Inventory includes occurrences, distinct values, classification counts, tokenization,
  top-file counts and displayed value counts. Missing counterparts say `reached not measured`.
  Import limits and totals basis appear in coverage.
- **Dashboard:** each today's ratio shows its reached counterpart, including an explicit
  not-measured result for ratios without one. Findings show located occurrence pairs and
  reach states; the finding total is paired. Limits appear in coverage.
- Shared presentation helpers live in `src/core/reach-html.ts`. History/trend rows are
  unchanged. No findings were removed, filtered or reordered. No engine semantics,
  rule strings, CLI text, CLI JSON shape, benchmarks or reader-facing documentation changed.
- CSS changes only allow the existing miniature bars to grow around the added text and
  put the cover's companion measurement below its primary number. No new design tokens,
  fonts or icons.

## Count bases and absent data

The existing rule count is labelled as rule-reported. It is not equated with
`dimensions.occurrences.all`: a separate `N located occurrences all / reached M` pair
uses the two matching located-evidence quantities. Aggregate findings without locations
say `importer not determined`, with both occurrence measurements unavailable.

This distinction matters on real data:

| Repository | Rule | Existing count | Located occurrences |
|---|---|---:|---|
| Primer | `token/var-missing-fallback` | 2,211 | not measured |
| Excalidraw | `token/var-missing-fallback` | 642 | not measured |
| PostHog | `token/var-missing-fallback` | 3,255 | not measured |
| PostHog | `token/tier-leakage` | 22 | not measured |

Mixed cards retain the reached count and print the no-static-importer and unresolved
splits. A measured zero remains zero; an absent or null counterpart never becomes zero.
Finding-total headlines use `findingTotals.reached`; severity/area subsets count groups
with positive reached occurrences only when dimensions are available. Inventory pairs
use the matching reached category, file or value entry; absent entries stay not measured.
The top-file total is summed only when all its category counterparts exist. Suggestion-row
and exception totals have no corresponding measurement and say so explicitly.

## Public-repository precision runs

Ran the requested command for each complete repository root:

```sh
node --experimental-strip-types src/cli.ts report /tmp/precision/<repo> --out .phase13-scratch/<repo>.html
node --experimental-strip-types src/cli.ts audit /tmp/precision/<repo> --json
```

All three reports were produced. Audit exits indicating findings were expected. Final
renderers were also exercised against each captured report on all three surfaces.
The scratch directory, HTML files, and JSON files were deleted before completion.

### Finding cards and states

The consult report already repeats its first three cards in the summary. The detailed
engine section also contains up to three static previews per rule/severity group and a
lazy browser for every finding. Counts below distinguish those existing repetitions.
Columns describe each card's overall state, not membership in the reached group total.

| Repository / card set | Cards | reached | No static importer found | importer not determined | mixed |
|---|---:|---:|---:|---:|---:|
| Primer — unique findings / dashboard list | 55 | 13 | 0 | 42 | 0 |
| Primer — consult cards including summary | 58 | 16 | 0 | 42 | 0 |
| Primer — detailed static previews | 13 | 8 | 0 | 5 | 0 |
| Excalidraw — unique findings / dashboard list | 20 | 11 | 0 | 5 | 4 |
| Excalidraw — consult cards including summary | 23 | 12 | 0 | 5 | 6 |
| Excalidraw — detailed static previews | 14 | 5 | 0 | 5 | 4 |
| PostHog — unique findings / dashboard list | 242 | 8 | 0 | 224 | 10 |
| PostHog — consult cards including summary | 245 | 9 | 0 | 225 | 11 |
| PostHog — detailed static previews | 21 | 3 | 0 | 10 | 8 |

Thus the consult documents contain 71, 37 and 266 static finding-card instances respectively
when the detailed previews are included. Lazy browsing preserves all unique findings.

**Primer has zero “No static importer found” labels on finding cards.** Its graph labels
148 files that way, but none is present in complete finding-location evidence.
**Excalidraw has zero positive no-static-importer occurrence counts on finding cards.**
Its six mixed consult cards print `No static importer found: 0`; the graph separately
labels 110 files. PostHog has 34 distinct such files in finding locations (6,503 in the
graph). Eight of its 11 mixed consult-card instances show positive no-static-importer
counts. No repository has a wholly no-static-importer finding group in these runs.
These are source-evidence limitations, not renderer omissions; engine semantics were
left intact as instructed.

### HTML versus audit JSON

The embedded reports' `findingTotals`, `reachedRatios`, `reachedStyleInventory` and
`fileImports` exactly match the separately executed `audit --json` results. Visible
consult totals and all three headline pairs were checked against those measurements.

| Repository | Finding groups all / reached | Color all / reached | Spacing all / reached | Typography all / reached |
|---|---|---|---|---|
| Primer | 55 / 13 | 97.7% / 97.7% | 69.5% / 69.5% | 92.1% / 92.1% |
| Excalidraw | 20 / 15 | 84.6% / 85.8% | 2.2% / 2.2% | 4.2% / 4.3% |
| PostHog | 242 / 18 | 80.5% / 80.8% | 3.3% / 3.4% | 12.5% / 12.9% |

The full totals tuples `(all, reached, noStaticImporter, unresolved)` are respectively
`(55, 13, 0, 42)`, `(20, 15, 0, 5)` and `(242, 18, 0, 224)`. Mixed groups with reached
locations belong in the reached column; the columns are not occurrence partitions.

### Five-location importer hand-check

Searched filenames and extensionless stems with `rg`, inspected matching import/require
and stylesheet-import directives, and additionally searched target paths with hidden
files included (excluding Git metadata and dependencies).

- **Primer:** 0 locations available; 0 of the requested 5 could be sampled. No five-location
  precision claim is possible.
- **Excalidraw:** 0 locations available; 0 of the requested 5 could be sampled. No five-location
  precision claim is possible.
- **PostHog:** **5 of 5 have no static importer I could find.** Checked:
  - `frontend/src/lib/components/PanelLayout/PanelLayout.tsx`: filename comment and imports
    of other PanelLayout implementations, but no importer of this path.
  - `frontend/src/lib/lemon-ui/LemonCalendar/LemonCalendarSelect.stories.tsx`: timing manifest
    reference only.
  - `frontend/src/lib/lemon-ui/LemonCalendarRange/LemonCalendarRange.stories.tsx`: timing
    manifest reference only.
  - `frontend/src/scenes/authentication/shared/authScene/DevLoginPanel.stories.tsx`: no
    importer; a timing record names a different `paperDesk` path.
  - `frontend/src/scenes/insights/InsightQuickStart/InsightQuickStart.tsx`: **dynamic import
    exists** at `frontend/src/scenes/appScenes.ts:52`, plus route/scene registrations.
    Its own static import loads its stylesheet, not this component. This is not evidence
    that the component is irrelevant or removable.

### Once-only caveats and forbidden wording

For each of Primer, Excalidraw and PostHog, on each of consult, standalone audit and
dashboard (nine documents), the visible-text occurrence counts were:

| Caveat | Occurrences per document |
|---|---:|
| `findingTotals.basis` — finding groups with at least one reached location | 1 |
| Import limit — static analysis within the scanned tree | 1 |
| Import limit — no-static-importer is not a deletion verdict; dynamic imports and other mechanisms excluded | 1 |
| Import limit — supported relative/config/workspace resolution | 1 |
| Import limit — unresolved specifiers/configs and incomplete aggregate locations | 1 |

After stripping style/script blocks and HTML tags, all nine documents had zero matches
for the brief's forbidden-word expression. No pre-existing copy needed rewording.

## Validation and remaining limits

- Before: **358 tests**, 357 passed and one failed because the initial `node_modules`
  symlink points outside this worktree's writable roots; the dashboard test tried writing
  the shared cache there.
- Added three all-surface regression cases covering imported/unimported temporary CSS,
  pure and mixed states, count pairs, fixed wording, once-only limits and deletion of all
  five optional report fields plus finding dimensions. Extended the lazy-browser test
  to check its reached annotation.
- Updated the external-resource test to check `@import` in executable style/script blocks,
  rather than rejecting the newly visible coverage prose that mentions CSS `@import`.
  External `src`/`href` checks and script network-call checks remain.
- Validation used a temporary local dependency directory linking to the existing packages
  with a local writable cache. The original dependency symlink was restored afterward.
- Final gate: `npm run check && npm run type-check && npm test` passed; **361 tests passed**.
- The requested five-location sample remains incomplete for Primer and Excalidraw, as
  detailed above. No engine changes were made to manufacture locations or classifications.
- No interactive browser visual review, build, smoke, release or Git write was performed.
  Existing generated-script and lazy-browser interaction tests passed. History/trend
  measurements were preserved; reached history was not invented.
