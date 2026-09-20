# Diagnose the design-system problem

Agent procedure; no `ds-loop discover` CLI exists. Finish with a recommended first action, its supporting evidence and a finish line.
If evidence is missing, name the investigation that will resolve it.

## Understand why this matters

Reuse the user's stated goal. When absent, ask: “What brought you here, and what
would you like to be easier or work better?” A request for a specific authorized
repair does not need this interview.

When the user says "guide me" or cannot name a problem, take the lead: inspect one
representative contributor or product task, explain the possible obstacle, and ask
only what is needed to choose the next observation. Do not substitute a severity
backlog for diagnosis or require the user to choose a token category. A discovery
plan may finish by recommending no code change.

Read applicable instructions and existing task/decision records. Inspect a relevant
component or product flow before asking for technical facts. Select only questions
whose answers could change the next action:

| Missing context | Useful question | Decision it informs |
|---|---|---|
| Problem and urgency | What happened recently that made this worth addressing? | Defect repair, contributor friction, growth, or a planned capability. |
| Concrete incident | Show me a recent task where this caused trouble. What happened? | A representative reproduction rather than an abstract quality complaint. |
| Affected people | Who gets stuck, and what do they do to recover? | Product-user harm versus contributor effort or aesthetic preference. |
| Desired outcome | What should become possible or easier after this work? | Acceptance independent of tools installed or finding counts. |
| Existing solution | What should developers use today, and what prevents that? | Missing capability versus adoption, compatibility, or discovery. |
| Constraints | What must stay compatible, and who owns shared decisions? | Scope, rollout, and material decisions needing an owner. |
| First demonstration | Which flow would be useful to prove this in? | Pilot consumer, states, and access needed for verification. |

Ask related questions in small groups; investigate between them. Offer a
provisional recommendation when the user does not know. An unknown blocks only
work that depends on it. Keep the interview proportional to the next decision.

## Investigate the cause

Follow the entry skill's setup. Inspect actual sources of intent, implementation,
consumer imports, docs/examples, contribution paths, and available checks. For a
blank project, use a brief/reference or prototype; do not invent an audit baseline.

Present the chain: **reported problem → observed behavior → plausible cause →
consequence → intervention**. Label repository observations, runtime observations,
team reports and hypotheses. Cite scope and sources. A static rule `risk:` sentence
is not evidence that this product suffers that consequence.

Check a competing explanation before a consequential recommendation. Duplicate
implementations may reflect different contracts. An existing component may be
usable but hard to discover. A named utility resolving successfully does not prove
permission; a missing conventional document does not prove absent policy. Resolve
contradictory commitments with the relevant owner when they affect the intervention.

Counts support investigation, not maturity or ROI claims. Distinguish files,
component concepts, imports and production usage. Sampled examples are not an
exhaustive inventory. Explain benefits as expected until observed; do not turn
code counts into invented cost savings or delivery-speed estimates.
Avoid comparative ranks such as "top quartile" or "better than most" without a
defined comparison and supporting evidence. Describe this project's demonstrated
strengths and gaps instead. Agent readiness requires finding and applying a
decision in a fresh task; a document's presence alone cannot establish it.

## Recommend the first delivery

Connect the intervention to the user's problem, using [engagement](engagement.md)'s
plan template. Consider appropriate alternatives: guidance, a contribution/ownership
change, local repair, shared capability, or preserving the current implementation.
Recommend a route for this area:

- **Establish:** no agreed foundation for the needed use case. Compare reuse and a
  minimal new foundation, with a real consumer and a checkable contract.
- **Improve / adopt:** an existing foundation has a demonstrated gap. Fix the
  underlying cause; documentation or an exception can be the right output.
- **Maintain:** current commitments support the work. Use/review them and retain
  justified exceptions; no strategic redesign is required.
- **Investigate further:** name the missing observation, bounded work to obtain it,
  and the decision it will unlock. Scanner silence cannot choose another route.

Done when the user can see why you recommend the first action, what it covers, and
how to tell whether it worked. Identify any decision needed before proceeding. Present the diagnosis for
correction; reuse authorization instead of adding a mandatory approval ceremony.
Retain consequential choices and a retrieval path as described in
[engagement](engagement.md). A whole-system implementation is not required to finish
a discovery request.
