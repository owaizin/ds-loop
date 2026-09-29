# Phase 9 brief for Codex — section C, the twelve slash commands

Read `CLAUDE.md` first, then `docs/plans/2026-09-29-adoption-surface-plan.md` section **C**. That
section is the specification, including the exact twelve commands and what backs each one. This
brief is the working order and the traps. **No git writes.** The reviewer commits.

Phase 8 (sections B and A) lands first. `ds-loop install` exists by the time you start; its block
must name these commands.

## Do not touch

Another task owns the report look-and-feel: `src/core/report-html.ts`,
`src/core/report-html-assets.ts`, `src/core/consult-html.ts`, `src/core/dashboard-html.ts`,
`src/core/proposal.ts`, `src/core/visual-system.ts`, `src/core/audit-summary.ts`,
`src/core/icons.ts`.

## The hard rule, before anything

**The CLI is not renamed.** `audit`, `scan`, `sweep`, `consumers`, `scorecard` are in users' scripts,
in CI, and are the keys of scorecard rows. `CLAUDE.md` pins them stable. The friendly verbs are an
agent layer sitting **on top of** the instruments — the two-output-layer rule applied to commands.
Nothing in `src/` changes in this phase except the plugin manifest wiring.

## What you are writing

One Markdown file per command in `skill/commands/`, twelve of them, named exactly as the plan's
tables name them. Frontmatter with `name` and `description`. Body does **three things and no more**:

1. **Names the evidence to gather first** — the CLI command(s) to run, unfiltered, before saying
   anything to the user. Every command begins by reading the code. This is the investigate-then-offer
   rule from `VISION.md`, and it is the reason this product is not a questionnaire.
2. **Points at the playbook and role that own the work.** The command file is a **router**. It does
   not restate the method. Copying a playbook into a command is how the two silently drift apart and
   you end up maintaining both.
3. **States its finish line** — what "done" means, and what it will not decide alone.

**Under 40 lines each.** If a file starts explaining method, that method belongs in the playbook it
points at. A file that needs 60 lines is a sign you are duplicating, not routing.

Every playbook and role named in the plan's tables exists on disk — verify each path before you
reference it, and if one is missing, say so in the report rather than inventing a file.

## Voice

These are read by end users, not only agents. `CLAUDE.md`'s writing standard applies: direct
address, contractions, short sentences, no abstract nouns, no jargon the reader has to decode. The
plan's one-liner per command is the tone to hit. Plain outward wording, precise inward terms — the
engine's names (rule ids, verdicts, `not-checked`) stay exactly as they are wherever they appear.

## Wiring

- Add a `commands` entry to `.claude-plugin/plugin.json` pointing at `./skill/commands`, alongside
  the existing `skills`.
- `skill` is already in `package.json` `files`, so `skill/commands/` should ship. **Verify by
  packing the tarball and listing it, not by reading the manifest.** Phase 7 shipped a manifest
  declaring files it did not carry; that is why this is spelled out.
- `ds-loop install`'s written block names the twelve commands, so a user who installs learns they
  exist. (`install` ships in phase 8; edit its block text here.)
- `README.md` gains one short table: the twelve agent commands, and the CLI commands they sit on.
  Follow the README writing standard — the table earns its place by being scannable, not complete.

## Acceptance

- A test (`test/commands.test.ts`) asserts, for **every** file in `skill/commands/`: it has
  frontmatter with `name` and `description`; it names at least one `ds-loop` CLI command to run
  first; every playbook or role path it references **exists on disk**; it states a finish line; it is
  under 40 lines. Cheap and mechanical, and it is what stops the set rotting as playbooks move.
- A test asserts the twelve expected command names are all present — so a deletion is caught too.
- `npm run smoke` proves `skill/commands/` is in the packed tarball.
- `npm run check && npm run type-check && npm test && npm run build && npm run smoke` all pass.

End-to-end verification in a scratch repo with the plugin installed is the **reviewer's** job, not
yours — you cannot run a Claude Code session. Say in your report which two commands you would have
the reviewer try first and what output would prove they work.

Write `docs/plans/2026-09-29-phase-9-report.md`: the twelve files with their backing playbook, the
plugin.json change, the tarball listing proving the commands ship, and anything in the plan you did
not do and why.
