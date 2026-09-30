# Phase 15 report — 2026-09-30

Implemented A, B and C. Lint, type-check and all **369 tests pass**. No git writes.
The sampled precision gate found no incorrect “No static importer found” labels.
The separate five-docs-card check has no eligible cards in these snapshots; it could not be performed.

## Changes

- Exact, graph-backed `file:line` findings now receive one dimensions location when evidence is absent or empty. Lists, truncated strings, prose, missing files and invalid line numbers remain unresolved. A local synthetic `RawValue` carries only the known location and empty/nullable unknown fields; it is not published as extraction evidence. Config ignores and accepted `## Covers` decisions still annotate intentionality.
- `token/var-missing-fallback` attaches one existing `RawValue` per counted reference. Two references in one value intentionally repeat that value, preserving `evidence.length === data.count`. Existing summary, where, fix and data remain unchanged, including the 40-hit sample cap.
- Scoped package roots no longer cloud files. Declared external deep paths no longer cloud files; declarations are collected from dependencies, devDependencies and peerDependencies across discovered package manifests. Workspace handling remains first. Undeclared deep paths and `~/`, `@/`, `lib/...` aliases retain uncertainty. No dependencies are installed or evaluated by the engine. `FILE_IMPORTS_VERSION` is **1.1.0**.
- Added four regression tests covering these behaviors. Updated the older alias-clouding test from `@theme/Layout` to `~/theme/Layout`, because the former is a scoped package root under the brief's decided rule.

## Measurement method

Ran `node --experimental-strip-types src/cli.ts audit /tmp/precision/<repo> --json` before and after, with default configuration and no severity floor. Counts below use `findings` cards, all their `dimensions.locations` occurrences, and every `fileImports.files` entry. Locations are occurrences, not unique files; repeated references remain counted. Mixed is a card state only.

Primer and PostHog baselines ran with the original modules before edits. The sequential baseline command reached Excalidraw after edits, so that output was discarded: its baseline was rerun from a temporary copy of the original source (the three changed modules restored using read-only `git show HEAD:<path>`). The baseline versions were checked as 1.0.0 and after versions as 1.1.0. Source revisions and config hashes match within each pair. All scratch files were removed after recording results.

| Repository | Public snapshot HEAD |
|---|---|
| Primer | `a89299ae77e8f444599f94d7e9ca368c17be3f9a` |
| PostHog | `8d57ee1a5047c43b7a5a0dfc399049e8c0ac01b3` |
| Excalidraw | `5a406e51875157bece389b9bc92d41ff241d5f3d` |

## Finding cards

| Repository | Run | Reached | No static importer found | Unresolved | Mixed | Total |
|---|---|---:|---:|---:|---:|---:|
| Primer | before | 13 | 0 | 42 | 0 | 55 |
| Primer | after | 52 | 0 | 2 | 1 | 55 |
| PostHog | before | 8 | 0 | 224 | 10 | 242 |
| PostHog | after | 209 | 0 | 22 | 11 | 242 |
| Excalidraw | before | 11 | 0 | 5 | 4 | 20 |
| Excalidraw | after | 12 | 0 | 4 | 4 | 20 |

## Locations

| Repository | Run | Reached | No static importer found | Unresolved | Mixed | Total |
|---|---|---:|---:|---:|---:|---:|
| Primer | before | 519 | 0 | 0 | 0 | 519 |
| Primer | after | 2768 | 0 | 2 | 0 | 2770 |
| PostHog | before | 8807 | 209 | 1797 | 0 | 10813 |
| PostHog | after | 11963 | 459 | 1863 | 0 | 14285 |
| Excalidraw | before | 1229 | 0 | 36 | 0 | 1265 |
| Excalidraw | after | 1871 | 0 | 36 | 0 | 1907 |

## Files

