# Design System Loop — the developer journey

Superseded as the primary onboarding proposal by [Website onboarding and three user journeys](ONBOARDING-AND-THREE-JOURNEYS-2026-09-19.md), which incorporates the user's clarified scope and Claude's review. This earlier document remains as the task-level journey discussion.

Proposed experience, 19 September 2026. This is a UX design proposal, not a description of released automation. Examples are synthetic. No engine, skill, or website changes are included.

Illustrated journey (local preview): [developer-journey.png](/Users/owais/.codex/visualizations/2026/09/19/design-system-loop-journey/developer-journey.png).

Review brief for Claude: check this proposal against the current skill and engine. Distinguish existing guidance from missing conversation design; challenge the entry choices, decision ownership, completion criteria, and returning-session behavior. Recommend the smallest coherent skill changes. Review only; do not implement changes yet.

## The product decision

The developer brings a product task. Design System Loop takes responsibility for guiding that task through the project's design system: find what exists, identify the decision, recommend an approach, help implement within scope, verify the experience, and leave a discoverable record.

The npm engine is the measurement tool. The skill is the agent's working method and conversation. The developer supplies product intent; the project's owners retain authority over shared conventions, compatibility, and releases. A skill can coordinate this work without becoming an autonomous replacement for a design-system team.

## What exists, and why it feels fragmented

Repository inspected: skill/SKILL.md, reference/routing.md, reference/discover.md, reference/scope.md, reference/doctor.md, docs/guide/install.md, docs/guide/workflow.md, src/core/next.ts.

1. Installation and activation are separate. npm installs the engine and skill files. The install guide requires the user to ask the agent to load node_modules/ds-loop/skill/SKILL.md; agent discovery depends on the host. A successful terminal audit does not mean a guided agent session has started.
2. The skill opens with context and an unfiltered audit before a bare invocation receives a menu. Read-only evidence gathering is useful, but a newcomer has not yet been told what the session will accomplish or how long its scope extends.
3. The menu names internal procedures such as census, tokenize, scaffold, and doctor. It asks the developer to select a method before the skill has established their job. It also groups being new to an existing system with starting from nothing, although these require different help.
4. Guidance exists: consequential questions, bounded scope, rendered verification, no-op outcomes, and saved decisions are already in the skill. The gap is a consistent user-facing sequence that makes those obligations visible and carries them across playbooks.
5. The CLI's next actions are commands. “Decide on the rest” leaves the central design decision with a user who came for guidance. Scorecard and guard recommendations are not task-completion criteria.
6. The skill describes closure, but does not require a concise opening agreement or a consistent completion receipt. There is no reliable conversational indication of “we are here; this is the next action; this is what will finish the task.”

This is analysis of the current instructions plus the user's dogfooding report. It is not a fresh usability study or a claim that every agent follows these instructions identically.

## One front door, four jobs

Suggested opening when no task is already supplied: “What are you trying to get done?”

| Developer's job | Skill's first move | Useful result | Stop for this session |
| --- | --- | --- | --- |
| “Help me use our system to build this feature.” | Find applicable components, examples, contracts and previous decisions. | A working feature using existing patterns, with necessary local adaptation. | Agreed behavior checked; review handoff ready. |
| “Something looks or behaves inconsistently.” | Trace the difference to its source and compare it with intended behavior. | A repair, an intentional exception, or a specific unresolved decision. | Difference explained and the agreed disposition verified or assigned. |
| “Help us establish or improve the system.” | Inspect representative product flows, existing commitments, consumers and ownership. | A prioritized system plan plus one representative pilot. | Pilot reviewed; broader rollout has an explicit scope and owner. |
| “Review my change before I ship.” | Read the diff and the applicable system commitments. | Regressions, limits, and concrete actions, separated from existing debt. | Requested review delivered; implementation is a separate task unless already authorized. |

“Continue previous work” should retrieve its goal, evidence, decision and unresolved next action before asking new intake questions.

Use natural-language requests. These are interaction choices, not proposed additional CLI commands. The agent chooses the existing playbook after understanding the job.

## Illustrated primary journey

Synthetic example: a developer is adding an account-settings form in an established multi-module product. This deliberately starts with shipping useful product work, not cleaning a warning list.

### 1. Bring the job

Developer: “I'm adding an account-settings form. Help me use our system.”

Skill: “I'll look for the existing form pattern and its states. Which settings flow is this for?”

Ask only if the task or available files do not already answer. Resolve the required outcome, affected scope and behavior that must survive. Establish these before letting findings expand the work.

Receipt: goal and scope. On first activation, confirm that the skill loaded and the engine is available; explain any missing prerequisite with one exact action. Do not claim npm installation automatically activates an agent skill.

### 2. Get oriented

Skill: “The shared Form, Field and Button cover most of this. The current settings page has an existing validation pattern. I couldn't find a decision for unsaved changes.”

Inspect relevant code, instructions, stories, decisions and rendered behavior. Run context and unfiltered audit as supporting evidence. Clearly distinguish observed code, declared policy and unknowns. If evidence is unavailable, name the next observation rather than guessing.

Receipt: what to reuse, the relevant limits, and at most the consequential unresolved questions. Keep raw findings available, but lead with what matters to this task.

### 3. Agree the approach and finish line

Skill: “Use the shared form components and retain the existing validation behavior. Keep the unsaved-changes handling local for this pilot. We finish when keyboard navigation, errors, saving, and supported themes are verified.”

