# Read findings and saved reports

Find the source of a finding before changing your code:

```sh
npx ds-loop audit .
```

These excerpts are checked against the engine by `test/readme.test.ts`. Line wrapping and marked truncation are permitted. Summaries use clear words; `--all` and JSON preserve the engine vocabulary.

The `│` gutter groups the lines of one finding and is always emitted. In a terminal, long `where:`, `risk:` and `fix:` lines wrap to the window width and continue under their label; piped or redirected output keeps each on one line, so a captured log and these excerpts stay comparable. Colour follows the same rule — severity tags are coloured only on a terminal, and `NO_COLOR` turns that off.

Use these examples to read [CSS inventory](#ordinary-css-inventory),
[token suggestions](#a-token-suggestion), [coverage gaps](#public-fixture-radix-colors),
[unsupported sources](#unsupported-source), and [changes over time](#comparing-runs).
All marked output is checked against a real command run.

## Ordinary CSS inventory

From the repository root, run:

```sh
npm run ds-loop -- audit fixtures/css-audit-example
```

This independently written Example DS fixture contains a colour literal, a spacing
literal and two references. The inventory precedes severity and exception filters;
its ratio does not prove the references resolve.

<!-- verified: audit-css-inventory -->
```text
  CSS property inventory — extracted, before exceptions and severity filtering
    tokenization = reference-only / (literal + reference + mixed); not reference resolution
    color: 2 occurrences · 2 distinct · 1 literal · 1 reference · 0 mixed · 0 unclassified · 0 excluded · tokenization 50.0%
    spacing: 2 occurrences · 2 distinct · 1 literal · 1 reference · 0 mixed · 0 unclassified · 0 excluded · tokenization 50.0%
```

### A token suggestion

The same run finds an exact colour candidate through a project alias. This is a
review candidate, not permission to replace the value. JSON retains the primitive
candidate too, plus alias provenance and resolution limits.

<!-- verified: audit-css-suggestion -->
```text
  │ suggest:#333: ambiguous — --ds-color-text, --ds-palette-gray-700. Value candidates only; cascade, mode, semantic role and replacement safety are not established. No automatic replacement. Full candidates, alias provenance and resolution limits in --json.
```

## Markup use sites

This independently written JSX example contains three literals.

<!-- verified: audit-markup -->
```
  [HIGH] Hard-coded component styles · token/raw-value-in-markup · 3 hits · Card.tsx:2, Card.tsx:3
```

## Public fixture: Radix Colors

From the repository root, run `npm run ds-loop -- audit fixtures/radix-colors`. The frozen source and provenance are in `fixtures/radix-colors/SOURCE.json`. Findings need investigation: proximity between two palette steps does not prove one should be deleted.

<!-- verified: audit-radix -->
```
  ds-loop audit — Radix Colors · target: all
  2 findings — 0 blocking · 0 high · 0 medium · 2 low
  These checks found possible problems. Their counts are not a quality grade.
  version npm:@radix-ui/colors@3.0.0   adapter css-custom-props@0.6.0   config 1fc1f13c
  15 rules run

  scope — what this audit read
    What we read: .css — custom-property declarations (--token: value) — not rule bodies, not at-rules
    Colours we cannot compare: 72 — color(display-p3 0.995 0.992 0.985), color(display-p3 0.994 0.986 0.921), color(display-p3 0.994 0.969 0.782), color(display-p3 0.989 0.937 0.65)
    Some checks are incomplete. Read the limits before relying on this result.
    Component documentation: not checked — no shared component inventory in scope.
    Documentation presence only, not quality: exported PascalCase JSX declarations in shared workspace or standalone packages; package entrypoints, re-export chains, HOCs without JSX, remote and generated docs are not resolved.
    Stories and docs are matched by adjacent component/source basename. Types recognize ComponentNameProps declarations or prop-table markers in matched docs; examples recognize literal component JSX in matched stories/docs. Prop tables, inferred types and differently named pages may be missed.
    Ratios use detected components in each package. Documented means a matched story or docs page. Without a local documentation convention, a denominator, or on a file-filtered scan: not checked, never 0% documented.

  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [LOW] Very similar palette colours · color/near-duplicate-primitives · 1 finding · no file:line recorded
  [LOW] Palette structure needs review · color/no-intent-plateau · 1 finding · no file:line recorded

  next
    ds-loop audit fixtures/radix-colors --all   full findings, risks, fixes and token suggestions
    ds-loop report fixtures/radix-colors        save a consulting report with evidence and next steps
    decide on the rest                          nothing here is mechanically provable — all 2 findings state their choice on the fix line
    ds-loop scorecard fixtures/radix-colors     pin these ratios as run 1 — a ratio only says something against a previous row
    ds-loop guard on                            report high-severity findings after each Claude Code edit (never blocks)
```

The report includes the display-p3 values the color rules could not convert. A reported finding does not imply full coverage.

## Unsupported source

This example contains a Vue template and a Less variable. No adapter reads either format.

<!-- verified: audit-not-checked -->
```
  ✗ not checked — no adapter reads any styling format found here.

  scope — what this audit read
    not read at all: 1× .vue, 1× .less — no adapter handles these
    formats present: 1× .vue, 1× .less

  This is not a clean result. Nothing was judged.
```

Without `--require-coverage`, a not-checked report can exit 0. Read the verdict and coverage.

## Comparing runs

This synthetic example replaces duplicate declarations with references, then runs `scorecard` again. The date identifies the recorded run. Adapter versions and configuration must match before a delta is reported.

<!-- verified: scorecard-delta -->
```
  since 2026-09-17

    literal-colors-per-distinct    2 → 1  ▼ 1
    colors-per-distinct-in-scope   2 → 1  ▼ 1
    ambiguous-share                0 → 0  unchanged

  by rule
    color/literal-duplicate-tokens               1 → 0  ▼ 1
    color/semantic-holds-literal                 4 → 0  ▼ 4
    token/tier-model-undetectable                0 → 1  ▲ +1
```

The new references use names the configured taxonomy cannot classify. The lower duplicate ratio does not establish a better system: the tier check now cannot judge. A scorecard describes the extracted source; it is not a maturity score or a CI gate.

[Back to the guide](README.md)


## Consulting report generation

From the source checkout, run:

```sh
npm run ds-loop -- report fixtures/css-audit-example --out scratch/phase-1/css-report.html
```

<!-- verified: guide-report-css-example -->
```text
  ds-loop report — ds-loop
  wrote scratch/phase-1/css-report.html
```

Open the written HTML for findings, architecture and coverage. Without
`--consult consult.json`, the assessment and plan are labelled as not written yet.
The banner uses the source label; this fixture resolves to `ds-loop`.

## Dashboard generation

```sh
npm run ds-loop -- dashboard fixtures/css-audit-example --out scratch/phase-2/dashboard-empty.html
```
The following is captured command output; dates and ratios are in the generated
HTML. With no saved history, the dashboard shows today's measured state and the
baseline command.

<!-- verified: guide-dashboard-css-example -->
```text
  ds-loop dashboard — ds-loop
  wrote scratch/phase-2/dashboard-empty.html
```

## Limits

`report` and `dashboard` write artifacts; successful generation isn't a clean
audit or a CI pass. Run `audit --require-coverage` for that policy. Dashboard
samples above were captured in an empty temporary working directory with the
fixture passed by absolute path, so no saved history affected the result. The
report sample used the same setup. Dates and ratios belong to the generated HTML.


## Save a report

From a source checkout: `npm run ds-loop -- report fixtures/css-audit-example --out scratch/phase-1/css-report.html`.

<!-- verified: report-css-example -->
```text
  ds-loop report — ds-loop
  wrote scratch/phase-1/css-report.html
```


## Measure shared-component usage

From a source checkout: `npm run ds-loop -- consumers fixtures/example-workspace --scope @example/ui`. This invented workspace is not an adoption benchmark.

<!-- verified: consumers-example -->
```text
  @example/dashboard: shared-component share 75.0% · shared 3 · local 1 · external 0 · unresolved 0 · stories/tests 1 JSX elements
```


## Open a dashboard

From a source checkout: `npm run ds-loop -- dashboard fixtures/css-audit-example --out scratch/phase-2/dashboard-empty.html`.

<!-- verified: dashboard-css-example -->
```text
  ds-loop dashboard — ds-loop
  wrote scratch/phase-2/dashboard-empty.html
```