| Repository | Run | Reached | No static importer found | Unresolved | Mixed | Total |
|---|---|---:|---:|---:|---:|---:|
| Primer | before | 653 | 148 | 641 | 0 | 1442 |
| Primer | after | 653 | 149 | 640 | 0 | 1442 |
| PostHog | before | 12934 | 6503 | 2843 | 0 | 22280 |
| PostHog | after | 12934 | 6579 | 2767 | 0 | 22280 |
| Excalidraw | before | 595 | 110 | 171 | 0 | 876 |
| Excalidraw | after | 595 | 110 | 171 | 0 | 876 |

## Precision hand-checks

The actual existing-location transitions into “No static importer found” are: Primer **0**, PostHog **97**, Excalidraw **0**. PostHog also gained **153 previously unlocated occurrences** with that state from B. Its previous 209 occurrences retain that state. This explains the increase from 209 to 459 without treating newly attached evidence as a resolver transition.

For each sampled file, searched the tree with `rg -n --hidden -g '!.git' -g '!node_modules' -F <filename-stem> /tmp/precision/posthog`, including configs/manifests, and inspected import/reexport, require, dynamic import, stylesheet `@import`/`@use`/`@forward`, and filename references. Searches include filenames with and without extensions. Same-named external and desktop components were distinguished by their target paths. Large source-map matches for the generic `style` name are embedded dependency sources, not importers of the demo stylesheet.

| Repository | Existing moved locations checked | No static importer I could find | Incorrect static-absence labels found |
|---|---:|---:|---:|
| Primer | 0 (none eligible) | 0 of 0 | 0 |
| PostHog | 10 | **10 of 10** | 0 |
| Excalidraw | 0 (none eligible) | 0 of 0 | 0 |

The 97 existing transitions occur in only two files. The ten sampled locations are:

- `services/hogql-language-service/cmd/demo/assets/style.css`: **3, 5, 63, 69, 74, 78, 88**. No static importer found. `services/hogql-language-service/cmd/demo/assets/index.html:7` links `/style.css` using `<link rel="stylesheet">`. This is a real consumer outside the import signal; the label does not imply lack of use. Imports of `@xyflow/react/dist/style.css` refer to that external package, not this sheet.
- `frontend/src/scenes/authentication/shared/RegionSelect.tsx`: **48, 56, 59**. No static importer found. `products/desktop/packages/ui/src/features/auth/OAuthControls.tsx:6` and its adjacent story import the distinct desktop `RegionSelect`, not this file.

To avoid relying only on two files, also checked ten distinct files across all newly labelled occurrences (**10 of 10 have no static importer I could find**):

| PostHog location | Hand-check result / other consumers |
|---|---|
| `services/hogql-language-service/cmd/demo/assets/style.css:3` | HTML link above; no import/require/dynamic-import target found. |
| `frontend/src/scenes/authentication/shared/RegionSelect.tsx:48` | Only its own declaration and unrelated namesakes; no importer of this file. |
| `frontend/src/layout/panel-layout/navbar/NavBar.stories.tsx:43` | No explicit filename reference. Storybook's frontend story glob includes it. |
| `frontend/src/layout/panel-layout/navbar/tabs/NavProductTooltip.stories.tsx:10` | No explicit filename reference. Same Storybook glob. |
| `frontend/src/layout/panel-layout/navbar/tabs/flat-nav/FlatNavBrowse.stories.tsx:18` | No explicit filename reference. Same Storybook glob. |
| `frontend/src/lib/components/Menus/ThemeMenu.tsx:44` | No importer. `Account/AccountMenu.tsx:71` defines its own local `ThemeMenu`; it does not import this file. |
| `frontend/src/lib/ui/HoverCard/HoverCard.tsx:25` | Local named exports, but no importer. Desktop HoverCard-related imports refer to other components. |
| `frontend/src/scenes/dashboard/NewDashboardModal.test.tsx:108` | Only its own diagnostic strings match the filename stem; no importer. It is a test file. |
| `frontend/src/scenes/terminal/TerminalPanel.tsx:63` | **Dynamic import** in `frontend/src/scenes/terminal/TerminalDock.tsx:10`; no static importer. |
| `products/desktop/apps/code/src/renderer/features/task-detail/components/TaskInput.css:4` | No reference to this stylesheet. TaskInput component imports resolve to a different package's TSX component. |

