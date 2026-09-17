---
name: ds-loop
description: Audit token code and guide bounded design-system adoption, maintenance, and component governance using the project's own conventions. Use for establishing a system, repairing a partial one, or checking an existing library. Not for isolated screen styling or product strategy.
metadata:
  version: 0.1.1
---

The engine measures token code. The skill uses those measurements and the
project's commitments to decide what to establish, adopt, or preserve. Findings
are candidates for investigation; they do not establish the team's policy.

## Start with the project

1. Keep cwd at the target project. Run `<skill-base-dir>/bin/ds-loop context .`
   once at setup, then `<skill-base-dir>/bin/ds-loop audit . --json` unfiltered.
   Retain the report, including coverage. `context` runs no rules; the hook filters
   at high severity. Neither replaces this audit.
2. Read applicable repository instructions and the actual sources of design intent:
   contribution guides, foundation docs, component contracts, decisions, lint
   configuration, and relevant tests/stories. `context` searches a short list of
   paths; it does not discover or interpret all of these. Missing `DESIGN-SYSTEM.md`
   is not evidence that a system or policy is absent. Check what a dependency
   resolves separately from whether the project permits that choice.
3. Resolve only the unknowns that affect this task. Source code establishes current
   behavior; an applicable policy establishes an intended constraint. A conflict
   between them is evidence to investigate, not grounds to automatically prefer
   the code. If authority is unclear and the answer changes the intervention,
   ask the team while continuing independent inspection.
4. For an explicit or clearly implied task, use its playbook below. For a bare
   `/ds-loop` invocation, present [routing.md](reference/routing.md)'s menu after
   the read-only setup; do not start a migration. Apply
   [scope.md](reference/scope.md) before editing.

## Choose a bounded next action

These are task states inferred from evidence, **not CLI verdicts or maturity scores**:

| Evidence | Next action |
|---|---|
| Files or values are unread, or observations are insufficient | State the blind spot. Inspect relevant source manually or use a suitable existing checker; do not call the system clean. |
| Token references exist but naming is unfamiliar | Read the naming contract. Configure existing taxonomy patterns only when they represent it faithfully; rerun and retain both reports. Do not rename the product to fit the scanner. |
| The investigation establishes that no convention has been chosen for this scope | **Establish:** propose the smallest foundation for one concrete use case, with its tradeoff and acceptance check. Label it a new decision, not a repaired violation. |
| A relevant commitment exists | **Adopt** it where evidence shows drift, or **Maintain** an intentional exception. Preserve working behavior and bound the affected consumers. |

`token/tier-model-undetectable` describes coverage against configured naming
patterns. It is silent at zero references. Neither its presence nor absence
selects an adoption lane. A scanner's supported syntax is also narrower than a
file extension: CSS rule bodies and resolved Tailwind named utilities are not
checked by the current adapters.

For an intervention, state the permitted files and the behavior that must survive.
Read existing stories/tests before creating a harness. For visible or interactive
changes, capture a rendered baseline and verify affected behavior before and after;
separate pre-existing defects from regressions. A justified no-op is a valid result.
For a small settled edit, reuse existing evidence and checks; do not require a
system-wide interview or new documentation set.

## Close the loop

Before declaring a change complete, rerun the unfiltered audit and the checks that
actually observe the changed behavior. Record source revision **and dirty diff**,
configuration, coverage limits, and what changed. Changing config changes the
instrument; it is not evidence that the product improved.

Put any new system decision in the team's existing issue, ADR, component contract,
or equivalent location. Create a small decision file only if there is no suitable
home. Record the authority/evidence, chosen action (including no-op), affected
scope, actual checks and limits, and what would justify revisiting it. Name the
path and how the next task finds it; add a link from an existing entry point when
needed. Writing a record does not suppress a rule or create a checker.

For an adoption pilot, use a fresh-context continuation to check retrieval. For
routine work, verify the discovery path without turning every edit into a pilot.
Report measured results, design judgment, and unresolved questions separately.

## Token models are project decisions

Palette → semantic → component is the engine's configurable tier assumption, not
a universal adoption requirement. State variants may use the project's own
structure; the engine does not validate a fourth state tier. Preserve a valid
existing model. If it cannot be represented by this engine, say the tier checks
are not applicable rather than declaring that model broken.

CSS plus design-token JSON is one possible distribution choice. Keep the project's
source of truth; add another format only for a named consumer. CSS/JSON parity,
component-file contracts, and MDX validation need separate project checkers.
Design System Loop does not ship those checks.

## Commands

