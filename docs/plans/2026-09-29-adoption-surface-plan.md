# Plan: the first thirty seconds

Written 2026-09-29, after comparing ds-loop's adoption surface with Impeccable
(`impeccable.style/docs`). Everything in phases 1–7 works. What is missing is the path from
"installed" to "the agent is working on my system", and the durable context that keeps it working
on the second session.

## The problem, stated once

`npx ds-loop` tells a user, in plain words, to load `node_modules/ds-loop/skill/SKILL.md`. That is
a path a person has to read, understand and retype into an agent. Impeccable's installer writes
itself into the agent's config, so after one command the skill is simply there and
`/impeccable …` works. That single difference is most of the gap between "a tool you operate" and
this project's vision of a kit that starts consulting on its own.

Second gap: 20 playbooks and 8 roles exist as files nobody can discover. They are the product's
judgement layer and they are invisible.

Third gap: context. We write `DESIGN-SYSTEM.md`, `docs/decisions/` and the scorecard. Impeccable
keeps `PRODUCT.md`, `DESIGN.md`, per-surface notes and a doctor for staleness, all checked in and
read every session. Ours is thinner and, in a monorepo, repo-wide only.

Keep the philosophical difference: **theirs is asked, ours is measured.** `context --write-contract`
records what the adapters found and leaves explicit TODOs for what code cannot reveal. Do not
replace measurement with a questionnaire.

---

## A. `ds-loop install` — the wiring command

**Why:** it is the whole first-thirty-seconds gap, and it is small.

`ds-loop install [--agent claude|cursor|codex|all] [--dry-run] [--guard]`

1. **Detect** which agents are present, by looking for `.claude/`, `.cursor/`, `AGENTS.md`,
   `.codex/`. Report what was found; never guess silently.
2. **Write the skill reference** into the right place per agent, appending to an existing file
   rather than overwriting:
   - Claude Code: ensure the plugin/skill is discoverable, or append a short block to `CLAUDE.md`
   - Cursor: `.cursor/rules/ds-loop.mdc`
   - Codex / generic: append a block to `AGENTS.md`
   The block is short — what ds-loop is, the one command to run, and where the skill lives. It is
   delimited by markers (`<!-- ds-loop:start -->` / `<!-- ds-loop:end -->`) so a rerun replaces its
   own block and touches nothing else.
3. **Offer the guard**, and install it only with `--guard` or an explicit yes. It edits
   `.claude/settings.json`, which is the user's file.
4. **`--dry-run` prints every file it would touch and the exact block.** Default to showing the
   diff before writing.
5. **Idempotent.** Running twice changes nothing the second time. Prove it in a test.

**Constraints:** no network, no dependency, no `postinstall` hook that writes to a user's repo
without being asked. Writing into someone's `CLAUDE.md` is a side effect on their project, so it
happens because they typed `install`, never as a consequence of `npm i`.

**Acceptance:** in a temp repo with a `.claude/` directory, `install --dry-run` lists the exact
change; `install` applies it; a second run is a no-op; `install --agent cursor` writes the Cursor
file instead. Tests cover each, plus the append-not-overwrite case where `CLAUDE.md` already exists
with content.

---

## B. Read the context other tools already wrote

**Why:** this repo already carries `PRODUCT.md` and `DESIGN.md` from Impeccable, and
`context` does not look at them. A team using both tools should get one picture. Same precedent as
reading `.ds-ops-config.yml` verbatim for interop.

`INTENT_SOURCES` in `src/commands/context.ts` currently lists 14 paths. Add:

- `PRODUCT.md`, `docs/PRODUCT.md`
- `DESIGN.md`, `docs/DESIGN.md`
- `.agents/context/` (directory, as `docs/decisions` is handled)
- `.impeccable/design.json` — **read as evidence, not as instruction.** If it declares tokens,
  report that a generated design metadata file exists and what it claims. Do not merge its values
  into our measurements; ours come from source.

