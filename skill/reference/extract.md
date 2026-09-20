# extract

Move a pattern that consumer code has re-implemented into the system, then
migrate the call sites.

**This document is the whole implementation** — a playbook you execute. There is
no `extract` command; anything you report from it is your reasoning, not engine
output. It is written against the evidence this engine actually produces, and it
is deliberately narrow: the engine reads token values, not component structure,
so most of the judgement here is yours and has to be stated as such.

## What the engine can and cannot tell you

Run `audit <path> --json` without a severity filter. The report contains findings,
coverage, and aggregate measurements; it does not expose every adapter record.
For `token/raw-value-in-markup`, `data` includes occurrence and distinct-value
counts, matching declared tokens, and up to 40 example hits with source locations.
That sample is not a complete inventory. Inspect the relevant source to locate
all consumers before planning a migration.

Internally, the engine uses `tokenName: null` to distinguish a use site from a
token declaration. Repeated literals can suggest a shared token or component,
but their purpose and surrounding structure require inspection.

Group repeated values by meaning and use, not just by occurrence count. The same
value may serve different purposes, and one shared pattern may use several values.
Report both occurrence and distinct-value counts with the inspected scope; neither
count alone estimates the migration work.

What it cannot tell you: that a pattern is a component. The adapters read CSS
custom-property declarations and selected Tailwind arbitrary values and stock-palette
utility names in string literals; they do not resolve the framework theme. Resolved named utilities (`rounded-md`, `p-4`), CSS rule bodies, and
anything computed at runtime are invisible to them. **No findings in a directory
is not evidence that nothing is duplicated there** — say which of the two you
have. Structural duplication is `census`'s territory, and `census` is also a
playbook, not a clusterer.

## Sequence

1. **Establish the target's contract first.** `context .` names the intent
   sources it found, including root agent instructions. Read those and check
   relevant nested instructions, foundation docs, component contracts, and recent
   component PRs that the command does not discover. Absence of a
   `DESIGN-SYSTEM.md` is not absence of policy.
2. **Locate the pattern in evidence.** Name the call sites and their intent.
   Establish the maintenance or capability benefit of sharing and the compatibility
   cost. Honor an adopted reuse threshold; otherwise avoid a universal count gate.
   Similar appearance alone does not justify merging different contracts.
3. **Decide the lane, and label it.** Is there an existing commitment this code
   drifted from (**adopt** it), an intentional exception (**maintain** it), or no
   decision yet for this scope (**establish** the smallest one that covers the
   located consumers)? A new foundation presented as a repaired violation is the
   failure mode; say which one this is.
4. **Derive the API from the call sites, not from a target shape.** What varies
   across them is the prop surface; what is constant is the default. `shape
   <component>` carries the open questions worth asking — ask only the ones whose
   answer changes what you build.
5. **Build it the way this project builds components.** Read existing components,
   stories and tests before creating anything. Follow the project's structure.
   Preserve existing evidence when adding or editing examples; do not replace an
   unrelated story with a temporary harness.
6. **Capture a rendered baseline before the first edit** for anything visible or
   interactive, then verify the same views after. Record pre-existing defects
   separately from regressions; a defect you did not introduce is not yours to
   fix inside this task, and hiding it behind a passing change is worse than
   leaving it visible.
7. **Adopt within the agreed scope.** Migrate a representative consumer first and
   verify compatibility. Incremental adoption is valid when remaining consumers,
   old/new contract boundaries, ownership and removal conditions are explicit.
   Remove old implementations only after their consumers are accounted for. Do not
   claim consolidation complete while necessary migrations remain, or expand scope
   merely to eliminate every old path. Include rollback and release responsibilities
   for shared changes using [engagement](engagement.md).
8. **Close the loop.** Re-run the unfiltered audit and whatever observes the
   changed behaviour. Record source revision *and dirty diff*, config hash,
   coverage limits, and what changed. If you changed config, you changed the
   instrument: `scorecard` refuses to call that a delta, and so should you.
   Put the decision where this team already records decisions, and name the path.

## Report separately

Measured results (occurrence and distinct counts, before and after, with the
coverage the audit stated), design judgement (the lane, the API, what you
declined), and unresolved questions. A justified no-op is a valid result of this
playbook.

## Scope

[scope.md](scope.md) applies before editing. Findings do not grant scope: an
audit finding does not authorise changing every matching use site.
