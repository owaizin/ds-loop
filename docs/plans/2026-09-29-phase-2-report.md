# Phase 1.5 + 2 implementation report

Implemented Part A (report craft) first, then Part B (live dashboard). No Git-writing
commands were issued in the working repository. No engine dependency, network call,
model call, watcher or server was added.

## Part A — report craft

- Consulting HTML now says `DESIGN SYSTEM LOOP / SYSTEM REPORT`, with its source
  label and date. The terminal banner and ordinary audit HTML title retain their
  existing command identifiers and compatibility tests.
- Added an opening cover with product, source, date, plain verdict, and colour,
  spacing and typography tokenization ratios. Unavailable ratios say `not checked`.
- Expanded the document to a centred 1440px maximum layout: prose has a 68ch
  measure, evidence spans the available width, and judgement sections have distinct
  surfaces. Sections have numbers, standfirsts and ruled boundaries.
- Proposal lanes sit at equal weight side by side on wide screens and stack on
  narrow screens. Proposed boxes have dashed boundaries, the existing status legend
  remains, and replacement boxes retain their `Changes:` labels and evidence.
- Plan steps show order, effort, changes, rationale and verification. The schema
  accepts optional effort text; omitted effort says `not estimated`. The synthetic
  consultation example explicitly labels its effort estimates as illustrative.
- Added 18mm print margins, a separate cover page, section page breaks and heading
  and plan-step break controls. Retained every coverage and unsupported-claim label.
- Reports, consumer diagrams and dashboards share offline violet palettes and
  typography in `src/core/visual-system.ts`. Manrope is first in the heading stack;
  system fonts are the offline fallback. No font fetch is required.

## Part B — live dashboard

`ds-loop dashboard [path] [--out file.html]` writes `ds-loop-dashboard.html` by
default. It combines a fresh unfiltered audit and consumer analysis with saved
`.ds-scorecard/history.jsonl` rows from the working directory. It never appends a
row. Shared row construction was extracted from scorecard so the current state
uses the same ratio and instrument fields.

The dashboard includes the verdict, category tokenization, production shared-component
share per package, findings by theme and coverage. Inline SVG charts use dates for
horizontal position and ratios for vertical position. Each series has a native
disclosure containing all saved dates, values, coverage and comparison labels.
Today's state is separate from history. No raw finding count is used as a headline.

Zero or one saved row shows today's state alone and a baseline command. Missing
values break lines and remain `not checked`. Invalid JSON, invalid records,
out-of-order dates and out-of-range chart ratios suppress the trend explicitly.
History uses the existing source-label convention; it does not identify full paths
or scan scopes, and that limitation is displayed and documented.

The existing scorecard `comparability` function controls every chart segment.
Adapter, configuration and consumers-analysis changes produce
`instrument changed — not a comparison`, with dashed dividers and no connecting
line. A mismatch between today's instrument and the latest saved row is also
announced.

The guard refreshes existing dashboards after edits, including non-style files.
A local cache records each generated dashboard's output, target and explicit
configuration path. Removed dashboards are skipped. Without the cache, the default
project dashboard is refreshed against the project root. A refresh failure reports
staleness, preserves the previous file, and does not alter the hook's coverage
notification policy. Scoped finding checks remain limited to their existing formats.

README and guide documentation include captured command output registered in
`test/readme.test.ts`, dashboard commands and limits, and a CI snippet that preserves
`audit --require-coverage` as the gate while regenerating/uploading the HTML even
when the audit fails. Both command inventories include dashboard.

## Main files

New:

- `src/commands/dashboard.ts`
- `src/core/dashboard-html.ts`
- `src/core/visual-system.ts`
- `test/dashboard.test.ts`

Updated:

- `src/cli.ts`, `src/commands/scorecard.ts`
- `src/core/consult-html.ts`, `src/core/consult.ts`, `src/core/proposal.ts`
- `src/core/report-html.ts`, `src/core/report-html-assets.ts`, `src/core/consumers-html.ts`
- `skill/hooks/ds-loop-guard.mjs`, `skill/SKILL.md`, `skill/templates/consult.example.json`
- `test/consult-report.test.ts`, `test/readme.test.ts`
- `README.md`, `docs/guide/reference.md`, `docs/guide/output.md`

## Verification

All required checks pass:

```text
npm run check       — passed; 136 files checked
npm run type-check  — passed
npm test            — passed; 235 tests, 0 failures
```

`npm run build` also passes. Dashboard regression tests cover zero, one and many
rows; every instrument-change type; missing values; invalid and unmatched history;
HTML escaping; default/custom command outputs; preservation of saved history;
guard refresh after style and non-style edits; preserved custom targets; and
refresh-failure feedback with preservation of the last HTML. Report tests cover the
cover, print margin, architecture lanes and effort labels alongside the prior
honesty, escaping, section-order and offline-script checks. Existing naming and
terminal-output verification tests were preserved.

The first full run found a missing argument in a new test and compatibility failures
in command inventories and the audit HTML title's source contract. All were fixed
before the passing final run.

## Review artifacts

Generated from the final code under ignored `scratch/phase-2/`:

- `report-cover.html` — full CSS example report with consultation content.
- `dashboard-empty.html` — today's measured CSS example state, without history.
- `dashboard-trend.html` — example workspace with explicitly labelled synthetic
  history and an instrument boundary; today's state is measured.
- `generate.mjs` — reproduces all three with a temporary history directory that it
  removes afterward. No synthetic history was written into the repository's
  `.ds-scorecard/`.

Reproduce locally:

```sh
node --experimental-strip-types scratch/phase-2/generate.mjs
```

The ordinary commands are:

```sh
npm run ds-loop -- report fixtures/css-audit-example --consult skill/templates/consult.example.json --out scratch/phase-2/report-cover.html
npm run ds-loop -- dashboard fixtures/css-audit-example --out scratch/phase-2/dashboard-empty.html
```

The consultation example is a synthetic workspace scenario, not a diagnosis of the
CSS fixture; its agent-cited references are not independently verified. The report
retains that evidence boundary.

## Visual verification limitation

Browser visual verification could not be completed. The available browser rejected
local `file:` URLs under its security policy. The sandbox also denied binding a
localhost server. No restriction was bypassed. Responsive rules, theme controls,
inline-script syntax, offline assets and print CSS were checked in source/tests;
this does not establish rendered quality at 375px/1440px, theme contrast or PDF
pagination. Those browser and print checks remain for a permitted review environment.