Give one recommendation, why it fits, and the material alternative where there is a real tradeoff. Ask for a decision only when intent, authority or additional scope is missing. Continue already authorized work without repeated approval prompts.

Decide between reuse, local adaptation, a justified exception, and a shared-system proposal. A missing shared component does not automatically justify creating one. Shared API or token changes require examining affected consumers and the project's ownership process.

Receipt: bounded approach, checks and limits, with larger questions parked explicitly.

### 4. Build together

Implement within the agreed boundary. Reuse existing tests and stories, retain a rendered baseline, and inspect real states rather than assuming the scanner observes them. State a changed assumption when new evidence alters the plan.

Skill: “The form now uses the shared fields. I preserved the save behavior. The broader navigation pattern stays outside this change.”

Receipt: reviewable diff and a running example. The engine's fix command only supports its actual mechanical transforms; the agent performs other authorized code work.

### 5. Verify the experience

Compare before and after in the affected flow; test applicable keyboard, focus, error, loading, theme and responsive states. Rerun the unfiltered audit, separating new regressions, existing debt, exceptions and checks that could not judge.

Skill: “The agreed states passed these checks. One pre-existing issue remains outside scope. The audit doesn't test interaction behavior.”

A failed acceptance check returns to the relevant implementation or design decision. Missing evidence is a stated verification gap, not a pass. An issue count is not a substitute for the acceptance criteria.

Receipt: actual evidence against the finish line.

### 6. Finish and remember

Skill: “Ready for review. Here's the diff, the checks and their limits, and the saved decision. The next task can find it through the existing component documentation.”

Use the team's existing issue, ADR or component contract. Record only new consequential decisions; do not create mandatory paperwork for routine reuse. End explicitly. Do not automatically start another cleanup because other findings exist.

Possible terminal outcomes: ready for review; no change needed with evidence; awaiting a named decision; or blocked on specific missing evidence. Never present the latter two as verified implementation success.

Receipt: outcome, evidence, decision location where needed, and any owned follow-up. Merging and releasing follow the project's existing authority.

On the next task, retrieve the relevant decision and resume. Refresh stale evidence when source or configuration changed. Optional edit feedback and CI support maintenance; they are not an automatic guarantee of product quality.

## The short interview

A first session needs a conversation, but a questionnaire is not the product.

- Outcome: “What are you trying to build, fix or decide?” Skip when the initial request already says.
- Boundary: “Is this one product area, or are we considering a shared-system change?” Infer from the task when possible.
- Consequential unknown: ask one repository-informed question, such as “Is this contrast difference intentional, and who owns that decision?” Avoid making the user explain facts the repository already contains.

Show what was learned before asking more. Newcomers can ask “I don't know where to start”; the skill then recommends a representative flow to investigate and explains why. Familiar routine work takes a fast path through the same checkpoints, with existing decisions and checks reused.

## What makes this work at company scale

Product work generates requests and evidence. The design-system function helps teams reuse existing solutions, supports justified adaptation, and coordinates changes whose impact crosses team boundaries. Adoption, support and retained decisions matter alongside code quality.

Atlassian's public contribution guidance describes questions, critique sessions, small fixes/enhancements and the wider coordination required for major changes. CMS explicitly distinguishes repeated cross-team needs from local compositions and describes proposal assessment, implementation, guidance and progress visibility. These are public reference points, not claims about Rippling's internal operations.

- https://atlassian.design/contribution
- https://design.cms.gov/getting-started/contribution-guidance/

For DS Loop this suggests two connected scales:

- Everyday help: get one developer's feature, inconsistency or review to a clear outcome.
- System stewardship: collect recurring needs across those tasks; propose shared changes with consumer evidence, an owner, compatibility considerations, rollout scope and an adoption check. Repeated use should inform the system roadmap, not automatically create global policy.

The bounded pilot is the first proof of a larger change, not the entire ambition of the product.

## What to change next

Keep the engine. Redesign the skill's front door and handoffs first.

1. Make activation explicit in installation and first-use instructions. The CLI reports measurements; the agent loads and follows the skill.
2. Put job-based intake before the internal procedure menu. Begin evidence gathering with a visible goal; avoid a whole-repo diagnosis when a smaller read is enough to orient the task. Preserve the required unfiltered audit and report its scope.
3. Require a short orientation and recommendation after discovery. “Decide on the rest” should become a reasoned recommendation inside the skill, with engine output available underneath.
4. Give every playbook the same compact handoff: current goal, next action, unresolved decision, completion evidence. Keep this conversational unless a durable record is needed.
5. Define the finish line before editing and a recognizable completion receipt afterward. Preserve no-op outcomes and existing authority boundaries.
6. Exercise four realistic tasks: first-time setup, a feature using existing components, a legitimate exception, and an unsupported scan. Add a returning-session test. Observe whether a developer knows what happens next and when the work is done without consulting the command inventory.

Acceptance questions for the redesigned skill: Did it understand the job? Did it find existing answers before interviewing? Did it recommend one justified path? Did it preserve scope? Did it verify the actual behavior? Could it finish with no change? Could a later session retrieve the decision?

## Image brief

Create an illustrated six-panel developer journey, with numbered stages and concrete conversational examples. Make the entry, task completion, and optional return unambiguous. Label the entire experience PROPOSED. Show the developer, agent skill and npm engine as separate roles. The engine is a supporting tool strip, not the protagonist. Use a synthetic settings-form example, no private project names or measurements, and no claims of shipped autonomous design governance.
