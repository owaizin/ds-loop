# Phase 6 report — govern, document, communicate

Implemented the four engine features from the Phase 6 brief. The public-repository
precision gate remains **not measured**, because repository network access failed.
No false-positive rate is claimed.

## Delivered

- **Documentation coverage:** `src/rules/docs.ts` detects exported PascalCase JSX
  declarations, including local export lists, in shared workspace packages and
  standalone packages declaring exports. Shared workspace packages have exports or
  observed workspace consumers. Per-package ratios cover stories, adjacent
  Markdown/MDX pages, prop types/table markers and literal JSX examples. A component
  with a story or page contributes to the documented ratio. Evidence carries
  file:line locations. No detected documentation convention or denominator, read
  failure, and file-filtered scans yield not checked, never zero documented.
- **Rule and coverage integration:** `docs/undocumented-shared-component` is low
  severity and routes through `audit --target docs` and the normal unfiltered audit.
  It lists and locates detected components without an adjacent story/page. Audit
  JSON, coverage, scorecard ratios and consulting HTML include the measurements and
  limits. The rule cites Carbon’s [published contribution requirements](https://carbondesignsystem.com/contributing/get-started/overview/#website-documentation),
  which require component documentation. This engine checks presence, not Carbon’s
  full documentation checklist or documentation quality.
- **Deprecation impact:** `ds-loop impact <specifier> [path] [--json]` uses
  `analyseConsumers` and returns every direct static import location, separated
  into production and stories/tests. Queries accept exact package subpaths, bare
  export names or `package/subpath#Export`; aliased imports retain the original
  name. Existing five-sample summaries remain, alongside a complete occurrence
  list. Commented and quoted import examples are excluded. The consumers version
  is now `0.3.0`, so changed measurements break historical comparisons.
- **Decision records:** `ds-loop decide` requires decision, alternatives, evidence
  refs and owner, and records a validated UTC date. Optional status, problem,
  consequences and reconsideration trigger support the governing playbook.
  Exclusive file creation prevents overwriting earlier decisions. `context`
  locates records and prints their titles/statuses. The playbook and command
  reference now describe the same mechanism.
- **Adoption reporting:** `report` reads cwd’s `.ds-scorecard/history.jsonl`, matches
  the audited source label, and reports the period, recorded-run count, and
  baseline/latest ratios. Scorecards now include CSS category ratios per workspace
  package and documentation ratios. One run is a baseline, not a trend. Any
  adapter/config/consumer/docs instrument change during the recorded period
  suppresses comparison, including intervening changes with matching endpoints.
  Missing ratios remain not checked. Invalid rows, unreadable history or reversed
  dates cannot produce a comparison. Report generation does not append history.
  Documentation instrumentation is also respected by audit HTML/dashboard history.

## Verification

Tests cover all four features, including CLI/report integration, more than five
impact locations, production/story separation, aliases, no-docs/scoped coverage,
local exports and prop tables, unique ADR filenames, invalid dates/owners,
context discovery, instrument changes, missing ratios, malformed history, and
report generation without history mutation.

Final verification on 2026-09-29:

| Required command | Result |
| --- | --- |
| `npm run check` | Passed; 158 files checked, no fixes required |
| `npm run type-check` | Passed; `tsc --noEmit` |
| `npm test` | Passed; 283 tests, 0 failures, 0 skipped |

The five Phase 6 test files add 11 tests. The verified-output test suite also
passed with the updated sample. `git diff --check` passed (read-only inspection).

The existing verified audit sample in `docs/guide/output.md` was updated from the
observed output to reflect the additional rule. Both CLI command tables were
updated. `npm run check` also exposed pre-existing formatting failures in
`benchmarks/reference.json`; formatting was corrected and parsed JSON equality
was verified before/after, preserving every measurement.

## Public-repository precision gate

On 2026-09-29, attempted:

```sh
curl -I --max-time 15 https://github.com/radix-ui/primitives
```

The command exited 6: `Could not resolve host: github.com`. Network access for
fetching a public repository was unavailable in the shell. The separate web tool
could verify Carbon’s documentation requirement, but that is not an engine run on
a public checkout and does not satisfy the precision gate.

| Measurement | Public-repo run | Hand-checked public hits | False-positive rate |
| --- | --- | --- | --- |
| Documentation coverage | Not performed: repository fetch unavailable | Not measured | Not measured |
| Deprecation impact | Not performed: repository fetch unavailable | Not measured | Not measured |

Synthetic tests establish the supported behavior; they do not establish public
precision. Before calling these checks calibrated, run both on an independently
authored public checkout, pin its revision, and record hand-checked hit counts and
misclassifications. This acceptance gate remains open.

## Boundaries

Documentation recognition uses regexes, adjacent filenames and specific type/table
markers. Package entrypoint graphs, barrel re-exports, HOCs without JSX, remote or
generated docs, inferred prop types and differently named pages are not resolved.
The denominator is detected exported components, not a claim of complete API coverage.

Impact is static workspace import evidence. Re-export chains, dynamic imports,
require calls, namespace member usage, cross-package relative paths, aliases,
external consumers and runtime composition are unresolved. The unconsumed-export
list retains the broader existing consumers calculation, including literal dynamic
specifiers. A zero result says no static import found, never safe to delete.

History is matched by source label, as in existing scorecards; identically named
sources must not share a history file. Ratios and dates describe static source
measurements, not savings or productivity. Records preserve choices and proposals;
they do not grant approval or change enforcement.

No Git command that writes inside this repository was run. Read-only Git inspection
was used; no branch, index, commit, reset, checkout or staging operation was performed.
