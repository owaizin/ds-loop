# Phase 10 brief for Codex — sections D and E of the adoption-surface plan

Read `CLAUDE.md` first, then `docs/plans/2026-09-29-adoption-surface-plan.md` sections **D** and
**E**. Those are the specification; this brief is the working order and the traps. **No git writes**
— no commit, no branch, no staging, nothing under `.git`. The reviewer commits.

Do **D** first. It is smaller and shares no code with **E**.

## Do not touch

Another task owns the report look-and-feel: `src/core/report-html.ts`,
`src/core/report-html-assets.ts`, `src/core/consult-html.ts`, `src/core/dashboard-html.ts`,
`src/core/proposal.ts`, `src/core/visual-system.ts`, `src/core/audit-summary.ts`,
`src/core/icons.ts`.

## What already exists, so you do not rebuild it

- `src/core/consumers.ts` finds workspace packages from `package.json` `workspaces` or
  `pnpm-workspace.yaml`, and knows which package imports which.
- `src/core/contract.ts` `renderContract()` writes `DESIGN-SYSTEM.md` from measured facts.
- `src/commands/context.ts` calls it behind `--write-contract`, and **never clobbers** an existing
  contract: what is there is prose someone wrote, and no measurement is worth overwriting an
  argument. Keep that rule for every file you write.
- `src/core/coverage.ts` `buildCoverage()` states what was and was not read.
- `src/core/benchmark.ts` already carries the sample-floor idea: below a floor, a dimension is
  **not measured**, never `0`.

---

## D. Per-package context in a monorepo

`context --write-contract` in a workspace writes the repo-level `DESIGN-SYSTEM.md` plus a short
per-package section for each package that has its own styling.

Each package's section records what was measured **there**: its adapters, its ratios, its
shared-component share from `consumers`.

**The trap, and the reason this section exists at all:** a package with nothing measurable says so.
**Never a 0%.** A ratio computed over almost nothing is a measurement of our coverage, not of their
system, and published as a number it makes a struggling package look fine. This repo already shipped
that defect once — the benchmark recorded `style-tokenization-color: 0` for three repos whose
styling no adapter reads — and `src/config/benchmark.ts` holds the sample floor that fixed it. Use
the same floor here rather than inventing a second one, and if it does not fit, say why in the
report instead of hardcoding a new number outside `src/config/`.

Prefer sections in the one repo-level file over a file per package unless you find a concrete reason
not to; a design system's contract is easier to read in one place, and twelve near-empty files in a
monorepo is worse than one honest table. If you choose otherwise, say why.

**Acceptance:** run against `fixtures/example-workspace`; every package appears or is explicitly not
checked; the repo-level file still works unchanged for a single-package repo; an existing contract
is still never overwritten.

---

## E. `ds-loop doctor` — staleness as evidence

`ds-loop doctor [path] [--json]`. New `src/commands/doctor.ts`, routed from `src/cli.ts`, in
`--help`. `skill/reference/doctor.md` currently opens by saying no such command is shipped — update
it, and keep the agent procedure it describes for what the command cannot do.

Report four things:

1. **Contract drift** — `DESIGN-SYSTEM.md` records measurements from a date and an instrument.
   Re-measure and report what moved. Use the existing instrument-comparison rule: **if adapters or
   `configHash` differ, say the instrument changed rather than reporting a delta.** `scorecard`
   already does exactly this; read it and follow it rather than writing a second version.
2. **Config against reality** — naming patterns in config that match nothing in the source; an
   `upstreamPattern` with no upstream present. A pattern matching nothing is worth reporting; it is
   not proof the pattern is wrong.
3. **Guard state** — hook installed or not, and whether its recorded coverage state is current.
4. **Intent against code** — a convention stated in an intent source that the audit contradicts.

**Item 4 is the one to be careful with, and the only part of this brief I would rather you
under-deliver than overreach on.** Report it as a **pair**: what the document says, what the code
does, both cited with file and line. Never as a verdict. A disagreement between a document and the
code is evidence for a conversation — the document may be the stale half, or the aspiration, or
right about a case the audit cannot see. If you cannot state both halves with a real citation, do
not report the item. A confident wrong "your docs are out of date" is worse than silence here.

**Exit 0 always.** Doctor reports; it does not gate. `audit --require-coverage` remains the gate.
Do not add a flag that makes doctor fail a build.

**Acceptance:** a fixture whose contract was written against different values reports the drift; a
config with a dead pattern reports it; **nothing reports a delta across an instrument change**; a
doc/code disagreement prints both sides with citations; exit code is 0 in every one of those cases.

---

## Verify before you report

```
npm run check && npm run type-check && npm test && npm run build && npm run smoke
```

Then the part tests cannot do, and the part that has caught every precision defect in this repo:
**run `doctor` against a real repository nobody here wrote** and read the output as someone who has
never seen the tool. `/tmp/precision/primer`, `/tmp/precision/posthog` and
`/tmp/precision/excalidraw` are on disk. Report what it said, and whether any of it was wrong.
If the sandbox has no network you do not need one — those checkouts are local.

Write `docs/plans/2026-09-29-phase-10-report.md`: what you changed, what `doctor` printed on at
least one real repo, the tests added, and anything in the plan you did **not** do and why. If
something in the plan turned out wrong, say so plainly rather than working around it silently.
