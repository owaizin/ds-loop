# Phase 1.5 + 2 brief for Codex — report craft, then the live dashboard

Read first: `VISION.md`, `CLAUDE.md`, `DESIGN.md`, `docs/plans/2026-09-29-vision-build-plan.md`,
`docs/plans/2026-09-29-phase-1-report.md`. Branch is already checked out. Run no git command that
writes; the reviewer commits.

Phase 1 shipped the report's structure and honesty. It does not yet look like a document a team
would forward to their CEO. Fix that first, then build the dashboard on the same visual system.

## Part A — report craft

Review of the current output (`ds-loop report fixtures/css-audit-example --consult
skill/templates/consult.example.json`), seen in a browser:

1. **The header says `DS-LOOP / AUDIT REPORT` on a consulting document.** It should read
   `DESIGN SYSTEM LOOP / SYSTEM REPORT`, with the source label and date beside it. The CLI banner
   `ds-loop audit — <label>` is checked by tests and must stay exactly as it is in *terminal*
   output; it is not the HTML document's title and never was.
2. **One narrow left-aligned column, with the right half of the screen empty.** Give the document
   a real grid: a centred measure of about 68ch for prose, full-bleed bands for evidence, and
   two-column layouts where a comparison is being made. Nothing should sit in a 720px column on a
   1440px screen with dead space to its right.
3. **No cover.** Add an opening screen: the product name, the source, the date, the verdict in
   plain words, and the three headline numbers. It is the first thing a reader sees and currently
   it is a heading with body text under it.
4. **Before/after architecture is the weakest part**, and it is the most valuable slide in a
   consulting deck. Make the two states read side by side, at equal weight, with the changed
   boxes visibly marked and a legend. It should survive being screenshotted on its own.
5. **Section rhythm is flat.** Every section looks the same weight. Give each one a number, a
   short standfirst, and clear entry and exit. A reader skimming should be able to tell the
   judgement sections from the evidence sections without reading them.
6. **The plan should read as a plan:** numbered steps, effort and order visible at a glance, and
   what each step changes, why, and how you'll know it worked already present.
7. **Print.** One section per page where it fits, no orphaned headings, and the cover on its own
   page. `@page { margin: 18mm }`.

Constraints: still one self-contained file, still no network requests, still light and dark, still
readable at 375px, still no runtime dependency. Keep every honesty label exactly as it is
("Agent-cited evidence (not independently verified)", "Unsupported — …", "not checked"). Do not
remove a limit to make the page prettier. No emoji, no decorative gradients, no stock iconography.

Take the typography and colour from `DESIGN.md` where it applies and from the existing report
assets, so the report, the consumers diagram and the dashboard are visibly one system. Extract
what the three share into one place rather than copying it a third time.

## Part B — the live dashboard

`ds-loop dashboard [<path>] [--out <file.html>]`, default `ds-loop-dashboard.html`.

- **Purpose:** the report is a moment; the dashboard is the trend. It answers "where do we stand
  and is it getting better" on one screen.
- **Source of truth:** `.ds-scorecard/history.jsonl` for the trend, plus a fresh audit for today's
  state. It never invents a row; with fewer than two rows it says so plainly and shows today's
  state alone, with a line telling the reader how to record the first baseline.
- **Shows:** the verdict; per-category tokenization over time; shared-component share per package
  over time; findings by theme; coverage; and the date of each run. Ratios only, never raw counts
  as the headline, per the repo rule.
- **Honesty:** when `adapters` or `configHash` differ between two rows, the change is labelled
  "instrument changed — not a comparison", reusing the existing scorecard logic. Never draw a
  trend line across that boundary.
- **Charts:** inline SVG, drawn from the data, no chart library and no CDN. Accessible: every
  series has a text equivalent in a table behind a disclosure, and colour is never the only
  channel. Light and dark.
- **Staying current:** `ds-loop guard on` should also refresh the dashboard after an edit when one
  exists, and `audit --require-coverage` stays the CI gate. Document a CI snippet that regenerates
  it. Do not add a watcher process or a server.

## Acceptance

- `npm run check`, `npm run type-check`, `npm test` pass. New tests cover dashboard rendering with
  zero, one and many history rows, and the instrument-changed case.
- Generate into `scratch/phase-2/`: `report-cover.html` (the full report with consult content),
  `dashboard-empty.html`, `dashboard-trend.html` (seed a temporary history file with several rows;
  do not commit a fake history into `.ds-scorecard/`).
- README and `docs/guide/` updated with real captured output, per the verified-sample rules.
- Write `docs/plans/2026-09-29-phase-2-report.md` as before.
