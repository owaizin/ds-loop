# Choose your first task

DS Loop combines an agent skill for design-system work with an engine that checks supported code. Choose a task based on your team's situation. Scanner silence does not tell you whether a design system exists.

## Start a design system

**Bring:** a real screen or flow, product constraints, and any visual direction.

**Your agent does:** inspect the UI, look for conventions already in use, and propose a small foundation with a rendered example. No documented convention does not mean no convention exists; resolve the unknowns from the code or team.

**You receive:** proposed conventions, a product example, and the decisions your team needs to make.

**Review:** whether these choices fit the screen and should be reused. Then authorize applying them where useful.

> Read node_modules/ds-loop/skill/SKILL.md. Help establish shared form styles for our settings screen in src/settings/. Read existing UI, product notes, and any team conventions first. Propose the smallest useful set of spacing, type, color, and field patterns, with a rendered example. Keep the first proposal within this screen; do not migrate other screens. State what needs a team decision and where the chosen conventions will live.

## Improve a partial system

**Bring:** one inconsistency, the component, and the intended behavior.

**Your agent does:** trace existing patterns and consumers, compare behavior, and make an authorized repair or explain why the difference should stay.

**You receive:** a checked change or documented exception with the reason and affected files.

**Review:** the improvement and any behavior that must stay unchanged. A shared-token change may affect other components.

> Read node_modules/ds-loop/skill/SKILL.md. Investigate why the primary button in src/settings/ differs from the shared Button. Check its states, themes, and existing decisions. If it is unintended drift, fix it within this screen and verify the result. If the difference serves a real need, keep it and record why. Do not change the shared scale or other screens without resolving that wider scope. Link the before/after evidence and the saved decision.

## Maintain an existing system

**Bring:** a diff or feature, component contracts, and previous decisions.

**Your agent does:** review against those commitments, run applicable checks, and separate regressions from existing issues.

**You receive:** a review with source locations, check results, and unresolved questions.

**Review:** whether the change honors the system across affected states and themes. Add [edit feedback or CI](reference.md) after choosing a policy.

> Read node_modules/ds-loop/skill/SKILL.md. Review my current diff against this project's design-system conventions and previous decisions. Trace the changed components across their affected states and themes. Report regressions separately from pre-existing issues, with source locations and checks that could not run. Make no code changes in this review. Link any decisions a later task needs to follow.

## Three connected loops

The adoption loop sets the direction: gather measurements, understand coverage and existing commitments, choose an action for this scope, verify the real flow, and save the decision. Start, Improve, and Maintain change the action and deliverable; they are not scanner-derived maturity grades.

The audit loop supports a particular change: run context and an unfiltered audit, interpret the findings against intended behavior, change or preserve the code, rerun the audit, and review the real experience. Revise when evidence calls for it. A remaining finding can represent a justified exception or a checker limitation.

The optional guard loop runs during supported Claude Code edits: enable the hook, edit, audit the edited file, report high-severity findings and newly detected project extraction gaps, then review and revise if needed. It runs after the edit and cannot block it. Lower-severity judgment limits still require an unfiltered audit; CI gating is separate.

The loops share your existing project conventions and the decisions you retain. DS Loop does not maintain a central knowledge service or independently approve and ship changes. The website's guide provides an interactive version at `docs.html#loops`.

## Work with your agent

Replace example paths with your own. Give a concrete outcome and state what the agent may edit. The agent reads existing decisions, runs context and an unfiltered audit, and reports coverage gaps. It can carry out already authorized work. It asks when missing product intent or a wider change needs your decision.

Unread source needs another checker or manual inspection. Unfamiliar names need investigation of the actual naming contract. Configure the scanner only if it can represent that contract; changing configuration is not evidence that the product improved.

For visible changes, compare rendered before and after states. Rerun the unfiltered audit and checks that observe the affected behavior. Preserve the source revision, diff, and configuration with the evidence. Separate existing defects from regressions.

## Review the handoff

The handoff links to changed files, actual checks and their limits, open questions, and a saved decision. The record explains what was chosen, why, the affected scope, and when to reconsider. Use an existing issue, component document, or decision directory; a new registry is not required. Name where the next task finds it.

For an adoption pilot, ask a separate agent session to retrieve and apply that decision. Writing a record alone does not prove retrieval, suppress a finding, or create a checker.

See the [complete synthetic example](example.md) and its saved decision. Use the website preview to see the rendered before and after.
