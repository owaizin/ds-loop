# Phase 12 implementation report — 2026-09-30

Implemented the engine and terminal evidence dimensions. **The entire section F acceptance gate is
not complete:** visible HTML pairing belongs to the protected renderers, and the public-repository
runs did not produce a sample eligible to validate the “no static importer found” branch. Neither
limitation is a passing result.

## Changes

- `consumers.ts` now exposes its existing masked import lexer. Consumers and impact keep their
  existing package resolution; `file-imports.ts` extends that shared lexer with file resolution.
  There is no second import parser. The brief overstated the existing implementation: consumers
  and impact resolve package names, not a file graph, relative paths, or alias targets.
- File evidence uses `reached`, `no-static-importer`, and `unresolved`, with importer file, line,
  and specifier, unresolved specifiers, config failures, analysis version, and explicit limits.
  Static imports and direct re-exports count. This is incoming-edge evidence, not an entry-point
  traversal. Type-only imports also count; no runtime claim is made.
- Relative paths, source-extension substitutions, directory indexes, nearest tsconfig/jsconfig,
  relative config inheritance, `paths`, `baseUrl`, and explicit workspace source entrypoints are
  supported. Dependencies and Node built-ins are distinguished from unknown aliases.
- Any unresolved static specifier or incomplete config makes files without a confirmed importer
  `unresolved`. This is intentionally conservative across the whole scanned tree. Single-file
  audits also report uncertainty rather than implying their importer tree was checked.
- Literal markup, stock palette, ordinary CSS, semantic color and dimension findings carry complete
  source evidence. Their annotations retain all occurrences, including ones beyond old display
  caps. Other aggregate rules explicitly report unresolved location membership, not zero.
- `Finding.dimensions` separates importer evidence, recorded intent, and domain hints. Each has its
  own basis. Mixed groups retain per-location annotations and all/reached occurrence counts.
- `AuditReport.findingEvidence` retains pre-exception, pre-severity evidence. Existing `findings`,
  suppression behavior, verdicts and historical ratio meanings are preserved. The new view also
  re-extracts values without the existing non-color hint exclusion, so hinted color findings remain
  inspectable. It does not carry token suggestions a second time. `findingTotals` counts groups;
  a group counts as reached if at least one location has an importer. These group totals are not a
  partition of occurrence counts.
- Config exceptions name `config.ignore[index]` and its reason. Accepted decisions name their
  `docs/decisions/*.md` file and title. Evidence links alone do not establish intentionality.
  Decisions need explicit `## Covers` JSON selectors, written by `decide --covers` or its API:

  ```sh
  ds-loop decide . --decision 'Keep chart colors' --alternatives 'Theme tokens' \
    --owner Design --evidence chart.css \
    --covers '[{"rule":"token/raw-value-in-style","files":["chart.css"]}]'
  ```

  Selectors require a rule and exact files; optional `value` narrows the match. Proposed decisions
  do not mark findings intentional. Matching reuses `applyIgnores`.
- Domain annotations match configured `taxonomy.nonColorTokenHints` against color token names and
  selectors. They say “hint matched”, not that product intent was inferred. No new default chart
  vocabulary or thresholds were added.
- Source ratios gain `:reached` keys; original keys use the original values and formulas.
  `reachedRatios` pairs original keys with a number or `null` when no reached denominator exists or
  the ratio is not file-based. `reachedStyleInventory` is additional evidence. Documentation ratios
  have no reached-file interpretation and therefore get `null`, not a fabricated zero.
- Terminal summary and `--all` show all/reached evidence together; `next` remains last. Full output
  includes per-finding annotations and paired source ratios. Scorecards retain historical headline
  counts and add reached occurrence counts, evidence totals and the graph version.
- A pre-existing token-architecture limit used a prohibited word. Its wording now states that
  references outside the scope are not checked, without changing the analysis.

## Public-repository runs and hand review

Ran full audits on the local Primer and Excalidraw checkouts, and a full file-import analysis on
PostHog. No network or source changes were needed. Working diagnostics are under
`/tmp/phase12-{primer,excalidraw}-audit.json` and `/tmp/phase12-posthog-graph.json`.

| Tree | Files with importer | Unresolved files | No-static-importer files | All finding groups | Groups with reached locations |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primer | 653 | 789 | 0 | 55 | 13 |
| Excalidraw | 592 | 284 | 0 | 20 | 13 |
| PostHog (graph only) | 12,929 | 9,351 | 0 | — | — |

**15 target files opened by hand:** six confirmed-importer results and nine unresolved files.
All six confirmed-importer results had the reported importer: **0 wrong out of 6**. One unresolved
file had a static importer through an unsupported build alias; it correctly remained unresolved.
The other eight had no static JS/TS importer found in the manual search; several clearly have other
loading mechanisms. This does not establish their runtime status.

The “no static importer found” precision sample is **0 checked / 0 available**, not “100% accurate”.
The conservative third state prevents a misleading absence claim but currently has poor coverage
on these monorepos. This gate needs another iteration before claiming validated absence precision.

Hand-opened targets and the source evidence checked:

| Tree / target | Report state | Manual evidence |
| --- | --- | --- |
| Primer `examples/codesandbox/src/main.tsx` | unresolved | `examples/codesandbox/index.html:11` loads it as a module script |
| Primer `examples/nextjs/src/app/layout.tsx` | unresolved | Next layout export; no static importer found in search |
| Primer `packages/react/src/ActionBar/ActionBar.stories.tsx` | unresolved | Story exports; no static importer found in search |
| Primer `packages/postcss-preset-primer/src/mixins/buttonReset.css` | unresolved | PostCSS mixin; test invokes `@mixin buttonReset` |
| Primer `packages/react/src/Button/Button.tsx` | reached | `Button/index.ts` re-exports `./Button` |
| Primer `packages/react/src/ActionBar/ActionBar.tsx` | reached | `ActionBar/index.ts` re-exports `./ActionBar` |
| Excalidraw `dev-docs/src/css/custom.scss` | unresolved | `docusaurus.config.js:44` uses `require.resolve` |
| Excalidraw `packages/excalidraw/css/theme.scss` | unresolved | Sass theme source; no JS/TS static importer found in search |
| Excalidraw `packages/excalidraw/css/variables.module.scss` | unresolved | Sass `@use` / `@forward` from `theme.scss` and other styles |
| Excalidraw `packages/excalidraw/components/TTDDialog/Chat/Chat.scss` | unresolved | Sass `@use` from `TTDDialog.scss:2` |
| Excalidraw `dev-docs/src/components/Homepage/index.tsx` | unresolved | `dev-docs/src/pages/index.tsx:3` imports via `@site/src/components/Homepage` |
| Excalidraw `packages/excalidraw/components/TTDDialog/TTDDialog.scss` | reached | `TTDDialog.tsx:16` statically imports its stylesheet |
| Excalidraw `dev-docs/src/components/Homepage/styles.module.css` | reached | Homepage `index.tsx:4` statically imports it |
| PostHog `frontend/src/scenes/App.tsx` | reached | `ExperimentFrequentistFiveVariants.stories.tsx:16` imports `~/scenes/App` |
| PostHog `frontend/src/lib/components/AccessControlAction.tsx` | reached | `SidePanelExports.tsx:6` imports `lib/components/AccessControlAction` |

PostHog resolution found **158 `~/scenes/…` imports and 3,978 `lib/components/…` imports**. These
aliases are declared in its root tsconfig and inherited by the frontend config.

Unresolved forms encountered include Primer imports of generated/dist package entrypoints and
undeclared dependencies; Excalidraw's Docusaurus `@site`, `@theme`, `@theme-original`, virtual PWA
specifier and package-based tsconfig inheritance; PostHog's package-based configs under desktop
packages and the Stripe app. Dynamic imports, require calls, HTML module scripts, route discovery,
globs, CSS/Sass imports, build aliases, wildcard package exports and generated output are outside
this resolver. The regex lexer inherits the existing consumers syntax ceiling.

## Validation and remaining work

- `npm run check`: passed.
- `npm run type-check`: passed.
- `npm run build`: passed.
- `npm run smoke`: 31 checks passed, using `npm_config_cache=/tmp/phase12-npm-cache`. The initial
  default-cache attempt failed at `npm pack` under the filesystem restrictions.
- Final focused verification: 78 tests passed across the new feature, CSS compatibility, consumers,
  next actions, README samples, exceptions and scorecards.
- Eight new tests cover additive ratios, all-occurrence retention, explicit decisions, exceptions,
  domain hints, alias inheritance, source extension mapping, unresolved imports, scoped scans,
  old sample caps, and forbidden claims across JSON, summary and full terminal output.
- The existing Tailwind compatibility test still compares every historical field byte-for-byte;
  it now excludes the new additive evidence/dimensions fields alongside suggestions.
- `npm test` was attempted with a temporary Git wrapper that rejects writes. Six tests create and
  commit fixture repositories; the no-write instruction takes precedence. Appended skip arguments
  were ignored by this Node/npm invocation, so these were excluded in the subsequent direct Node
  test-runner invocation with flags before the file glob. No Git write succeeded.
- The permitted suite ran 349 tests: 347 passed and two failed in `test/report-html-interaction.test.ts`: the lazy-browsing
  and loader/hydration tests both fail in `skinPicker.onchange` reading an absent `dataset`. The
  protected renderer files changed externally during this run. They were not edited here.

Not completed from section F:

1. The protected HTML renderers and `audit-summary.ts` were not edited. JSON (including embedded
   report evidence) and terminal annotations are available, but every existing visible HTML count
   is not yet paired with its reached count. This needs integration by the task that owns those files.
2. The public-repository absence-label precision gate has no eligible sample. The unresolved state
   is deliberately broad; narrowing it without suppressing uncertain evidence needs further work.
3. Aggregate findings without complete source provenance remain explicitly unresolved. Reached
   documentation ratios are not implemented because documentation presence is not a file-import
   metric. No aggregate membership or intent was guessed from a truncated display string.
4. The exact full test gate cannot run under the instruction forbidding Git writes and commits.
   Six Git-mutating fixtures are excluded, and the two protected-renderer failures remain for their
   owner. This is not a claim that the complete acceptance chain passed.

No commits, staging, branches, Git configuration changes, or writes to `.git` were made. None of
the nine “Do not touch” files was edited by this task. Other work already in this checkout was
preserved.
