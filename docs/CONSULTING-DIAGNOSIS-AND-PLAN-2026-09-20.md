# Design System Loop — diagnosis and plan

Design specification, 20 September 2026. The corresponding skill instructions are now implemented in the local working tree and under behavioral evaluation. They are not published to npm. A separate local engine repair adds scoped palette context; see the evaluation record. Complements the [onboarding flow](design-system-loop-onboarding-2026-09-19.html), which remains authoritative for routing and end states. This document defines the diagnosis and plan within steps 05–07.

## Start with the problem

The first useful question is: **“What brought you here, and what would you like to be easier or work better?”** Reuse the answer when the user has already supplied it.

“No system,” “partial system,” and “established system” describe the starting conditions. They do not explain why work is needed. A mature library can have an adoption problem; an inconsistent interface can need a local repair rather than a new foundation. Recommend establish, improve, or maintain only after connecting the requested outcome to evidence in the relevant area.

The engine supplies measurements and coverage limits. The agent following the skill interprets those measurements alongside product behavior, team context, and existing decisions. The team retains authority over priorities and shared policy.

## Adjust the depth to the request

| Entry | Appropriate response | Enough to proceed |
| --- | --- | --- |
| Concrete implementation request | Recover existing context; inspect the affected flow; give a short work plan. | Outcome, scope, relevant constraints, authorization, and checks are clear. |
| Broad pain or uncertain direction | Investigate a representative example; ask consequential questions; present a diagnosis and recommended first intervention. | The recommendation has evidence, a bounded deliverable, and a way to judge it. |
| “Build us a design system” | Establish the product, representative flow, existing assets, and constraints. Recommend the smallest useful foundation with reasons. | A real consumer and agreed finish line exist; unresolved choices are explicit. |
| Insufficient access or evidence | Propose a bounded discovery task with the question it will resolve and its stopping condition. | The next observation can discriminate between plausible explanations. |
| Returning task | Retrieve the existing plan and decisions; check what changed. | Prior context is still applicable, or the affected part is updated. |

A direct request does not require a consulting presentation. A broad request does not authorize an unlimited migration. Existing authorization carries forward; clarify only missing decisions that materially affect the work.

## Interview guide

Read the request and available instructions first. Investigate enough to make questions specific; use answers to direct further investigation. Ask a small group of related questions, then reassess. These are prompts to select from, not a mandatory questionnaire.

| Unknown | Example question | What its answer changes |
| --- | --- | --- |
| Trigger and pain | “What happened recently that made this worth addressing?” | Whether to prioritize a defect, delivery friction, growth, or a planned change. |
| Concrete incident | “Show me the last task where this caused trouble. What happened?” | Gives a reproducible example instead of an abstract quality complaint. |
| Affected people and consequence | “Who gets stuck, and what do they have to do to recover?” | Distinguishes customer harm, contributor friction, and aesthetic preference. |
| Desired outcome | “What would your team be able to do after this that is difficult today?” | Defines the result independently of installing tools or reducing findings. |
| Existing solution and adoption | “What should developers use today? What prevents them from using it?” | Distinguishes a missing capability from poor discovery, ownership, or compatibility. |
| Constraints and authority | “Which behavior must stay compatible, and who owns changes to this shared pattern?” | Bounds the intervention and identifies decisions requiring an owner. |
| First demonstration | “Which flow would be a useful place to demonstrate the improvement?” | Selects a pilot and its relevant states, platforms, and consumers. |

Do not ask for facts already verified in the repository. If instructions and behavior conflict, present the conflict rather than silently choosing one. When the user does not know an answer, offer an evidence-gathering next step or a clearly provisional recommendation. Stop interviewing once the next bounded action is responsible; unresolved long-term strategy need not block it.

## Diagnosis before recommendation

Present a short read-back connecting:

**Reported problem → observed behavior → plausible cause → consequence → recommended intervention.**

Label evidence by its actual basis: repository observation, runtime observation, team report, or hypothesis. Include source, scope, and material limits. A rule's static risk text describes a defect class; it does not prove the cause or impact in this product.

An inventory supports diagnosis but cannot replace it. Distinguish files, exports, component concepts, and production consumers when reporting counts. Counts require a method and scope. Duplicate names are candidates for investigation, not proven waste. An absent story is not proof of an untested component. A lower audit count is not proof of better usability or faster delivery.

For the leading explanation, identify the observation that could disprove it. For example, an apparent component gap may actually be a discovery problem if an existing component supports the task. Compare materially plausible interventions, including documentation, contribution process, local repair, shared change, or leaving the implementation unchanged. Explain why the selected intervention addresses the reported problem.

**Diagnosis complete:** the problem and affected flow are stated, evidence and unknowns are distinguishable, and the next intervention or discovery task follows from them. Present this understanding for correction; do not demand a separate approval when an already-authorized task can proceed.

## User-facing diagnosis and plan template

Use these fields in conversation or the team's existing task/document. Scale the detail to the decision. Omit irrelevant sections with an explanation when needed; do not manufacture content to fill a template.

