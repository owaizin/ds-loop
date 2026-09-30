# Phase 16 brief for Codex: document what the last three changes added

Read `CLAUDE.md` first, especially **"Documented output must be real output"** and **"Writing
standard for reader-facing docs"**. Then read item 4 of `docs/plans/2026-09-30-open-work.md`.
**No git writes**: no commit, no branch, no staging, nothing under `.git`. The reviewer commits.

## What is missing

The site and guide are accurate, but they describe less than the tool now does. All 18 verified
samples pass. Four things shipped with no reader-facing documentation:

1. **Reachability.** Every finding now records whether its files have a static importer in the
   scanned tree. The terminal, `--json` and all three HTML reports (consult report, audit report,
   dashboard) show it, and every count is paired with its reached count. The states are
   "reached", **"No static importer found"** and "importer not determined". Source:
   `src/core/finding-dimensions.ts`, `src/core/file-imports.ts` (its `limits` array is the
   authoritative list of what the signal cannot see), `src/core/reach-html.ts`.
2. **Five new top-level keys in `audit --json`**: `fileImports`, `findingEvidence`,
   `findingTotals`, `reachedStyleInventory`, `reachedRatios`. The table "Fields in
   `audit --json`" in `docs/guide/reference.md` documents none of them. Read the types in
   `src/commands/audit.ts` and describe each from the code, not from its name.
3. **`ds-loop install` with no agent detected** now names three runnable commands. Run it in an
   empty temp directory and see what it actually prints.
4. **The benchmark states ranges.** `report --against products|systems` now gives colour,
   spacing and typography ranges. The rule is in `docs/guide/benchmark.md`, which is already
   updated. **Do not rewrite that file.** Other pages that mention the benchmark may need a line
   to match it.

## Where

- `README.md`: one short reachability section. Say what it tells a reader and what it doesn't,
  in two or three sentences, and link to the guide. Not a feature tour.
- `docs/guide/reference.md`: the `--json` fields table; a reachability subsection (states,
  what counts as an importer, the limits); `install`'s no-agent behaviour if install is
  documented there.
- `docs/guide/install.md`: the no-agent path.
- `docs/guide/output.md`: optional. If you add a sample, it must be **run and pasted**, marked
  `<!-- verified: <id> -->` and registered in `test/readme.test.ts`.
- `site/reference.html` and `site/docs.html`: the same facts at the site's depth. Match the
  existing markup and classes. **No restyling.**

## The rules that do not bend

- **Wording.** Never *dead*, *unused*, *unreachable* or *safe to delete*. Say what the signal is
  for: it separates code a product ships from tests, stories, examples and orphans, within the
  scanned tree. It is not a deletion verdict. A file can be reached through a dynamic import, a
  route manifest, a glob or a build-time copy, and consumers outside the tree are invisible to it.
- **No counts from public repos in prose.** A parallel task is changing the engine right now
  (phase 15: which findings get locations, and which package imports stop clouding files). Any
  number from Primer, PostHog or Excalidraw about reachability will be stale by tonight. Describe
  the behaviour. If you want a number, it has to come from a verified sample, and the reviewer
  re-runs every sample after both tasks land.
- **Documented output must be real output.** Never edit a sample to make `test/readme.test.ts`
  pass. If an existing sample fails, report it.
- **Writing standard:** hook, problem, fix. Direct address, short sentences, no abstract nouns.
  Limits get their own plain paragraph, not hedges spread through the text.
- **No client names or engagement measurements.** Use "Example DS" and `--ds-*` for examples.
  Do not name the pilot.
- **Never rebrand CLI output**, and never rename `ds-loop` identifiers. See `CLAUDE.md`.

## Do not touch

- `src/`: another task owns the engine right now.
- `docs/guide/benchmark.md` (just updated), `benchmarks/`, `docs/plans/` apart from your report.
- Site CSS and JS, and the visual design.

## Done means

`npm run check && npm run type-check && npm test` pass, including `test/readme.test.ts` and
`test/naming.test.ts`. Report the test count before and after. Write
`docs/plans/2026-09-30-phase-16-report.md`: each page changed and why, every sample you added
with the command that produced it, and every claim you could not check against code or a run.
Delete scratch output before finishing.
