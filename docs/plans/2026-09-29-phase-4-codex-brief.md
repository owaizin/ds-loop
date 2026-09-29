# Phase 4 brief for Codex — the agent team and the elite practices

Read first: `VISION.md`, `CLAUDE.md`, `skill/SKILL.md`, every file in `skill/reference/`,
`docs/plans/2026-09-29-vision-build-plan.md`. No git writes.

The vision is "your design-system team, in one install". Today the skill is one generalist agent
with 20 playbooks. This phase turns it into a team with named roles, and writes down the practices
that team is supposed to hold people to.

## Part A — roles

Add `skill/roles/` with one file per role. A role states: what it owns, what evidence it works
from, what it must not decide alone, what it hands to the next role, and which playbooks and
commands it uses. Keep each under 150 lines.

| Role | Owns |
|---|---|
| `auditor` | Establishing facts. Runs the engine, reports coverage, never proposes. |
| `consultant` | The diagnosis, the plan and the report. Owns `consult.json`. |
| `architect` | Token architecture, layers, naming, the before/after proposal. |
| `foundations` | Colour, type, spacing, radius, elevation, motion decisions. |
| `components` | Component contracts, APIs, shared-versus-local calls. |
| `docs` | Documentation, Storybook, examples, contribution paths. |
| `migrator` | Staged adoption, codemods, deprecation, keeping consumers working. |
| `governor` | Decision records, ownership, review rules, drift prevention. |

`SKILL.md` routes to a role from the user's outcome. One agent may play several roles in a small
engagement; the point is that each hand-off is explicit and the evidence travels with it. Do not
build an orchestration framework and do not require subagents — this is instructions, not code.

## Part B — the practices

Add `skill/practices/` covering what elite teams actually do, one file each:

- `starting.md` — how a system starts: pilot scope, first foundations, first components, the
  first consumer, what "v0" means.
- `maintaining.md` — versioning, release notes, breaking-change policy, review, health checks.
- `migrating.md` — staged adoption, codemods, dual-running old and new, deprecation windows,
  how to know a migration is finished.
- `documenting.md` — what a component page must answer, token documentation, usage guidance,
  writing for both people and agents.
- `storybook.md` — structure, what deserves a story, controls, docs pages, visual review, and
  when Storybook is the wrong tool.
- `governing.md` — ownership, contribution, decision records, exceptions, how a rule gets added
  or retired.

**Every claim cites a real public source** — a design system's own published docs or repository,
with the URL, per the repo's existing citation rule for rules. Prefer Primer, Polaris, Carbon,
Spectrum, Atlassian, Material, Radix, shadcn/ui, Fluent, SLDS, and the `ds-state-of-ai` MCP survey
where it applies. A practice nobody publishes is marked as our own opinion, in those words. No
invented statistics, no "studies show", no comparative claims about other tools.

Write them to the repo's reader-facing standard: hook, then the practice, then what it looks like
when it is missing, then what to do. Direct address, short sentences, no abstract nouns.

## Part C — wire it up

- The consultant role's "what good looks like" section pulls from `skill/practices/`, so the
  report cites a real system for every recommendation rather than inventing best practice.
- `skill/reference/routing.md` gains the role column.
- A test asserts every practice file has at least one citation with a URL, and that every role
  file names its hand-off. Cheap, mechanical, keeps the standard from rotting.

## Acceptance

- `check`, `type-check`, `test` pass.
- `docs/plans/2026-09-29-phase-4-report.md` lists every source cited, and every place you had to
  write "our opinion" because no public source states it.
