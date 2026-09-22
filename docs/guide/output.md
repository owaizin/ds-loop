# Reading an audit

These excerpts are checked against the engine by `test/readme.test.ts`. Line wrapping and marked truncation are permitted; the output vocabulary is unchanged.

The `│` gutter groups the lines of one finding and is always emitted. In a terminal, long `where:`, `risk:` and `fix:` lines wrap to the window width and continue under their label; piped or redirected output keeps each on one line, so a captured log and these excerpts stay comparable. Colour follows the same rule — severity tags are coloured only on a terminal, and `NO_COLOR` turns that off.

## Public fixture: Radix Colors

From the repository root, run `npm run ds-loop -- audit fixtures/radix-colors`. The frozen source and provenance are in `fixtures/radix-colors/SOURCE.json`. Findings need investigation: proximity between two palette steps does not prove one should be deleted.

<!-- verified: audit-radix -->
```
  ds-loop audit — Radix Colors  ·  target: all  ·  fixture
  version npm:@radix-ui/colors@3.0.0   adapter css-custom-props@0.3.0   config 4cdd7f44
  12 rules run

  [LOW] color/near-duplicate-primitives
  │ 20 pair(s) of palette primitives are within ΔE 2.3 — below a reliable just-noticeable difference
  │ where: --amber-1 ≈ --blue-1 (ΔE 2.252285); --amber-1 ≈ --green-1 (ΔE 1.956419) …
  │ risk:  Nobody can tell these steps apart on screen, so authors pick between them at random …
  │ fix:   Confirm each pair is a deliberate ramp step. Collapse the ones that are not.

  [LOW] color/no-intent-plateau
  │ no ΔE band holds a cluster count within 15% of the 72 shipped primitives
  │ where: swept ΔE 0.5–12

  2 findings — 0 blocking · 0 high · 0 medium · 2 low

  scope — what this audit read
    css-custom-props@0.3.0
      reads .css — custom-property declarations (--token: value) — not rule bodies
    72 colour value(s) this version cannot convert:
      color(display-p3 0.995 0.992 0.985), color(display-p3 0.994 0.986 0.921) …
      excluded from every colour rule — a gap in the engine, not in your code

  scorecard ratios
    literal-colors-per-distinct  1
    colors-per-distinct-in-scope 1
    ambiguous-share              0.5
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