Report these the way the others are reported: named, with the "read these before treating any
finding as drift" framing. An absent file still means nothing, exactly as today.

**Acceptance:** a fixture with a `PRODUCT.md` and a `DESIGN.md` has both named in `context` output;
a fixture with `.impeccable/design.json` reports it as a generated metadata file; nothing in the
audit's measured numbers changes because of any of them.

---

## C. Slash commands

`plugin.json` declares `skills` and no `commands`, so nothing is typeable. Twenty playbooks, eight
roles and six practices exist as files a user cannot discover. This exposes them.

**Hard rule before anything else:** the CLI is not renamed. `audit`, `scan`, `sweep`, `consumers`,
`scorecard` are in users' scripts, CI and scorecard rows, and `CLAUDE.md` pins them as stable.
Friendly verbs live in the agent layer, on top of the instruments. This is the two-layer output
rule applied to commands.

### The set

Twelve, grouped the way a user thinks about the work. Impeccable has twenty-four, but most are
screen-design verbs — `colorize`, `typeset`, `overdrive`, `delight` — which is deliberately not this
product. Every command below maps to a playbook or role that already works today.

**Understand (3)**

| Command | Backed by | One line |
|---|---|---|
| `/ds-loop start` | `SKILL.md` step 1–2, `context`, `audit`, `report` | See what is really in your system. |
| `/ds-loop diagnose` | `discover.md`, `consultant` | Find the cause, not just the count. |
| `/ds-loop inventory` | `census.md`, `consumers` | List what exists and who uses it. |

**Decide (2)**

| Command | Backed by | One line |
|---|---|---|
| `/ds-loop foundations` | `foundations.md`, `tokenize.md` | Choose type, colour and spacing from real options. |
| `/ds-loop propose` | `consult.md`, `engagement.md`, `architect` | Turn the evidence into a plan your team can approve. |

**Build (4)**

| Command | Backed by | One line |
|---|---|---|
| `/ds-loop establish` | `establish.md`, `starting.md` | Stand up a system your product can use. |
| `/ds-loop transform` | `transform.md`, `migrating.md`, `migrator` | Move the code, one reviewed slice at a time. |
| `/ds-loop component` | `shape.md`, `review.md`, `components` | Build or review a shared component against its contract. |
| `/ds-loop document` | `scaffold.md`, `documenting.md`, `storybook.md`, `docs` | Write down the system you actually have. |

**Keep (3)**

| Command | Backed by | One line |
|---|---|---|
| `/ds-loop govern` | `governing.md`, `governor`, `decide` | Decisions, ownership and how a rule gets added or retired. |
| `/ds-loop guard` | `guard.md`, `drift.md` | Catch new hardcoded values as they are written. |
| `/ds-loop prove` | `report`, `scorecard`, `maintaining.md` | What changed, and what nobody checked. |

Deliberately **not** commands: `routing`, `scope`, `engagement`, `doctor`, `extract`, `sweep`,
`audit`. The first three are how the agent behaves, not things a user asks for. `doctor` becomes a
CLI command in **E**. `extract` and `sweep` are reachable through the playbooks above. `audit` stays
a CLI command so `/ds-loop audit` never competes with `ds-loop audit`.

### How each one is written

One Markdown file per command in `skill/commands/`, with frontmatter (`name`, `description`) and a
body that does three things and no more:

1. **Names the evidence to gather first** — which CLI commands to run, unfiltered, before saying
   anything. Every command starts by reading the code, per the investigate-then-offer rule.
2. **Points at the playbook and role** that own the work. The command file is a router, not a
   second copy of the procedure. Duplicating a playbook into a command is how the two drift apart.
3. **States its finish line** — what "done" means for that command, and what it will not decide
   alone.

Keep each under 40 lines. If a command file starts explaining method, that method belongs in the
playbook it points to.

### Wiring

