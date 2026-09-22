---
name: ds-loop
description: Diagnose design-system problems and guide establishment, adoption, component contributions, and maintenance using repository evidence and the team's commitments. Use when starting a system, resolving inconsistent UI foundations, helping developers reuse a library, or reviewing a shared change. Includes deterministic token checks; not general product strategy or isolated screen styling.
metadata:
  version: 0.2.1
---

# Design System Loop

Help a team solve the design-system problem that brought them here. Carry the work
from understanding the problem through delivery, verification and handoff. The
user should not have to choose an internal playbook or interpret a report alone.

## Who does what

| Owner | Responsibility |
|---|---|
| npm engine | Deterministic extraction, rules, coverage, narrow mechanical fixes, measurement history, and optional edit feedback. No interview, design judgment, component inventory, or business-impact measurement. |
| Agent following this skill | Diagnose with repository and runtime evidence; recommend and execute authorized work; explain tradeoffs; verify outcomes; retain decisions and continuation context. |
| Team / existing owner | Product priorities, shared policy and compatibility decisions, acceptance where required, and release authority. Preserve existing delegation; do not invent an approval committee. |

Installing the npm package provides the CLI and skill files. The guided journey
starts when the coding agent loads this skill. Installation and the hook do not
start an agent, schedule maintenance, or certify the UI.

`<skill-base-dir>` in these instructions means the directory containing this
`SKILL.md`, usually `node_modules/ds-loop/skill`. Its launcher is
`<skill-base-dir>/bin/ds-loop`; the package root's launcher is `bin/ds-loop.mjs`.
Resolve the skill path before running commands and keep cwd at the target project.

## Start with the person's task

1. Recover the user's goal and any prior task/decision record. Say what you will
   investigate or deliver in one sentence. For a bare invocation, ask what brought
   them here while doing a small read-only orientation. Reuse a supplied goal;
   do not lead with a command menu or require a maturity label.
   If asked to start fresh, set aside prior session diagnoses, backlog and inferred
   priorities. Read current repository instructions and investigate again; do not
   reintroduce old conclusions as evidence for the new engagement.
2. Read applicable repository instructions before running project tooling. Locate
   the relevant product/package, existing components, consumers, intent records,
   and checks. Keep cwd at the target project. Run
   `<skill-base-dir>/bin/ds-loop context .`, then
   `<skill-base-dir>/bin/ds-loop audit . --json` without a severity filter. Retain
   coverage and scope. `context` runs no rules; the high-severity hook does not
   replace this audit. If no code exists, say there is no code baseline and work
   from the product brief and a representative use case.
   Report what was read before reporting what is wrong: the source, the formats
   no adapter covers, and the checks that could not judge. A findings list handed
   over without its coverage invites a conclusion the run cannot support.
3. Ask about unknowns that could change the next action. For broad pain, uncertain intent, or a
   first system, read [discover.md](reference/discover.md): diagnose before choosing
   a route. For a specific authorized task, use [routing.md](reference/routing.md)
   to go directly to the relevant work. A returning task resumes from retained
   context after checking what changed; it does not repeat the initial interview.
   "Guide me" is a request for you to lead discovery. Establish the outcome or
   propose a bounded investigation before ranking repairs; audit severity does not
   establish the team's priority. Load the relevant playbook yourself.
4. Explain the first useful delivery and its finish line. Use
   [engagement.md](reference/engagement.md) when presenting a diagnosis and plan,
   coordinating adoption, handing off to a specialist, or closing/resuming work.
   A small settled edit needs only a short plan. Apply
   [scope.md](reference/scope.md) before editing.

