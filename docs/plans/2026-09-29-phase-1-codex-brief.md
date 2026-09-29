# Phase 1 brief for Codex — consulting report + clear words

Read first: `VISION.md`, `CLAUDE.md` (the architecture and constraints), `docs/plans/2026-09-29-vision-build-plan.md`.
You are working on branch `vision/phase-1-consult-report`. Do not run git commands that write
(commit, branch, checkout); Claude reviews and commits.

## Goal

A person runs the kit on their repo and gets one consulting-grade HTML report of their design
system: what we checked, the problem, where they are now, what good looks like, where the plan
takes them, and the plan. Someone who only uses the terminal gets a short summary they can read
without learning our vocabulary.

## Deliverables

### 1. `ds-loop report [<path>] [--consult <file.json>] [--out <file.html>]`

- Default output: `ds-loop-report.html` in the current directory. The file is self-contained,
  with no network requests: inline CSS/JS only and no CDN.
- Sections, in this order:
  1. **Summary.** What was checked (coverage in plain words), the verdict, and the top three
     problems in clear words.
  2. **The problem.** From `consult.json`.
  3. **Where you are now.** Engine evidence: coverage, findings grouped by theme (colour,
     spacing, type, components…), the token architecture diagram, and the component usage
     diagram when a workspace exists. Each item links to `file:line`.
  4. **What good looks like.** From `consult.json`. Each practice names the system it comes from.
  5. **Where this takes you.** From `consult.json`: the after-state and the proposed
     architecture.
  6. **The plan.** From `consult.json`. Each step has what changes, why, and how you'll know it
     worked.
  7. **What we couldn't check.** Coverage limits and rules that could not judge. Never hidden.
- With no `--consult`, sections 2, 4, 5 and 6 each render one clear line: "Not written yet — ask
  your agent to run the consult step (see skill/reference/consult.md)." The report still works
  as a state-of-the-system report.
- **Reuse; don't fork.** Build on `src/core/report-html.ts`, `token-architecture-html.ts`,
  `consumers-html.ts`, `report-html-assets.ts`, and the proposal renderer/validator in
  `skill/tools/proposal.mjs` (for the before/after architecture diagram). If proposal logic has
  to move into `src/` so the engine can use it, move it and leave `skill/tools/proposal.mjs` as a
  thin wrapper, so there is one implementation.
- `consult.json` schema: document it in `docs/guide/reference.md` and validate it in the style of
  `checkProposal`. Invalid input exits non-zero with every error listed. Claims the agent makes
  carry `evidence` refs (`file:line`, a rule ID or a URL); unsupported claims render visibly as
  unsupported, never as fact.
- Design: consulting-grade, like a deck you'd forward to a CEO. Clear hierarchy, generous
  spacing, one accent colour, light and dark themes, readable on a phone, printable to PDF
  (`@media print` page breaks per section). Match the existing HTML reports' tokens and
  `DESIGN.md` where they apply. No emoji, no gradients-for-decoration.

### 2. Clear-words layer

- New `src/core/plain.ts`: for every rule ID in `src/rules/registry.ts`, a `{ title, description }`
  written for a product engineer or founder, e.g. `token/raw-value-in-style` →
  "Hard-coded styles" / "Colours or spacing typed directly into CSS instead of using your
  design tokens, so a theme change misses them." Add the same for coverage terms and verdicts.
- A test fails if any registered rule lacks an entry.
- Use it in the report and in the human terminal summary of bare `ds-loop` / `ds-loop start` /
  `audit` (not `--all`, which stays the detailed engineer view). Format: plain title, then the
  rule ID dimmed, then count and location.
- **Unchanged:** rule IDs, rule `summary` strings, `--json` output, `fix` text, report headers
  (`ds-loop audit — <label>`). Agents and CI depend on these.
- Changing terminal output will break `test/readme.test.ts` verified samples. Fix them by
  **running the commands and pasting real output**. Never edit a sample by hand to match what
  you expect.

### 3. Skill flow: investigate → offer → consult → report

- New `skill/reference/consult.md`: how the agent writes `consult.json` and runs `ds-loop report`.
- Update `skill/SKILL.md` step order and `skill/reference/discover.md`:
  1. Investigate first: `context`, then an unfiltered `audit --json`, then `consumers` when a
     workspace exists. Don't ask what the repo already answers.
  2. Then offer a choice in plain words: "I've looked through your code. Want me to ask you a
     few quick questions, or go ahead with what I found?"
  3. Interview rules: one question at a time, each with a short example answer, at most five
     questions, and plain words only. Never assume an answer. When the user says "go ahead",
     state the assumptions made, visibly, in `consult.json`.
  4. Write `consult.json`, run `ds-loop report`, and tell the user where the file is plus the
     three things worth looking at first.
- Remove the "do not require a maturity label" framing only where it conflicts. Keep the rule
  that counts are not grades.

### 4. Repo instructions

- `CLAUDE.md`: remove the "complements Murphy Trueman's design-system-ops" positioning paragraph.
  Keep the `.ds-ops-config.yml` interop facts (the reader stays). Replace the "Do not rewrite
  the tool's output strings into plain English" bullet with the two-layer rule:
  stable IDs, rule summaries and `--json` stay precise for agents and CI; human-facing output
  uses `src/core/plain.ts` titles and descriptions.
- `README.md`: add `ds-loop report` to the first-run section with one real sample (verified per
  the README rules).
- Add a `report` entry to `src/core/next.ts` handover so `audit`/`start` name it as the next
  step.

## Constraints (from CLAUDE.md, non-negotiable)

- `src/` has no model calls, no network, no runtime dependencies.
- No threshold outside `src/config/`.
- `verdict` stays `clean` | `issues` | `not-checked`. A report of a not-checked source says so
  on the first screen.
- No private or client names anywhere. Examples use "Example DS", `--ds-*`.
- Don't rename any identifier in CLAUDE.md's naming table.
- biome style: single quotes, trailing commas, 110 columns.

## Acceptance

- `npm run check`, `npm run type-check` and `npm test` all pass.
- New tests cover:
  - Report generation on `fixtures/css-audit-example` and `fixtures/example-workspace`, with
    and without a consult file.
  - consult.json validation errors.
  - plain.ts completeness.
  - A not-checked source rendering "not checked" on the summary.
- Write `docs/plans/2026-09-29-phase-1-report.md`: what you built, files touched, anything you
  skipped or could not do, and exact commands to reproduce the sample report. Generate
  `scratch/phase-1/example-workspace-report.html` from a sample `consult.json` you write for
  the example-workspace fixture, so Claude can review the design in a browser.
