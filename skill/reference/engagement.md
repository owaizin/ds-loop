# Plan, deliver, and hand off

Agent procedure. Use to present a diagnosis and plan, guide adoption, coordinate specialist
handoffs, and explain the result. Adapt these fields to the team's existing conversation,
issue or document format. Do not create a new registry or require fixed headings.

## Plan template

```text
Outcome: Who needs what to become possible, and why now?
Current state: Useful assets and commitments; observations, sources and limits.
Diagnosis: What is going wrong, likely cause, competing explanation and missing evidence.
Recommendation: First intervention, why it helps, and relevant alternative considered.
First delivery: What will change, where it will be used, and what must stay the same.
Ownership: Who performs work; who resolves shared decisions; access/dependencies.
Done when: Behavior to demonstrate; engine checks, runtime/tests and human review.
Next use: Where the plan and decisions live, how to find them, and when to revisit.
```

A small settled change may express this in a few sentences. A broad engagement
may need a linked brief and evidence appendix. A presentation is optional. For
estimates, explain assumptions, capacity/dependencies and uncertainty; do not give
an invented duration or promise savings without a baseline.

For a stakeholder readout, lead with the recommended action and the problem it
addresses. Show the assets worth keeping, the demonstrated gap, the first delivery
and its completion criteria, then any decision needed now. Link detailed inventory
and audit evidence instead of making the audience interpret raw findings. Mark
planned work separately from delivered work; update the same brief as evidence changes.

Name the next useful checkpoint and what it will demonstrate.
Later phases remain conditional on what the pilot shows. Proceed within existing
authorization; ask only about decisions that materially change scope or shared
commitments. A review-only request ends in recommendations unless repairs are
also requested.

## Delivery and adoption

Before implementation, resolve the consumer contract and critical assumptions.
Use the project playbook appropriate to the work; preserve existing runtime,
checks, story structure and compatibility requirements unless changing them is
part of the task. New files, a token catalog, or an installed Storybook are not
proof that a consumer can use the result.

For shared changes, identify affected consumers and the adoption boundary. Agree
how compatibility will be preserved or migrated, how an unwanted result can be
reverted, and who owns any release/deprecation communication. Do not contact
people or publish on the user's behalf without authorization.

Prove a representative consumer first. Update its import/usage guidance with the
implementation so humans and coding agents find the same contract. Keep reference
examples and production adoption separately labeled. When a dependency or failed
check blocks work, explain what is blocked, what can continue, and the next action
that resolves it. Do not silently substitute an isolated story for a production
acceptance check.

## Optional specialist handoff

DS Loop remains responsible for the problem, scope and final synthesis. Use a
specialist for a concrete capability gap, not as a way to drop the task.

1. Explain the specialist work and expected output. Check whether the skill/tool
   is available in this host and read its instructions if using it.
2. If absent, offer installation from a verified source with host-appropriate
   instructions. Do not invent commands or silently install. If declined, continue
   work within available capability and explain the remaining gap.
3. Carry the existing goal, target package, versions, scope, evidence, constraints,
   decisions and acceptance criteria. The user should not repeat the interview.
4. Integrate the returned changes, evidence and limits into the original plan and
   completion receipt. Do not claim a delegated task succeeded before inspecting it.

For deeper Storybook structure, documentation maintenance, lifecycle or agent
retrieval, use optional `storybook-architect` if available. Basic setup remains in
[scaffold](scaffold.md). Installing either skill does not configure the product or
create ongoing monitoring.

## Explain the result

Lead with whether the requested outcome was achieved. Include:

- **Delivered:** what changed, or why preserving the implementation was justified.
- **Evidence:** engine command/source/config and coverage; runtime/test checks and
  results; human judgment/authority where relevant. Keep these channels distinct.
- **Limits:** failed or unrun checks, what they prevent claiming, and unresolved
  decisions. Review delivered, implementation verified, and awaiting a dependency
  are different outcomes.
- **Continuation:** decision location and how to find it; remaining work with owner
  or owner-needed; next action or explicit stop. Do not imply scheduled follow-up.

Store task state in the existing issue/task. Put lasting conventions in the team's
ADR, component contract, contribution guide or chosen equivalent. Use
`DESIGN-SYSTEM.md` only if it is the appropriate home. Its existence is not policy
validation, engine configuration, rule suppression, or proof of retrieval.

For an adoption pilot, evaluate a fresh-context continuation starting from the
normal repository entry point and a realistic next task. It must locate and apply
the decision without being given the answer or exact decision-file path. Record
what participant performed it and where it failed. Fix a broken discovery path;
do not call a same-session reread independent evidence. For ordinary work, inspect
the links and update only relevant decisions.

## Learn before expanding

Compare the delivered result to the original problem and acceptance criteria.
Separate supported conclusions from team feedback still needed. A fresh agent finding and applying a decision does not establish human usability; fewer findings do not establish faster
feature delivery. Use comparable measurements and observed consumer behavior.

Recommend one disposition: expand to named consumers if the pilot fits; adapt if
new evidence changes the diagnosis; stop/preserve if the intervention is not
worthwhile; or await a named dependency. Update the same plan/decision home with
the reason and trigger for revisiting. Routine maintenance resumes from that
context, refreshes stale evidence and chooses the next task; it does not restart
onboarding or assume a standing mandate to migrate more code.