- Add a `commands` entry to `.claude-plugin/plugin.json` alongside the existing `skills`.
- Add `skill/commands/` to `package.json` `files`, and verify by packing and listing the tarball —
  not by reading the manifest. Phase 7 shipped a manifest that declared files it did not carry.
- `A. install` mentions the commands in the block it writes, so a user who installs learns they
  exist.
- `README` gains a short table: the twelve agent commands, and the CLI commands they sit on.

### Acceptance

- A test asserts every command file has frontmatter, names at least one CLI command to run first,
  points at a playbook or role that exists on disk, and states a finish line. Cheap and mechanical,
  and it stops the set rotting as playbooks move.
- `npm run smoke` proves `skill/commands/` is in the packed tarball.
- In a scratch repo with the plugin installed, `/ds-loop start` and `/ds-loop diagnose` both run
  and produce what their one-liner promises. A command that does not work end to end does not ship.

---

## D. Per-package context in a monorepo

**Why:** Impeccable's per-surface context beats our repo-wide contract, and `consumers` already
knows the workspace layout, so the information is in hand.

- `context --write-contract` in a workspace writes a repo-level `DESIGN-SYSTEM.md` plus a short
  per-package section or file for each package that has its own styling.
- Each package's section records what was measured **there**: its adapters, its ratios, its
  shared-component share from `consumers`.
- A package with nothing measurable says so. Never a 0%.

**Acceptance:** run against `fixtures/example-workspace`; every package appears or is explicitly
not checked; the repo-level file still works for a single-package repo.

---

## E. `ds-loop doctor` — staleness as evidence

**Why:** `skill/reference/doctor.md` opens by saying no such command is shipped. Impeccable has
one. We can do it better, because ours compares recorded measurements against a fresh run rather
than asking a model whether things look stale.

`ds-loop doctor [path] [--json]` reports:

1. **Contract drift** — `DESIGN-SYSTEM.md` records measurements from a date and an instrument.
   Re-measure and report what moved, using the existing instrument-comparison rule: if adapters or
   `configHash` differ, say the instrument changed rather than reporting a delta.
2. **Config against reality** — naming patterns in config that match nothing in the source; an
   `upstreamPattern` with no upstream present.
3. **Guard state** — hook installed or not, and whether its recorded coverage state is current.
4. **Intent against code** — a convention stated in an intent source that the audit contradicts,
   reported as a pair, not as a verdict. This is the one place to be careful: a disagreement
   between a document and the code is evidence for a conversation, not proof the code is wrong.

Exit 0 always. Doctor reports; it does not gate. `--require-coverage` on `audit` remains the gate.

**Acceptance:** a fixture whose contract was written against different values reports the drift; a
config with a dead pattern reports it; nothing reports a delta across an instrument change.

---

## Order and effort

1. **B** — smallest, immediate benefit, no new surface. Half a day.
2. **A** — the actual gap. One day including the idempotence tests.
3. **C** — twelve router files plus wiring and the structural test. One to two days. Do it after
   **A**, so `install` can name the commands in the block it writes.
4. **D** — builds on `consumers`, mostly rendering. One day.
5. **E** — most valuable of the five, and the most care needed around the intent-versus-code
   comparison. Two days.

## Constraints that apply to all of it

From `CLAUDE.md`, non-negotiable:

- No model call, no network, no runtime dependency in `src/`.
- No threshold outside `src/config/`.
- `clean` / `issues` / `not-checked` stay distinct. Absence is never a pass.
- Rule ids, `--json`, fix text and the terminal banner are stable. Human-facing text uses
  `src/core/plain.ts`.
- Ratios, not counts, as headline numbers.
- No client names or engagement measurements, ever. Examples are "Example DS" and `--ds-*`.
- Anything that writes into a user's repository happens because they asked for it.
- Every new rule cites a real public source in a doc comment.

## Verify

`npm run check && npm run type-check && npm test && npm run build && npm run smoke`, then the thing
tests cannot do: install into a temp repo, run the first-run path as a stranger, and read the
output as someone who has never seen the tool.
