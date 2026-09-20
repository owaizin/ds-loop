# Route the request

The user describes an outcome; the agent chooses the procedure. Use this reference
after the entry skill's orientation. Offer the command catalog only when asked
what is available. These playbook names are not terminal commands.

| Request | First action | Relevant procedure |
|---|---|---|
| Bare invocation or “help us with our system” | Recover the goal, investigate a concrete example, explain a recommended next step. | [discover](discover.md), then [engagement](engagement.md) |
| “Build us a design system” | Establish product needs and a representative consumer; compare reuse and a minimal foundation. | [discover](discover.md), then [tokenize](tokenize.md) / [scaffold](scaffold.md) as needed |
| “Our UI is inconsistent” / “people keep rebuilding components” | Diagnose whether the cause is missing capability, drift, poor discovery, or a deliberate difference. | [discover](discover.md); [census](census.md) only when an inventory answers the question |
| “Audit our tokens” | Run the requested measurement, explain relevant findings and limits. A review request does not authorize all repairs. | [audit](audit.md) |
| “Build or extend this shared component” | Check existing contracts, consumers and the actual gap; implement within scope. | [shape](shape.md), project build flow, [review](review.md) |
| “Review this component” | Review its behavior and contract without restarting company discovery. | [review](review.md) |
| “Review this diff” | Establish the actual base ref and relevant consumers. Use unfiltered `audit . --since <ref> --json`, plus review of behavior and dependency context. | [review](review.md); findings are scoped evidence, not a whole-product certification |
| “What regressed?” | Compare compatible retained measurements and actual behavior. | [drift](drift.md) |
| “Stop token regressions” | Identify the required channel: feedback during editing, CI enforcement, or a convention the engine cannot check. | [guard](guard.md); do not imply the hook prevents edits |
| “Set up component examples / Storybook” | Inspect existing documentation and choose a minimal useful setup; deeper maintenance can use a specialist. | [scaffold](scaffold.md) |
| “The documented convention and tooling disagree” | Reconcile intent, source, config and installed tooling. | [doctor](doctor.md) |
| “Track changes over time” | Explain measurement scope and storage; establish a comparable baseline. | [scorecard](scorecard.md) |

An isolated screen redesign or general business/product strategy is outside this
skill's delivery specialty. Explain the relevant boundary while retaining any
system question. Use the team's existing design workflow or an available specialist
when authorized; do not abandon the user with an unexplained tool name. Check
availability before a handoff and carry the goal, evidence and scope forward using
[engagement](engagement.md). npm does not supply those specialists.
