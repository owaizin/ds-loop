# Phase 5b brief for Codex — CSS-wide keywords are not hard-coded values

Read `CLAUDE.md` first, especially the precision-gate paragraph under "Adding a rule". No git writes.

## The defect

I ran the new SCSS adapter over Excalidraw (`packages/`, a public repo nobody here wrote) and
hand-checked the reported locations. One high-severity `token/raw-value-in-style` group of 78 hits
has **5 of its 9 shown samples reporting `transparent`**:

```
background-color: transparent   (excalidraw/components/Actions.scss:206)
background: transparent         (excalidraw/components/Actions.scss:223)
border-color: transparent transparent var(--popup-bg-color) ...
```

`transparent` is a CSS-wide keyword. **No design token replaces it**, so telling a team it is a
hard-coded style they should tokenize is a false positive. This is the same defect class
`CLAUDE.md` already records — geometry utilities counted as scale bypasses, 241 hits and 239 of
them wrong — and it was invisible in unit tests, exactly as that paragraph predicts.

## The fix

1. **Classify CSS-wide keywords as `excluded`, with a reason** — never `literal`, and never
   silently dropped. At minimum: `transparent`, `currentColor`, `inherit`, `initial`, `unset`,
   `revert`, `revert-layer`, `none`, `auto`. Case-insensitive. A value that is a keyword **in part**
   (`border-color: transparent transparent var(--x) var(--x)`) must classify each component, so the
   keyword parts are excluded and any genuine literal in the same declaration still reports.
2. **Put the list in one place** — `core/literals.ts` is where adapters already agree about value
   shapes, so it belongs there, not duplicated per adapter. Every adapter (CSS custom props, CSS
   rule bodies, SCSS, Tailwind, token JSON) must use it, because this is not an SCSS-only bug —
   verify whether the CSS adapters already had it and say so in the report.
3. **`system-ui`, `sans-serif`, `serif`, `monospace`** and the other generic font families are the
   same case for typography: a generic family is not a hard-coded typeface. Handle them, and say
   in the report which you added.
4. **Coverage must show the exclusion**, per the three-outcomes rule. A reader should be able to see
   that keywords were recognised and set aside, not that they were never seen.
5. **Watch the ratios.** Excluded values sit outside the tokenization denominator already, so this
   will move measured ratios. That is correct, but it means the benchmark corpus was measured with
   the defect in it: `benchmarks/reference.json` must be re-measured afterwards. Do not hand-edit
   those numbers; re-run `scripts/benchmark.mjs` if the network allows, and if it does not, say so
   plainly in the report so the reviewer re-runs it.

## The precision gate, properly this time

The brief for phase 5 asked for measurement on public repos and it did not happen, because the
sandbox has no network. Do the part you can do without it:

- Build frozen fixtures from the real patterns found above (keyword-only declarations, mixed
  keyword-and-literal declarations, generic font families) and pin them as regression tests.
- State in the report, in one line, that the false-positive rate on public repos is still
  unmeasured by you and names the repo the reviewer should re-run.

## Acceptance

- `check`, `type-check`, `test` pass, with tests for each keyword class and the mixed-value case.
- `docs/plans/2026-09-29-phase-5b-report.md` records: the keyword list, which adapters were already
  correct, which were not, and the ratio movement you observed on the local fixtures.
