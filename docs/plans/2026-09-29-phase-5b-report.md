# Phase 5b report — keyword exclusions

Implemented the shared keyword policy in `src/core/literals.ts` and applied it to all five adapters. No runtime dependency or network operation was added to the engine. No Git command wrote inside this repository.

## Keyword policy

Case-insensitive exclusions: `transparent`, `currentColor`, `inherit`, `initial`, `unset`, `revert`, `revert-layer`, `none`, `auto`, and the previously supported `normal`.

Generic font families added: `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `emoji`, `math`, `fangsong`.

This policy groups CSS-wide keywords, property-specific keywords and generic families; `transparent` is a color keyword, technically not a CSS-wide keyword.

Whole keyword values are retained as `excluded` with a reason. Mixed declarations retain their original raw text, location and references, plus `excludedKeywords` components, each classified `excluded` with its own reason. Removing those components from classification leaves genuine literals reportable and keyword-plus-reference values classified as references. Each declaration remains one occurrence, avoiding an inflated denominator from shorthand splitting.

The lexical scan handles top-level components, comments, case and assignment modifiers. Quoted family names remain literal names; function arguments and `var()` fallbacks are not stripped as active keyword components. This remains bounded extraction, not CSS/Sass evaluation.

## Adapter findings and changes

| Adapter | Before this work | Now |
| --- | --- | --- |
| CSS rule bodies | Correct for whole `inherit`, `initial`, `unset`, `revert`, `revert-layer`, `none`, `auto`, `normal`, `currentColor`. Incorrect for `transparent` and mixed keyword/reference values. Did not read `font-family`. | Shared exclusions, mixed-value classification, and font-family reads; version 0.3.0. |
| CSS custom properties | No shared keyword policy; ordinary unrecognized keyword declarations were dropped as “not a color value.” | Retains keyword declarations and exclusions, classifies remaining supported literals; version 0.6.0. |
| SCSS/Sass | Shared the CSS rule-body defect. Variable keywords fell through the generic declaration classifier without a specific keyword reason. | Shared policy for variables and ordinary properties, including font-family; version 0.2.0. |
| Tailwind JSX | Dropped excluded arbitrary keywords and did not retain named keyword color utilities. Mixed values with references could hide literals. | Retains keyword exclusions, including named color utilities such as `bg-transparent`; mixed literals remain reportable by the markup rule; version 0.5.0. |
| Token JSON | Generic keywords lacked a specific reason; declared color keywords became ambiguous “cannot convert” values. | Explicit keyword exclusions survive the declared-color conversion check; version 0.2.0. |

Coverage includes keyword component counts and samples in JSON, detailed text, plain text and the HTML report. Recognized exclusions do not make coverage incomplete. Excluded values remain outside tokenization denominators. Adapter-version assertions were updated to preserve attribution checks.

## Local measurements and regressions

`test/fixtures/phase-5b/patterns.scss` freezes the declaration patterns described in the Excalidraw review, with independently constructed literals and a generic example typeface. It is a regression fixture, not a vendored upstream snapshot. Tests also run the same declarations through the CSS reader.

For a before/after comparison, replayed the pre-change CSS classifier and property routing from HEAD in a temporary source copy, exporting the existing functions for the SCSS adapter. This measures the classifier change on the same frozen input; it is not a full upstream benchmark rerun.

| Local fixture measurement | Before classifier | After |
| --- | --- | --- |
| Color tokenization | 20% (1/5) | 50% (2/4) |
| Typography tokenization | Not read | 0% (0/1); generic-only stack excluded |

Two transparent declarations leave the color denominator. The mixed keyword/reference declaration moves from unclassified to reference. The genuine color literal and the mixed literal/reference declaration still report. The fixture retains eight excluded keyword/family components. Its explicit example typeface remains a typography literal.

`test/keywords.test.ts` covers every listed keyword and generic family across all adapters, uppercase matching, mixed literals/references, preserved line attribution, named Tailwind transparency, coverage visibility, and quoted names/function arguments/fallback boundaries. The existing tests continue to cover severity and ratio behavior.

## Benchmark and precision gate

Attempted `npm run benchmark` (`scripts/benchmark.mjs`). It failed fetching the first pinned reference, `radix-ui/themes`, because DNS could not resolve `github.com`. The script's Git mutations were confined to a fresh OS temporary directory, which it removed. No benchmark measurements were written by this attempt; `benchmarks/reference.json` was not hand-edited or changed by this task. Its existing working-tree changes predate this task. Reviewer action: rerun `npm run benchmark` with network access before relying on the corpus measurements.

The false-positive rate on public repos is still unmeasured by me; the reviewer should rerun Excalidraw's `packages/` scan and inspect the reported locations.

## Validation

- `npm run check` — passed.
- `npm run type-check` — passed.
- `npm test` — passed, 272 tests.
