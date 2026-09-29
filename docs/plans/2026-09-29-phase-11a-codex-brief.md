# Phase 11a brief for Codex — the website

Read `CLAUDE.md` first, especially **Writing standard for reader-facing docs**, then
`docs/plans/2026-09-29-site-and-docs-refresh-plan.md` section **A**. That is the specification;
this brief is the working order and the traps. **No git writes** — no commit, no branch, no
staging, nothing under `.git`. The reviewer commits.

## Your surface

**`site/**` only.** A second thread is editing `docs/guide/**` at the same time, and a third owns
the consulting report's look and feel in `src/core/`. Editing another thread's surface during a
parallel pass is how a coordinated update becomes a merge conflict with opinions in it.

Do not touch: `docs/guide/**`, `README.md`, `src/**`, `test/**`.

## What is wrong now

The site describes version 0.2.0. The tool is 0.4.0, seven build phases later. Two statements in
`site/reference.html` are **actively false**, not merely dated:

1. "Sass maps, design-token JSON and unsupported formats remain outside these adapters." Both have
   adapters now (`src/adapters/scss.ts`, `src/adapters/token-json.ts`). A reader deciding whether
   this tool reads their SCSS codebase is being told no, wrongly.
2. The adapter table lists two adapters as the whole coverage surface. There are five. **Coverage is
   this product's central honesty claim** — a clean verdict is only as wide as its coverage — so a
   wrong coverage table is the worst single line on the site.

Fix those two first. Everything else on this list is staleness; those two are misinformation.

## The work

1. **Coverage table, `reference.html`.** All five adapters in `src/adapters/registry.ts`. Take each
   row from that adapter's own `extensions` and `reads` fields **by reading the source**, not from
   memory and not from the existing table. Delete the Sass/JSON exclusion sentence.

2. **Command reference — 15 commands.** The authoritative list is the `switch (cmd)` in
   `src/cli.ts`: `start`, `context`, `audit`, `consumers`, `report`, `dashboard`, `scan`, `sweep`,
   `impact`, `decide`, `guard`, `fix`, `scorecard`, `install`, and `doctor` **if** it exists in
   `src/cli.ts` by the time you run — another thread is adding it, so check rather than assume, and
   leave it out if it is not there.
   Group them the way a reader thinks: look at it, deliver something, change something, wire it up.
   Keep the existing Result/Writes columns — "what does this write to my repo" is the question a
   reader actually has, and this tool writes to people's repositories.

3. **A section for the twelve agent commands** in `skill/commands/`. They are typed
   **`/ds-loop:start`** — namespaced under the plugin name. The space form `/ds-loop start` reads
   naturally and **does not exist**; it was on the site's sibling docs and had to be corrected, so
   do not reintroduce it. Say plainly that these are the agent layer and the CLI is the instrument
   layer, and that CLI names never change because they are in people's scripts and CI.

4. **Version strings.** Twelve across `index.html`, `docs.html`, `setup.html`, `reference.html`,
   saying 0.2.0, 0.2.1 or 0.1.2. The real version is in `package.json`. Also remove the
   "npm currently provides 0.2.0, use source for 0.2.1" note in `docs.html` and the matching one in
   `reference.html` — that distinction is gone.

5. **`setup.html`** leads with `npx ds-loop`, then `ds-loop install` (it writes the agent block for
   Claude Code, Cursor or Codex, appends rather than overwrites, and is idempotent). It currently
   leads with a filesystem path to paste into an agent, which is the exact problem `install` exists
   to remove.

6. **`index.html`** gains the consulting report (`ds-loop report`) and the dashboard
   (`ds-loop dashboard`). The report is the deliverable a lead forwards to their CEO and the site
   does not currently mention it.

## Traps

- **Do not restyle anything.** No CSS changes, no layout changes, no new components. This is a
  content pass. A redesign smuggled into it cannot be reviewed.
- **Any `ds-loop` output you show must be real.** Run the command, paste the output. A sample was
  once composed from memory on this project, was plausible, was wrong, and was caught by accident —
  which is why `test/readme.test.ts` exists. It does not currently cover `site/`, so nothing will
  catch you. That makes this your responsibility rather than the build's.
  `node --experimental-strip-types src/cli.ts audit fixtures/css-audit-example` and the other
  fixtures under `fixtures/` are how you generate one.
- **Never rebrand CLI output headers.** `ds-loop audit — <label>` is checked against real runs
  elsewhere; rewriting it on the site makes the site disagree with the tool.
- **No client names, no engagement numbers.** Examples are "Example DS" and `--ds-*`.
- Keep `clean` / `issues` / `not-checked` as three distinct outcomes wherever verdicts are
  described. Absence is never a pass.
- The writing standard is `mattpocock/skills`: hook then problem then fix, direct address,
  contractions, short sentences, confident and unhedged, limits stated plainly in their own section
  rather than apologised for throughout. Cut abstract nouns.

## Verify

`npm run check && npm run type-check && npm test` must still pass — you should not have touched
anything they cover, so a failure means you edited outside your surface.

Then look at every page you changed. `file://` is blocked for browser tooling, so serve it:

```sh
cd site && python3 -m http.server 8899
```

Check at 375px and at desktop width. A broken layout from an over-long table row is the likeliest
visual regression in this pass.

Write `docs/plans/2026-09-29-phase-11a-report.md`: what you changed per page, where each adapter row
and command row came from, which output samples you regenerated and with what command, and anything
in the plan you did **not** do and why. If something in the plan turned out wrong, say so plainly
rather than working around it silently.
