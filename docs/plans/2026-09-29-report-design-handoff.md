# Handoff: improving the look and feel of the ds-loop report

Paste this into the new thread. It is the context, not the plan — the design direction is the new
thread's job.

## What the report is

`ds-loop report` writes one self-contained HTML document: a consulting deck for a team's design
system. It is the product's main deliverable, the thing a lead forwards to their CEO. It was built
today (2026-09-29) as phase 1 of `VISION.md`, and the structure is right while the visual craft is
not yet at the bar the vision sets: "agency-grade, the kind you'd forward to your CEO".

Seven sections, in this order, each numbered with a standfirst:
cover · 01 Summary · 02 The problem · 03 Where you are now · 04 What good looks like ·
05 Where this takes you · 06 The plan · 07 What we couldn't check.

Sections 02, 04, 05 and 06 come from an agent-written `consult.json`. Without one, the report still
works as a state-of-the-system document and those sections say so.

## Where the code is

| File | What it renders |
|---|---|
| `src/commands/report.ts` | the command; runs audit + consumers, writes the file |
| `src/core/report-html.ts` | the audit report shell, findings, inventory |
| `src/core/consult-html.ts` | the consulting sections and the cover |
| `src/core/report-html-assets.ts` | shared CSS/JS, theming, the evidence browser |
| `src/core/token-architecture-html.ts` | token layers, references, health |
| `src/core/consumers-html.ts` | the workspace / import diagram |
| `src/core/proposal.ts` | the before/after architecture diagram |
| `src/core/dashboard-html.ts` | `ds-loop dashboard`, the trend page |
| `DESIGN.md` | the current visual contract (violet on near-black) |

## How to see it

```sh
cd ~/Documents/GitHub/ds-loop
git switch vision/phase-1-consult-report

# full report, with consulting content
node --experimental-strip-types src/cli.ts report fixtures/css-audit-example \
  --consult skill/templates/consult.example.json --out /tmp/r/full.html

# the empty-consult case, and the workspace case
node --experimental-strip-types src/cli.ts report fixtures/css-audit-example --out /tmp/r/no-consult.html
node --experimental-strip-types src/cli.ts report fixtures/example-workspace --out /tmp/r/workspace.html
node --experimental-strip-types src/cli.ts dashboard fixtures/css-audit-example --out /tmp/r/dash.html
```

**`file://` is blocked for the browser tools.** Serve it: `cd /tmp/r && python3 -m http.server 8899`,
then open `http://127.0.0.1:8899/full.html`.

A richer sample is worth making: the fixtures are tiny, so the report looks emptier than a real one.
Run it against a real repo (`/tmp/precision/excalidraw/packages` if still present, or any app) to see
the layout under real volume.

## What I'd fix, from reviewing it in a browser

These are observations, not instructions — disagree freely.

1. **The page is one narrow left-aligned column** with a lot of dead space on the right at desktop
   width. The grid was improved in phase 1.5 but still reads as a document, not a designed report.
2. **The before/after architecture is the most valuable slide in any consulting deck** and currently
   the weakest thing on the page: small cards, low contrast between the two states, easy to miss.
   It should survive being screenshotted on its own.
3. **Section rhythm is flat.** Judgement sections and evidence sections look the same weight, so
   skimming doesn't tell you which is which.
4. **The cover** carries the verdict and three ratios. It's fine, not memorable.
5. **Dense evidence blocks** (coverage, inventory, the limits list in 07) are walls of small text.
   Section 07 in particular is a long bulleted list of every ceiling.
6. **The dashboard** is plainer than the report and should feel like the same product.

## Constraints that are not style preferences

Breaking these breaks the product's integrity, which is the whole pitch:

- **One self-contained HTML file. No network requests at runtime** — no CDN, no web fonts fetched at
  view time, no analytics. Inline everything.
- **No runtime dependency in `src/`.** No chart library, no framework. Charts are hand-drawn inline
  SVG. (This is a hard rule in `CLAUDE.md`: the engine has zero runtime dependencies, no model calls,
  no network.)
- **Never remove or soften an honesty label to make the page prettier.** These are load-bearing:
  - "Agent-cited evidence (not independently verified)"
  - "Unsupported — no evidence refs. This is not an established fact."
  - "not checked" — which is a third verdict, distinct from clean and from issues
  - "instrument changed — not a comparison" on the dashboard
  - coverage limits, and the "could not judge" list
  A clean verdict is only as wide as its coverage, and the width ships with the verdict.
- **Rule ids, rule summaries, `--json`, fix text and the terminal banner `ds-loop audit — <label>`
  stay exactly as they are.** Human-facing text uses `src/core/plain.ts`. Two layers, on purpose.
- **Light and dark**, readable at 375px, and printable — `@media print` with page breaks per section.
- **No client names, no engagement measurements, ever.** Examples are "Example DS", `--ds-*`.
- `test/readme.test.ts` runs documented samples against real output. If terminal output changes,
  regenerate samples by **running the command and pasting**, never by editing a sample to match.

## Verify before calling it done

```sh
npm run check && npm run type-check && npm test    # 289 tests today
```

Then look at all four pages above in a browser, in both themes, at 375px and at desktop width, and
print-preview one. A screenshot of the report is the actual acceptance test — this is a visual
deliverable, so tests passing is necessary and not sufficient.

## State of the repo

Branch `vision/phase-1-consult-report`, 8 commits ahead of `main`, **nothing pushed, 0.4.0 not
published**. Release commands are in `docs/plans/2026-09-29-release-checklist.md` and are the owner's
to run. Phase briefs and reports for all seven phases are in `docs/plans/2026-09-29-phase-*.md`.