```text
Outcome
What you are trying to make possible; who benefits; why this matters now.

Current state
Assets and commitments we can rely on.
Relevant observations, sources, scope, and limitations.

Diagnosis
The problem demonstrated by those observations.
Likely cause, alternative explanation, and what remains unverified.
Practical consequence; distinguish reported pain from measured impact.

Recommendation
The first intervention and why it is appropriate.
Relevant alternative and why we are deferring or rejecting it.
The starting route for this area: establish, improve, or maintain.

First delivery
Concrete output and representative consumer.
Work sequence, permitted scope, compatibility constraints, and dependencies.
Who performs the work and who resolves any shared decision.
Effort estimate and basis if supportable; otherwise what is needed to estimate.

Done when
Observed behavior or contributor task that demonstrates success.
Engine checks, runtime/tests, and owner judgment listed separately.
Where evidence will be available; what will remain unchecked.

Decision and continuation
Proceed within existing authorization, or name the specific missing decision.
Condition for expanding, revising, stopping, or preserving the current system.
Plan/decision location, discovery link, owner, and next action.
```

Describe subsequent phases as conditional. Avoid promising a full rollout before the first delivery supplies evidence. When a pilot reveals a different cause, revise the diagnosis and plan before expanding.

## Synthetic example: component discovery

**Request:** “Engineers keep building their own status labels. We need a better system.”

**Observations:** a shared status component supports the reported use case. The contributor guide points at an obsolete import. A developer reports copying a local implementation after failing to find the shared component. Runtime equivalence and discovery by another contributor are not yet checked.

**Diagnosis:** discovery is a plausible contributor to duplication. Missing functionality remains an alternative until the consumer's behavior is checked. The evidence does not yet justify replacing the component library.

**Recommendation:** verify the shared component against this consumer, correct the discovery path, and use it in one authorized flow. Preserve the local component if the shared contract cannot meet the requirement safely; record the missing capability instead.

**First delivery:** working guidance, a verified representative consumer, and a linked decision describing the adoption boundary. Broader migration waits for evidence that the shared component fits other consumers.

**Done when:** the selected states and interactions remain correct, relevant checks have run with limits stated, and a fresh contributor or agent can locate and use the correct component from the normal repository entry point without being given its path. Record which kind of participant performed that continuation check; an agent check does not establish human usability.

This example is invented. It is not an engagement result or a promised improvement metric.

## Presentation and persistence

The default output is a concise diagnosis and plan in the conversation. For a broad engagement, keep one linked brief in the team's existing documentation or issue system. Evidence detail can sit behind links. A presentation or Storybook page is optional when it serves an audience; neither is a prerequisite for implementation.

Use a consistent narrative: purpose, current assets, demonstrated gaps, recommendation, phased work with acceptance conditions, and the decision needed now. Preserve the separation between available capabilities and proposed work. Do not require a new registry, folder hierarchy, or fixed heading in an existing team format.

The interview guide governs how context is acquired. The plan communicates what will happen and why. The completion receipt records what actually happened. Link these views to the same engagement/task so that changes do not create competing versions of the truth. Lasting conventions belong in the existing contract or decision record; temporary work status belongs in the task.

## Behavior to evaluate

| Scenario | Expected behavior | Failure to catch |
| --- | --- | --- |
| Precise authorized repair | Recover context and act with a short plan. | Mandatory strategic interview delays an obvious task. |
| Broad inconsistency complaint | Investigate an example and explain an evidence-supported intervention. | Agent sorts rule findings and calls that a diagnosis. |
| Existing capability, poor discovery | Investigate adoption and verify the existing capability before proposing new infrastructure. | Agent rebuilds a system because the user cannot find it. |
| No code or unclear intent | Use a product brief/reference and a bounded discovery task. | Agent invents counts, benefits, or universal token architecture. |
| Evidence contradicts initial route | Revise the route for this area and explain why. | Initial company label determines the work despite contrary evidence. |
| Fresh-session continuation | Find the linked problem, decision, scope, and next action; apply them. | Agent repeats the interview or discovers only that a file exists. |

These instructions guide the agent conversation. Synthetic trials now include representative delivery and fresh-context continuation; human usability and real-team adoption still need evaluation. See the evaluation record below for the scope and limits of each trial.

## Implementation and evidence

The operational sources are now [the skill entry](../skill/SKILL.md),
[discovery](../skill/reference/discover.md), and
[engagement](../skill/reference/engagement.md). This document retains the design
rationale; it is not an additional mandatory template loaded on every task.
The [evaluation record](../../ds-loop-calibration/evaluations/consulting-2026-09-20/REPORT.md) records the
initial trials, rendered delivery and specialist-handoff checks, regression checks,
and remaining work. The
[protocol](../../ds-loop-calibration/evaluations/consulting-2026-09-20/PROTOCOL.md) was defined before those trials.

The problem-first approach is consistent with the
[GOV.UK discovery guidance](https://www.gov.uk/service-manual/agile-delivery/how-the-discovery-phase-works):
understand the problem and constraints, consider alternatives to building, and
define how success will be assessed. DS Loop adapts those principles to the
requested task; it does not import government delivery phases or durations.
