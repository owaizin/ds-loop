# Phase 6 brief for Codex — govern, document, communicate

Read first: `VISION.md`, `CLAUDE.md`, `src/core/consumers.ts`, `src/commands/scorecard.ts`,
`skill/practices/` (from phase 4). No git writes.

A design-system team does more than catch hard-coded colours. It knows what is documented, what is
safe to remove, what was decided and why, and it can tell the business how adoption is going. These
are the parts of that work a deterministic engine can actually measure. Everything here is measured
from code, never scored by opinion.

## 1. Documentation coverage — `src/rules/docs.ts` + coverage

For each exported component in a shared package, establish: is there a story, an `.mdx`/docs page,
a prop table or types, and a usage example? Report a ratio per package, with the undocumented
components listed and located.

- Detect Storybook (`*.stories.*`, `.storybook/`), and docs pages next to components. Nothing found
  means `not checked`, never "0% documented" — a team may document elsewhere, and claiming
  otherwise is exactly the overclaim `context` already guards against.
- New rule `docs/undocumented-shared-component`, low severity, cited to a public system's own
  documented contribution requirements.

## 2. Deprecation impact — `ds-loop impact <specifier>`

"If we remove or change this, who breaks?" Built directly on `analyseConsumers`.

- Input: a package subpath or a named export. Output: every consuming package, file and line, with
  production and stories/tests separated, plus exported subpaths nobody imports (already computed).
- State the ceiling plainly: this is static import analysis, so re-export chains, dynamic imports
  and runtime composition are not resolved. A zero result is "no static import found", never "safe
  to delete".

## 3. Decision records — `ds-loop decide`

Appends an ADR-style record to `docs/decisions/` from an agent or a person: the decision, the
alternatives, the evidence refs, the date, the owner. Read back by `context` as an intent source,
which already looks in `docs/decisions/`. Plain Markdown, one file per decision, no index to rot.
This is the mechanism `governing.md` refers to, so the two must agree.

## 4. Adoption report — extend `ds-loop report`

A section built from `.ds-scorecard/history.jsonl`: what changed since the baseline, per package
and per category, in ratios, with the instrument-changed rule applied. This is the part a lead
forwards to a VP. It states the period, the number of runs it rests on, and refuses to describe a
single row as a trend.

No invented savings, no productivity estimates, no "N hours saved". Ratios and dates only.

## Constraints

- Everything measured, everything located, everything with a stated ceiling.
- Ratios, never counts, as headline numbers.
- New rule ids follow `domain/kebab-slug` and are stable from the first commit.
- Each new rule cites a real public source in a doc comment, per the repo's citation rule.

## Acceptance

- `check`, `type-check`, `test` pass, with tests for each of the four.
- Docs coverage and impact are each **measured on a public repo nobody here wrote**, with the
  hand-checked hit count recorded — the precision gate from `CLAUDE.md`.
- `docs/plans/2026-09-29-phase-6-report.md` as before.
