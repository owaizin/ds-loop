# Phase 12 brief for Codex — section F, reachable findings

Read `CLAUDE.md` first, then section **F** of `docs/plans/2026-09-29-adoption-surface-plan.md`. That
is the specification; this brief is the working order and the traps. **No git writes** — no commit,
no branch, no staging, nothing under `.git`. The reviewer commits.

## Where this came from

The Caliper pilot used ds-loop across five apps and rated coverage clarity 6/10, for one stated
reason: "counts included legacy code and domain colors". That is a real defect, not a preference. A
literal in a file nothing imports costs a reader the same attention as one in the signup button, and
the ratio understates a system that is actually fine.

## Do not touch

`src/core/report-html.ts`, `src/core/report-html-assets.ts`, `src/core/consult-html.ts`,
`src/core/dashboard-html.ts`, `src/core/proposal.ts`, `src/core/visual-system.ts`,
`src/core/audit-summary.ts`, `src/core/icons.ts`, `src/core/token-architecture-html.ts`. Another
task owns the report's look and feel and has uncommitted work in them.

## What exists, so you do not rebuild it

- `src/core/consumers.ts` and `src/commands/impact.ts` already resolve static imports across a tree.
  **Reuse that resolution.** A second import parser that disagrees with the first is worse than no
  second dimension at all.
- `src/core/component-usage.ts` classifies origin as `shared | local | external | unresolved`, and
  that four-way shape is a good model for what you are adding: it already refuses to collapse
  "not ours" and "could not tell" into one bucket.
- `src/core/suppress.ts` applies recorded exceptions. `src/commands/decide.ts` writes
  `docs/decisions/`.
- `config/taxonomy.nonColorTokenHints` is the seam for domain values.

## The three dimensions

Each is a separate fact with its own basis. Do not combine them into one "actionable" score — that
would be a judgement, and judgement stays with the reader.

1. **Reached** — does any file in this tree statically import the file the finding sits in?
2. **Declared intentional** — does a recorded decision or exception cover it? Name which one.
3. **Domain value** — is the colour's role something other than a design token: a chart series, a
   brand illustration, a data-visualisation scale?

## The two rules that govern every line of this

**Annotate, never remove.** A finding gains a dimension. It never disappears, and no count is
replaced by a smaller one. Every total ships in both forms — all findings, and findings in reached
files — and wherever one is shown the other is shown beside it.

This project already holds that line twice, and both times it was learned from a defect: `clean`,
`issues` and `not-checked` stay distinct because absence is never a pass; and a severity floor
filters findings but never coverage, because a tool that silently drops findings has numbers nobody
can audit. This would be the first filter here that removes evidence rather than ranking it, and it
must not become one.

**"No static importer found" is the only claim available.** Never "dead", never "unused", never
"safe to delete", never "unreachable" as a bare assertion. A file can be reached by a dynamic
import, a route manifest, a glob, a CSS `@import`, a build-time copy, or a string the bundler
resolves. `impact` already states this limit — it reports import locations and makes no
deletion-safety claim — so use the same framing and, where you can, the same words.

If you find yourself writing a sentence that tells someone a file does not matter, you have
overreached. Write the sentence that tells them what was and was not found instead.

## Ratios

Add reached-only ratios **beside** the existing keys, never replacing or redefining one. Ratio keys
and rule ids are stable: scorecard rows and the calibration corpus key on them. A row that gains a
key stays comparable; a row whose key changed meaning is a silent rewrite of history, and
`hashConfig` will not save you because the key name did not change.

## Acceptance

- A fixture with a literal in a file nothing imports: the finding is reported, marked, and still
  counted in the unfiltered total.
- A test asserts the strings `dead`, `unused` and `safe to delete` appear nowhere in any output
  path for this feature. Cheap, and it pins the claim limit against a future rewrite.
- A finding covered by a recorded decision names that decision.
- Existing ratio keys keep their exact meaning. A test pins this.
- `npm run check && npm run type-check && npm test && npm run build && npm run smoke`.

## The precision gate — this is the part that matters

Every precision defect in this repo was invisible to unit tests and found by running the tool on a
repository nobody here wrote. `/tmp/precision/primer`, `/tmp/precision/posthog` and
`/tmp/precision/excalidraw` are on disk and need no network.

Run this on at least two of them. Take the files marked as having no static importer, **open a
sample by hand, and check whether that is actually true.** Report the number you checked and how
many were wrong. A reachability signal that is 80% right is worse than none, because it will be
believed.

Expect to find false "unreached" results in a monorepo with path aliases: PostHog imports
`~/scenes/…` and `lib/components/…` through build aliases, and a naive resolver reports both as
unresolved. That exact case produced a false positive in the coverage work last week. If your
resolver cannot follow an alias, say so in the report and classify those as **unresolved**, which is
a third state, not as unreached.

Write `docs/plans/2026-09-30-phase-12-report.md`: what you changed, the hand-check results with
counts, which aliases or import forms your resolver could not follow, and anything in section F you
did **not** do and why. If something in the plan turned out wrong, say so plainly rather than
working around it silently.
