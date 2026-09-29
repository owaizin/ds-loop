# Phase 11b brief for Codex — the written guide, and putting the site inside the verification net

Read `CLAUDE.md` first, especially **Writing standard for reader-facing docs** and **Documented
output must be real output**, then `docs/plans/2026-09-29-site-and-docs-refresh-plan.md` sections
**B** and **C**. **No git writes** — no commit, no branch, no staging, nothing under `.git`.

## Your surface

**`docs/guide/**`, `docs/site/landing-copy.md`, `README.md` and `test/readme.test.ts`.**

A second thread is editing `site/**` at the same time and a third owns `src/core/` report rendering.
Do not touch either. The one exception is section C below, which adds `site/reference.html` to a
**list of files** in `test/readme.test.ts` — you change the test, never the HTML. If a site sample
then fails, say so in your report and leave it; that thread will fix its own page.

## B. The guide

The engine went from 0.2.0 to 0.4.0 across seven phases plus the adoption surface. The guide did not
move with it.

1. **`reference.md`** — five adapters, not two (`src/adapters/registry.ts` is the authoritative
   list; read each adapter's `extensions` and `reads` rather than describing them from memory).
   Fifteen CLI commands, from the `switch (cmd)` in `src/cli.ts` — including `doctor` **only if** it
   is there when you run, since another thread is adding it. New config keys, including
   `clustering.alphaTolerance`, whose whole point is that CIEDE2000 has no alpha term and a
   translucent overlay therefore measured as an exact duplicate of the opaque colour beneath it.

2. **`install.md`** — `ds-loop install`: what it writes, into which file per agent, that it appends
   rather than overwrites, that it replaces only its own marked block on a rerun, and that the guard
   is opt-in behind `--guard` because it edits the user's `settings.json`.

3. **`output.md`** — add samples for `report` and `dashboard`. **Run the command, paste the output,
   mark it `verified: <id>`, and register the id in `test/readme.test.ts`.** This is not optional
   bookkeeping: a sample was once composed from memory on this project, was plausible, was wrong,
   and was caught by accident. Adding a `verified:` block without registering a check for it fails
   the build, deliberately.
   Reflowing a sample for width is allowed — lines are matched after whitespace normalisation, and a
   trailing `…` marks truncation. **Reordering or splicing is not**, because that is how a wrapped
   line becomes a false one. On this test's first run it caught exactly that: two finding pairs
   spliced across a line wrap as though contiguous, silently dropping the two entries between them.

4. **`workflow.md`** — the twelve agent commands in `skill/commands/`, typed **`/ds-loop:start`**.
   The space form `/ds-loop start` does not exist; it had to be corrected elsewhere, so do not
   reintroduce it. Say where the 8 roles and 6 practice guides fit.

5. **`release-0.2.0.md`** — it is the newest release note in a directory documenting 0.4.0. Write a
   0.4.0 note or delete it. Do not leave it as is.

6. **`benchmark.md`** is current. Read it, do not rewrite it. If the alpha change to clustering means
   its numbers were measured with a defect in them, **say so in your report** — do not hand-edit
   pinned measurements, and do not re-run the corpus.

7. **`README.md`** already has verified samples. Check them still pass, extend where a new command
   deserves a line. Do not restructure it.

## C. Put the site inside the net — do this after B

`test/readme.test.ts` reads a list of files at roughly line 50:

```ts
const readme = ['README.md', 'docs/guide/output.md', 'docs/site/landing-copy.md']
```

`site/reference.html` carries nine `ds-loop audit` samples and is **not** in that list, so nothing
checks them. Add it. The marker will need to be an HTML comment rather than a Markdown one, and the
extractor may need a small change to find fenced samples inside HTML — keep that change as small as
it can be.

Then run the suite. Each of those nine samples either proves itself or fails.

**If one fails, do not fix it by editing the sample to match, and do not remove its marker.** Either
regenerate it by running the command, or — if it belongs to the page the other thread is editing —
report it and leave it. An agent that "fixes" this failing test has quietly removed the guard
against fabricated samples, which is the one thing it exists to prevent.

## Constraints

- Writing standard is `mattpocock/skills`: hook then problem then fix, a runnable command in the
  first ten lines, install and use before architecture, direct address, contractions, short
  sentences, confident and unhedged. Limits get a dedicated section stated plainly, not hedging
  spread through the prose. Cut abstract nouns — "policy-free mechanism" and "the leaky seam" are
  notes-to-self, not writing.
- **Cite a source for the specific claim it supports.** A named source beside an unsupported
  generalisation is how this project once shipped comparative claims about other tools that nothing
  backed.
- **Never rebrand CLI output.** `ds-loop audit — <label>` is checked against real runs.
- **No client names, no engagement measurements, ever.** Examples are "Example DS" and `--ds-*`.
- Keep the two output layers: rule ids, rule summaries, `--json` and fix text stay precise for
  agents and CI; human-facing prose uses plain words.
- `clean` / `issues` / `not-checked` are three distinct outcomes. Absence is never a pass, and a
  clean verdict is only as wide as its coverage.

## Verify

```
npm run check && npm run type-check && npm test && npm run build && npm run smoke
```

Write `docs/plans/2026-09-29-phase-11b-report.md`: what changed per file, every sample you
generated and the exact command behind it, what happened when `site/reference.html` entered the
verification net, and anything in the plan you did **not** do and why. If something in the plan
turned out wrong, say so plainly rather than working around it silently.
