# Phase 8 brief for Codex — sections B and A of the adoption-surface plan

Read `CLAUDE.md` first, then `docs/plans/2026-09-29-adoption-surface-plan.md` sections **B** and
**A**. Those are the specification; this brief is the working order. **No git writes** — do not
commit, branch, stage or touch `.git`. The reviewer commits.

Do **B** first, then **A**. They are independent; B is small and de-risks the run.

## Do not touch

Another task owns the report look-and-feel and has uncommitted work in these files. Editing any of
them turns this into a merge conflict:

`src/core/report-html.ts`, `src/core/report-html-assets.ts`, `src/core/consult-html.ts`,
`src/core/dashboard-html.ts`, `src/core/proposal.ts`, `src/core/visual-system.ts`,
`src/core/audit-summary.ts`, `src/core/icons.ts`

---

## B. Read the context other tools already wrote

`INTENT_SOURCES` in `src/commands/context.ts` lists 14 paths. Add:

- `PRODUCT.md`, `docs/PRODUCT.md`
- `DESIGN.md`, `docs/DESIGN.md`
- `.agents/context/` — a directory, handled the way `docs/decisions` already is
- `.impeccable/design.json`

**`.impeccable/design.json` is evidence, not instruction.** Report that a generated design-metadata
file exists and, in one line, what it claims. **Never merge its values into our measurements** —
ours come from source, through adapters. A machine-written file asserting a palette is exactly the
thing an audit exists to check, so treating it as truth would invert the product.

Report the new paths the way the existing ones are reported: named, under the same "read these
before treating any finding as drift" framing. An absent file still means nothing — the existing
copy about absence is correct and stays.

Note `DESIGN.md` already exists in this repo (it is our own visual contract), so the fixture you
test against must be a temp dir, not the repo root.

**Acceptance:** a fixture with `PRODUCT.md` and `DESIGN.md` names both in `context` output; a
fixture with `.impeccable/design.json` reports it as a generated metadata file; **no measured number
in any audit changes because of any of them** — assert that last one, it is the point.

---

## A. `ds-loop install` — the wiring command

`ds-loop install [--agent claude|cursor|codex|all] [--dry-run] [--guard]`

New file `src/commands/install.ts`, routed from `src/cli.ts` like the others, and in `--help`.

1. **Detect** which agents are present: `.claude/`, `.cursor/`, `AGENTS.md`, `.codex/`. Print what
   was found. Never guess silently; with no agent detected, say so and write nothing.
2. **Write the skill reference**, per agent, **appending** to an existing file rather than
   overwriting:
   - Claude Code: append a block to `CLAUDE.md`
   - Cursor: `.cursor/rules/ds-loop.mdc`
   - Codex / generic: append a block to `AGENTS.md`
   Content of the block: what ds-loop is in two lines, the one command to run first
   (`npx ds-loop` — the bare invocation audits and names the next command), and where the skill
   lives. Delimited by `<!-- ds-loop:start -->` / `<!-- ds-loop:end -->` so a rerun replaces **its
   own block and nothing else**. The Cursor `.mdc` file uses the same markers inside it.
3. **`--guard` only.** The guard edits `.claude/settings.json`, which is the user's file. Without
   the flag, print one line saying `ds-loop guard` is available and move on. Reuse the existing
   guard install path in `src/commands/guard.ts`; do not reimplement it.
4. **`--dry-run` prints every file it would touch and the exact block**, and writes nothing.
5. **Idempotent.** Second run changes no bytes. This is the test that matters most.

**Constraints, all from `CLAUDE.md`:** no network, no runtime dependency, no `postinstall` hook.
Writing into someone's `CLAUDE.md` happens because they typed `install`, never as a consequence of
`npm i`. Do not add a `postinstall` script to `package.json` under any reading of this brief.

**Acceptance — tests, in a temp dir each:**

- `install --dry-run` in a repo with `.claude/` lists the exact change and writes nothing
- `install` applies it; a **second run leaves the file byte-identical** (compare contents, not mtime)
- `install --agent cursor` writes `.cursor/rules/ds-loop.mdc` and does not touch `CLAUDE.md`
- an existing `CLAUDE.md` with content keeps every original byte, with the block appended
- a `CLAUDE.md` holding an **older** ds-loop block has that block replaced in place, and surrounding
  content untouched
- no agent detected: reports it, writes nothing, exits 0

## Verify before you report

```
npm run check && npm run type-check && npm test && npm run build && npm run smoke
```

Write `docs/plans/2026-09-29-phase-8-report.md`: what you changed, the exact block text `install`
writes, the test names, and anything in the plan you did **not** do and why. If something in the
plan turned out wrong, say that plainly rather than working around it silently.