The story glob is explicit in `common/storybook/.storybook/main.ts:35–40`. No require or stylesheet-import consumer of these ten target files was found. No failed static-importer check was excluded from either sample.

## Separate docs-card check

**Zero eligible cards across all three repositories.** There are no docs-rule cards now labelled “No static importer found”, so five such cards could not be inspected for package-entry exports. This is not a five-card precision pass, and no conclusion about external package consumers is claimed.

| Repository | Undocumented component cards | Reached | Unresolved | No static importer found |
|---|---:|---:|---:|---:|
| Primer | 40 | 39 | 1 | 0 |
| PostHog | 217 | 201 | 16 | 0 |
| Excalidraw | 0 | 0 | 0 | 0 |

Remaining unresolved cards are intentionally retained. Aggregate display lists are still not evidence of complete membership. The implementation did not suppress package exports or change report renderers to improve these counts.

## B: evidence-reader review and compatibility

Searched `src/` for every `evidence` use before attaching the field, then inspected the named consumers. The only direct reader of **Finding.evidence** is `src/core/finding-dimensions.ts`; other similarly named evidence fields have different types.

| Consumer | Effect of B |
|---|---|
| `finding-dimensions.ts` / `annotateFindings` | Now annotates each missing-fallback occurrence, including repeated references on the same source value, with reach state and recorded intent. Totals and reach labels can change. |
| `commands/fix.ts` / `planFixes`, `inspectFixes`, `fix` | Does not read findings. Independently extracts CSS declarations and resolves direct literals; behavior unchanged. Before/after planned edits were deeply equal: Primer **2**, PostHog **15**, Excalidraw **0**. No fixes were written to the public repos. |
| `core/token-suggestions.ts` and rule suggestion construction | Operate on extracted values/token context, not Finding.evidence. Existing suggestion data compared equal in the real runs. |
| `core/report-html.ts` / `examples` | Reads `data`, then `suggestion`; does not read Finding.evidence. Existing short examples unchanged. Its reach display reads dimensions and improves automatically; full evidence inspection includes the new field. |
| `core/audit-summary.ts` / `findingLocations`, used by consult | Reads `data` and `where`; existing sample locations unchanged. |
| `core/consult.ts`, `core/consult-html.ts` | Consult claims have their own agent-authored Evidence references; unaffected. Engine finding reach labels consume dimensions and improve automatically. |
| `core/report-data.ts`, audit JSON, embedded report payloads | Losslessly carry findings through object spreading/serialization. New evidence is retained; payloads are larger. No schema key was renamed or removed. |
| `core/proposal.ts`, `commands/decide.ts`, doctor/category/token-architecture evidence | Separate proposal, decision, documentation or extraction evidence; do not consume Finding.evidence. No change. |

For every finding in all three real runs, `ruleId`, `summary`, `where`, `fix`, `data` and `suggestion` compared deeply equal before/after. Missing-fallback evidence lengths equal `data.count`: Primer **2,211**, PostHog **3,255**, Excalidraw **642**. The unit test additionally pins the literal stable output and the 40-hit cap with 44 references, including two references per value and an excluded nested fallback slot.

## Validation and limitations

- Baseline: **365 tests**, 364 passed, 1 failed with EPERM writing the dashboard cache. The worktree's pre-existing `node_modules` symlink pointed into another checkout outside the writable sandbox.
- Temporarily replaced that symlink with local links to the same dependency children and a worktree-local cache. No dependency versions changed. Restored the original symlink and removed the temporary cache after validation.
- Final: `npm run check && npm run type-check && npm test` passed; **369 tests, 369 passed**, zero skipped. `git diff --check` passed.
- No edits to renderers, README, guide, site, benchmarks, or benchmark script. No network access, commits, branches, staging, or other git writes. Read-only git operations established baselines and snapshot revisions.
- The precision sample is not an exhaustive importer audit. Dynamic imports, HTML links and Storybook globs demonstrate why the label must remain “No static importer found”. The five-docs-card export check remains unverified because there were no eligible cards.
