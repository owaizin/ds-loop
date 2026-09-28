# Reading an audit

These excerpts are checked against the engine by `test/readme.test.ts`. Line wrapping and marked truncation are permitted; the output vocabulary is unchanged.

The `│` gutter groups the lines of one finding and is always emitted. In a terminal, long `where:`, `risk:` and `fix:` lines wrap to the window width and continue under their label; piped or redirected output keeps each on one line, so a captured log and these excerpts stay comparable. Colour follows the same rule — severity tags are coloured only on a terminal, and `NO_COLOR` turns that off.

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

## Public fixture: Radix Colors

From the repository root, run `npm run ds-loop -- audit fixtures/radix-colors`. The frozen source and provenance are in `fixtures/radix-colors/SOURCE.json`. Findings need investigation: proximity between two palette steps does not prove one should be deleted.

<!-- verified: audit-radix -->
```
  ds-loop audit — Radix Colors · target: all
  2 findings — 0 blocking · 0 high · 0 medium · 2 low
  version npm:@radix-ui/colors@3.0.0   adapter css-custom-props@0.5.0   config 530e7067
  14 rules run

  scope — what this audit read
    css-custom-props@0.5.0
      reads .css — custom-property declarations (--token: value) — not rule bodies, not at-rules
    72 colour value(s) this version cannot convert: color(display-p3 0.995 0.992 0.985), color(display-p3 0.994 0.986 0.921), color(display-p3 0.994 0.969 0.782), color(display-p3 0.989 0.937 0.65)
      excluded from every colour rule — a gap in the engine, not in your code

  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [LOW] color/near-duplicate-primitives · 20 pair(s) of palette primitives are within ΔE 2.3 — below a reliable just-noticeable difference · 1 finding · no file:line recorded
  [LOW] color/no-intent-plateau · no ΔE band holds a cluster count within 15% of the 72 shipped primitives · 1 finding · no file:line recorded

  next
    ds-loop audit fixtures/radix-colors --all                        full findings, risks, fixes and token suggestions
    ds-loop audit fixtures/radix-colors --html ds-loop-report.html   save a complete visual report
    decide on the rest                                               nothing here is mechanically provable — all 2 findings state their choice on the fix line
    ds-loop scorecard fixtures/radix-colors                          pin these ratios as run 1 — a ratio only says something against a previous row
    ds-loop guard on                                                 report high-severity findings after each Claude Code edit (never blocks)
```

The report includes the display-p3 values the color rules could not convert. A reported finding does not imply full coverage.

## Unsupported source

This example contains a Vue template and an SCSS variable. Neither adapter reads them.

<!-- verified: audit-not-checked -->
```
  ✗ not checked — no adapter reads any styling format found here.

  scope — what this audit read
    not read at all: 1× .vue, 1× .scss — no adapter handles these
    formats present: 1× .vue, 1× .scss

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
