# Phase 13 brief for Codex: reachability in the HTML reports

Read `CLAUDE.md` first, then item 3 of `docs/plans/2026-09-30-open-work.md`. This brief is the
working order and the traps. **No git writes**: no commit, no branch, no staging, nothing under
`.git`. The reviewer commits.

## Why

Reachability evidence (phase 12, `a01148f` + `17268b6`) ships in `audit --json` and the terminal.
The HTML reports show none of it. `grep -c reached` returns 0 in every renderer. The pilot that
asked for this reads the HTML report, not the terminal.

## What exists: read it, do not rebuild it

- `AuditReport` in `src/commands/audit.ts`: `fileImports` (with `.limits`), `findingEvidence`,
  `findingTotals` (with `.basis`), `reachedStyleInventory`, `reachedRatios`.
- Every entry in `report.findings` already carries `dimensions` (`src/core/finding-dimensions.ts`):
  `reached.state` (`reached | no-static-importer | unresolved | mixed`), `occurrences`
  (`all | reached | noStaticImporter | unresolved`, each `number | null`), `locations[]`.
- `formatDimensions` in that file is the terminal wording. Match its words.

## Surfaces, all three

1. `ds-loop report` → `renderConsultHtml` (`src/core/consult-html.ts`), which wraps
   `renderAuditHtml`.
2. The standalone audit HTML → `renderAuditHtml` / `writeReport` (`src/core/report-html.ts`).
3. `ds-loop dashboard` → `renderDashboardHtml` (`src/core/dashboard-html.ts`).

## The rules. Each one comes from a defect.

**Every visible count is paired with its reached count.** Never show one without the other. Where
the reached figure does not exist, print `reached not measured`. **Never print 0 for it.** A
fabricated zero is worse than an absent number. This covers:

- each finding card: its located occurrences and how many are in files with a static importer.
  Use `dimensions.occurrences`. The card's existing count (`data.count`) may have a different
  basis than `occurrences.all`, which counts located evidence. Check which one it is on a real
  repo. Do not pair two numbers with different bases as if they were the same thing: label the
  basis, or pair like with like. Leave the existing count as it is.
- the headline tokenization metrics in the consult cover (`style-tokenization-*`), paired with
  `reachedRatios[key]`.
- the `finding groups` headline, paired with `findingTotals.reached`.
- the audit report's CSS inventory cards (occurrences, tokenization ratio), paired with
  `reachedStyleInventory`.
- the dashboard's "today" figure for each ratio, and its findings list.

History and trend rows do not record reached ratios. Do not invent them. Leave the trend tables
unchanged.

**Annotate, never remove.** No finding disappears. No card gets reordered or filtered by
reachability. No count gets replaced by a smaller one.

**The wording is fixed.** State `no-static-importer` as exactly **"No static importer found"**.
Never *dead*, *unused*, *unreachable* or *safe to delete*. A file can still be reached through a
dynamic import, a route manifest, a glob or a build-time copy. `unresolved` reads as
"importer not determined". `mixed` reads as the per-state split of its occurrences.

**Each caveat ships once.** `findingTotals.basis` and each line of `fileImports.limits` go into
the limits / "What we couldn't check" section exactly once per document. Do not repeat them on
every card. Last session a caveat printed nine times in one report with every test green.

**Older or partial reports.** All five fields are optional on `AuditReport`, and `dimensions` is
optional on `Finding`. A report without them has to render the same as before, plus
`reached not measured` where a pair would go. It must not throw.

## Do not touch

- `benchmarks/`, `scripts/benchmark.mjs`, `src/config/benchmark.ts`. Another task is
  re-measuring the corpus.
- `README.md`, `docs/guide/`, `site/`. Docs follow in a later item.
- Engine semantics: `src/core/file-imports.ts`, `src/core/finding-dimensions.ts`, and the
  report-building half of `src/commands/audit.ts`. If a renderer needs a field that does not
  exist, **stop and report it**. Do not add it.
- Rule ids, rule `summary` strings, `--json` shape and CLI text output.
- The report's visual design. Reuse the existing classes and patterns (`.basis`, `.badge`,
  `.hm-item`, the meta rows). Add no new colour tokens, fonts or icons. Keep any CSS you add
  minimal and inside the existing CSS strings.

## Tests (in `test/`, next to the existing report tests)

1. A temp-dir fixture with one stylesheet that is imported and one that is not. Render all three
   surfaces. Assert:
   - "No static importer found" appears on the unimported file's finding.
   - The reached count appears beside each count you touched.
2. Forbidden words. Assert the **visible text** of each surface (strip `<style>`, `<script>` and
   tags) does not match `/\bdead\b|\bunused\b|safe to delete|\bunreachable\b/i`. If text that
   already existed trips it, **report it. Do not reword someone else's copy to pass.**
3. Once-only. The `findingTotals.basis` sentence and each `fileImports.limits` line appear
   exactly once in each document.
4. Absent fields. Render a report with the five fields and `dimensions` deleted. It renders,
   says `reached not measured`, and contains no `reached 0`.

## Precision gate: counts, not pass/fail

Run `ds-loop report` (via `node --experimental-strip-types src/cli.ts report <path> --out <file>`)
on `/tmp/precision/primer`, `/tmp/precision/excalidraw` and `/tmp/precision/posthog`. These are
public repos nobody here wrote. Write the HTML into a scratch directory inside this worktree and
**delete it before you finish**. For each repo, report:

- the number of finding cards, and how many show each state (reached / no static importer /
  importer not determined / mixed);
- whether the numbers in the HTML match `audit --json` for the same run (`findingTotals`, and
  `reachedRatios` for the headline keys);
- a hand-check of **5 "No static importer found" locations per repo**: grep the tree for an
  importer of that file (`import`, `require`, `@import`, `@use`, `@forward`, and the bare
  filename). Give counts: *N of 5 have no static importer I could find*, and name any that do.
- how many times the basis sentence and each limit appear in the HTML (expected: 1).

If a repo shows **zero** "No static importer found" labels, say so plainly. That is the
failure mode phase 12 shipped with green tests.

## Done means

`npm run check && npm run type-check && npm test` all pass. Report the test count before and
after. Write `docs/plans/2026-09-30-phase-13-report.md` with: what changed per surface, the
decisions you made on basis-pairing, the precision counts above, and anything you did **not**
do or could not verify.