| Command | Built? | Category | Description | Reference |
|---|---|---|---|---|
| `context [path]` | **CLI** | Meta | What this session is working with: config loaded, usual intent-source paths found, extraction coverage | — |
| `audit [target]` | **CLI** | Audit | Every deterministic rule that speaks to `<target>`. Severity-ranked findings + scorecard ratios. No LLM, no network | [reference/audit.md](reference/audit.md) |
| `scan [path]` | **CLI** | Audit | Quick look: classification breakdown + palette clusters at the default ΔE | — |
| `sweep [target]` | **CLI** | Audit | CIEDE2000 ΔE cutoff sweep — the colour-domain calibration curve | [reference/sweep.md](reference/sweep.md) |
| `guard [on\|off\|status]` | **CLI** | Guard | Install/remove the edit-time `PostToolUse` hook | [reference/guard.md](reference/guard.md) |
| `fix [target] [--write]` | **CLI** | Guard | Apply the mechanical fixes only — where the edit is provable from the code, no LLM. v0: inserts a `var()` fallback from the target token's literal. Dry run unless `--write` | — |
| `discover` | playbook | Discover | Read repository evidence, resolve consequential unknowns, record a bounded adoption decision | [reference/discover.md](reference/discover.md) |
| `census [target]` | playbook | Discover | Component inventory: scan, cluster near-duplicates, rank by usage × blast radius | [reference/census.md](reference/census.md) |
| `drift [target]` | playbook | Audit | Compare a fresh `audit` against a committed baseline by hand; report what regressed | [reference/drift.md](reference/drift.md) |
| `tokenize [target]` | playbook | Build | Implement an agreed token source and any required consumer formats/checkers | [reference/tokenize.md](reference/tokenize.md) |
| `scaffold [target]` | playbook | Build | Generate the Storybook spine, foundations pages, the 5-file component contract, the validators | [reference/scaffold.md](reference/scaffold.md) |
| `extract [target]` | playbook | Build | Move a pattern consumer code re-implemented into the system, matching the project's own component contract, then migrate the call sites | [reference/extract.md](reference/extract.md) |
| `shape <component>` | playbook | Review | Phase 0 design-intent interrogation before a new component | [reference/shape.md](reference/shape.md) |
| `review <component>` | playbook | Review | Full component audit — API caps, token hygiene, story structure, a11y, MDX | [reference/review.md](reference/review.md) |
| `scorecard [path]` | **CLI** | Guard | Append ratios to `.ds-scorecard/history.jsonl` in cwd; `--dry-run` previews without writing; CI scheduling is separate | [reference/scorecard.md](reference/scorecard.md) |
| `doctor` | playbook | Meta | Drift between `DESIGN-SYSTEM.md`, the token files, config, and the guard hook | [reference/doctor.md](reference/doctor.md) |

**`CLI` means the engine implements it** — it is implemented. Exit behavior is command-specific: `audit` exits 1 on
surviving findings, while `scorecard` records measurements and is not a CI gate. **`playbook` means this document is the whole implementation:**
you are the executor, and anything you report from one is your reasoning, not engine
output. Do not paraphrase a playbook result as if a rule produced it.


CLI audit targets (`--target`) are `all`, `tokens`, `color`, `spacing`,
`typography`, `elevation`, and `motion`. The positional argument is a source path.
A component name or category is a scope for an agent playbook, not a CLI target.

## What runs automatically

`audit` runs the registered token/color rules over supported extracted values;
`sweep` measures the configured color-clustering curve. `drift`, `census`,
`shape`, `review`, `discover`, `tokenize`, `scaffold`, `extract`, and `doctor`
are agent procedures, not executable CLI commands.

`guard` runs a file-scoped audit after supported Claude Code edits. It reports
high-severity findings and project extraction-coverage changes; it cannot block
an edit and does not execute design judgments. An optional CI command is
`audit . --min-severity high --require-coverage`: a pass means no findings at
that floor and no reported coverage gaps within the adapters' stated scope,
not that all CSS or product behavior was checked. Use an unfiltered audit to
see the lower-severity findings.

## The restraint doctrine

Default stance: skeptical of additions. API-surface caps, per component's *added*
public API — soft cap = justify in writing, hard cap = fails review.

**The numbers are engagement-derived examples, not universal thresholds.** They come from
one engagement and one library. Resolve them from `DESIGN-SYSTEM.md` frontmatter or
the project's own contribution guide first; fall back to these and say you are
falling back. [reference/review.md](reference/review.md) is the single source —
it carries the table and the resolution order.

Where a project has stated no limit, report the count and which components are
outliers against that project's own distribution. Do not enforce a cap the target
never agreed to.

Many booleans = a missing variant. A prop with no known usage is a review question; check external consumers
and compatibility commitments before proposing removal.

## NEVER

- Expand a scoped task into a production migration. Findings do not grant scope.
- Add `tags: ['autodocs']` to a story that has a guidelines MDX.
- Ship an interactive component without the accessibility contract from day one.
- Let a reuse or slop check block a merge. Comment only.