Use [engagement.md](reference/engagement.md#keep-the-user-oriented)'s compact views
when a task has several steps or needs a decision. Show actual state, next action
and finish line. A small repair needs only a short sentence; the engine does not
generate or track the agent's engagement progress.

## Choose from intent and evidence

These describe the relevant product area, not company maturity or CLI verdicts.

| Situation | Intervention |
|---|---|
| No agreed convention for the needed behavior | **Establish:** follow [establish](reference/establish.md) to build the authorized foundation, primitives, product patterns, usage guide and maintenance paths. Reuse suitable existing foundations. A pilot is a checkpoint unless it is the requested outcome. |
| Existing foundation with a demonstrated gap | **Improve / adopt:** distinguish drift, missing capability, discovery friction, intentional difference, or unsuitable policy. Repair the cause, which may be guidance or ownership rather than code. |
| Established commitments serving the task | **Maintain:** use or review them; preserve valid exceptions. A recurring unmet need can become a separately scoped contribution. |
| Evidence or scanner coverage is insufficient | Investigate the missing observation; use appropriate existing checks or manual inspection. Do not force an adoption route or report silence as a pass. |

`token/tier-model-undetectable` measures coverage against configured naming
patterns and is silent at zero references. It cannot choose a route. Configure
patterns from actual naming commitments; do not rename the product to satisfy
scanner assumptions. Missing `DESIGN-SYSTEM.md` does not mean missing intent.
`context --write-contract` is an optional measured draft with unresolved decisions,
not an authoritative policy or proof of retrieval.

The CSS adapter reads custom-property declarations, not ordinary rule bodies.
The Tailwind adapter reads selected arbitrary values and stock-palette utility
names in strings, without resolving the framework's theme. Inspect effective
values and project permission separately. For scoped palette checks, map the
applicable CSS declarations using
`tokenContexts`; see [audit](reference/audit.md). Missing context is reported as
unjudged. These associations do not resolve imports, prove theme policy, or add
context to other rules.

## Deliver and close

State the permitted scope and behavior to preserve. Use existing stories/tests
before creating a harness. For visible or interactive changes, capture a rendered
baseline and check affected behavior after the change. Separate existing defects
from regressions. If access prevents a needed check, report incomplete verification
and the concrete next action; source inspection is not rendered evidence.

Before claiming completion, rerun the unfiltered audit and appropriate behavior
checks. Keep source revision and relevant dirty diff, config, coverage and result
attributable. A changed configuration changes the instrument; fewer findings alone
do not prove improvement. A review can finish with reported findings. A justified
no-op can complete an investigation. Neither implies an implemented repair.

Use [engagement.md](reference/engagement.md)'s completion receipt to connect the
original problem to the actual outcome, evidence, remaining limits, and next step.
Retain meaningful decisions in the team's existing home and verify their discovery
path. A fresh-context continuation is required for an adoption pilot's retrieval
claim; an ordinary edit need not create a new pilot or document set.

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
| `start [path]` / bare `ds-loop` | **CLI** | Meta | Verdict for this directory, its biggest finding, what was read, and the next command. The audit's own numbers, summarised — not a separate measurement | — |
| `context [path]` | **CLI** | Meta | What this session is working with: config loaded, usual intent-source paths found, extraction coverage. `--write-contract` starts `DESIGN-SYSTEM.md` from measured counts, with the decisions the tool cannot read left as TODO | — |
| `audit [target]` | **CLI** | Audit | Every deterministic rule that speaks to `<target>`. Severity-ranked findings, scorecard ratios, and a `next` block naming the follow-up command. No LLM, no network | [reference/audit.md](reference/audit.md) |
| `scan [path]` | **CLI** | Audit | Quick look: classification breakdown + palette clusters at the default ΔE | — |
| `sweep [target]` | **CLI** | Audit | CIEDE2000 ΔE cutoff sweep — the colour-domain calibration curve | [reference/sweep.md](reference/sweep.md) |
| `guard [on\|off\|status]` | **CLI** | Guard | Install/remove the edit-time `PostToolUse` hook | [reference/guard.md](reference/guard.md) |
| `fix [target] [--write]` | **CLI** | Guard | Apply the mechanical fixes only — where the edit is provable from the code, no LLM. v0: inserts a `var()` fallback from the target token's literal. Dry run unless `--write` | — |
| `discover` | playbook | Discover | Read repository evidence, resolve consequential unknowns, record a bounded adoption decision | [reference/discover.md](reference/discover.md) |
| `census [target]` | playbook | Discover | Scoped component and consumer inventory; validate duplication candidates and prioritize by impact | [reference/census.md](reference/census.md) |
| `drift [target]` | playbook | Audit | Compare a fresh `audit` against a committed baseline by hand; report what regressed | [reference/drift.md](reference/drift.md) |
| `establish` | playbook | Build | Set up a usable, editable system for the agreed product scope; verify use, customization and extension | [reference/establish.md](reference/establish.md) |
| `tokenize [target]` | playbook | Build | Implement an agreed token source and any required consumer formats/checkers | [reference/tokenize.md](reference/tokenize.md) |
| `scaffold [target]` | playbook | Build | Set up minimal component documentation or Storybook when useful; preserve the project's structure; optional specialist for deeper management | [reference/scaffold.md](reference/scaffold.md) |
| `extract [target]` | playbook | Build | Move a pattern consumer code re-implemented into the system, matching the project's own component contract, then migrate the call sites | [reference/extract.md](reference/extract.md) |
| `shape <component>` | playbook | Review | Resolve need, contract, consumers and accessibility for a new or substantially changed component | [reference/shape.md](reference/shape.md) |
| `review <component>` | playbook | Review | Evidence-based component review against applicable contracts; distinguish failures, proposals and unchecked behavior | [reference/review.md](reference/review.md) |
| `scorecard [path]` | **CLI** | Guard | Append ratios to `.ds-scorecard/history.jsonl` in cwd; `--dry-run` previews without writing; CI scheduling is separate | [reference/scorecard.md](reference/scorecard.md) |
| `doctor` | playbook | Meta | Drift between `DESIGN-SYSTEM.md`, the token files, config, and the guard hook | [reference/doctor.md](reference/doctor.md) |

`CLI` means the engine implements it. Exit behavior is command-specific: `audit` exits 1 on
surviving findings, while `scorecard` records measurements and is not a CI gate. `playbook` means the agent follows written instructions.
Attribute its conclusions to your investigation; keep them separate from engine
output. Do not paraphrase a playbook result as if a rule produced it.


CLI audit targets (`--target`) are `all`, `tokens`, `color`, `spacing`,
`typography`, `elevation`, and `motion`. The positional argument is a source path.
A component name or category is a scope for an agent playbook, not a CLI target.

## What runs automatically

`audit` runs the registered token/color rules over supported extracted values;
`sweep` measures the configured color-clustering curve. `drift`, `census`,
`shape`, `review`, `discover`, `establish`, `tokenize`, `scaffold`, `extract`, and `doctor`
are agent procedures, not executable CLI commands.

`guard` runs a file-scoped audit after supported Claude Code edits. It reports
high-severity findings and project extraction-coverage changes; it cannot block
an edit and does not execute design judgments. If the audit fails, the hook reports
that the edit was not checked; resolve the error before relying on it. An optional CI command is
`audit . --min-severity high --require-coverage`: a pass means no findings at
that floor and no reported coverage gaps within the adapters' stated scope,
not that all CSS or product behavior was checked. Use an unfiltered audit to
see the lower-severity findings.

## Contribution judgment

Use the target project's adopted contract and compatibility obligations. When no
API limit is agreed, report the relevant complexity and consumers rather than
inventing a hard cap. A zero-use search inside one checkout does not prove that a
published API has no consumers. [review.md](reference/review.md) defines the review
procedure; [shape.md](reference/shape.md) covers new or materially changed contracts.

Keep findings, proposals and authority distinct. A reproducible defect deserves a
clear disposition; a stylistic preference is a recommendation with rationale.
Existing team gates remain in force. This skill and its post-edit hook do not gain
merge authority by assigning a severity label.
