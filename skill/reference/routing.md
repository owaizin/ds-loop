# Route the request

The user describes an outcome; the agent chooses the procedure. Use this reference
before the first deliverable, after enough orientation to understand the task.
This includes inventories, diagrams and recommendations. State the selected work
and its finish line; do not produce an artifact and choose its route afterwards.
Offer the command catalog only when asked
what is available. These playbook names are not terminal commands.

| Request | First action | Relevant procedure | Role |
|---|---|---|---|
| Bare invocation or “help us with our system” | Recover the goal, investigate a concrete example, explain a recommended next step. | [discover](discover.md), then [engagement](engagement.md) | [auditor](../roles/auditor.md) → [consultant](../roles/consultant.md) |
| “Assess the whole system” | Establish evidence access and inspect the relevant areas; deliver a recommendation and work list. | [system-review](system-review.md), [consult](consult.md) | [consultant](../roles/consultant.md) |
| “Plan adoption / estimate a migration” | Map current patterns to verified targets, separate design/code work and sequence a first slice. | [adoption-plan](adoption-plan.md) | [consultant](../roles/consultant.md) → [migrator](../roles/migrator.md) |
| “Build us a design system” | Recover product scope and existing assets; choose a compatible base and deliver a usable, editable system across the agreed workflows. | [discover](discover.md) for unresolved intent, then [establish](establish.md) | [consultant](../roles/consultant.md) → [architect](../roles/architect.md) → [foundations](../roles/foundations.md) → [components](../roles/components.md) → [docs](../roles/docs.md) → [governor](../roles/governor.md) |
| “Our UI is inconsistent” / “people keep rebuilding components” | Diagnose whether the cause is missing capability, drift, poor discovery, or a deliberate difference. | [discover](discover.md); [census](census.md) only when an inventory answers the question | [auditor](../roles/auditor.md) → [consultant](../roles/consultant.md) |
| “Audit our tokens” | Run the requested measurement, explain relevant findings and limits. A review request does not authorize all repairs. | [audit](audit.md) | [auditor](../roles/auditor.md) |
| “Make our system LLM-readable” / “transform the system” | Recover the outcome and migration boundary, then baseline, decide, document and adopt in slices. | [transform](transform.md); use [establish](establish.md) for missing implementation | [consultant](../roles/consultant.md) → [architect](../roles/architect.md) → [migrator](../roles/migrator.md) → [docs](../roles/docs.md) → [governor](../roles/governor.md) |
| “Choose our typography / spacing / color foundations” | Recover constraints, compare viable options and retain the choice before dependent changes. | [foundations](foundations.md), then [tokenize](tokenize.md) | [foundations](../roles/foundations.md) → [architect](../roles/architect.md) |
| “Build or extend this shared component” | Check existing contracts, consumers and the actual gap; implement within scope. | [shape](shape.md), project build flow, [review](review.md) | [components](../roles/components.md) |
| “Review this component” | Review its behavior and contract without restarting company discovery. | [review](review.md) | [components](../roles/components.md) |
| “Review this diff” | Establish the actual base ref and relevant consumers. Use unfiltered `audit . --since <ref> --json`, plus review of behavior and dependency context. | [review](review.md); findings are scoped evidence, not a whole-product certification | [auditor](../roles/auditor.md) → [components](../roles/components.md) |
| “What regressed?” | Compare compatible retained measurements and actual behavior. | [drift](drift.md) | [auditor](../roles/auditor.md) → [consultant](../roles/consultant.md) |
| “Stop token regressions” | Identify the required channel: feedback during editing, CI enforcement, or a convention the engine cannot check. | [guard](guard.md); do not imply the hook prevents edits | [governor](../roles/governor.md) |
| “Generate a component registry / automate component docs” | Inspect public exports and existing metadata; deliver a scoped catalog with a verified refresh path. | [registry](registry.md) | [docs](../roles/docs.md) |
| “Set up component examples / Storybook” | Inspect existing documentation and choose a minimal useful setup; deeper maintenance can use a specialist. | [scaffold](scaffold.md) | [docs](../roles/docs.md) |
| “The documented convention and tooling disagree” | Reconcile intent, source, config and installed tooling. | [doctor](doctor.md) | [governor](../roles/governor.md) |
| “Track changes over time” | Explain measurement scope and storage; establish a comparable baseline. | [scorecard](scorecard.md) | [auditor](../roles/auditor.md) → [governor](../roles/governor.md) |

For token layers or naming, start with [architect](../roles/architect.md) and
[tokenize](tokenize.md). For staged adoption, codemods or retiring an API, start
with [migrator](../roles/migrator.md) and [transform](transform.md). For releases,
contribution rules or exceptions, start with [governor](../roles/governor.md).

**our own opinion:** Arrows name hand-offs, not required extra agents or mandatory
work. One agent can switch roles. Carry scope, source evidence, coverage, decisions,
open questions and the expected result each time. Skip roles the task doesn't need.
The auditor supplies facts and never proposes; the consultant owns diagnosis and
`consult.json`. Existing authority carries across roles.

An isolated screen redesign or general business/product strategy is outside this
skill's delivery specialty. Explain the relevant boundary while retaining any
system question. Use the team's existing design workflow or an available specialist
when authorized; do not abandon the user with an unexplained tool name. Check
availability before a handoff and carry the goal, evidence and scope forward using
[engagement](engagement.md). npm does not supply those specialists.
