# Consulting delivery — author walkthrough

Scope: procedure and artifact walkthrough using the independently constructed
`fixtures/example-workspace`. This is not an independent agent trial or human
usability study. No claims about real-world adoption or agent compliance follow.

## Scenario 1: move the dashboard onto the shared system

Read `apps/dashboard/App.tsx:1-6`, `apps/dashboard/LocalNotice.tsx:1`,
`packages/ui/index.tsx:1-2`, and `packages/ui/forms.tsx:1` in that fixture.

Observed: the dashboard already composes shared Card, Field and Button exports,
plus LocalNotice. The shared Card renders a fixed section; it is not a verified
replacement for the notice's aside or content. Shared export presence alone does
not establish a compatible API or accessible replacement.

Applying the adoption mapping:

| Pattern | Disposition | Basis | Design work | Code work | Next check |
|---|---|---|---|---|---|
| Existing shared controls | Retain provisionally | Imports present; runtime not checked | Unknown; no design library supplied | No replacement proposed | Verify behavior against requested outcome |
| LocalNotice | Blocked pending intended ownership | No compatible target established from available exports | Unknown, not zero | Investigation first; no replacement estimate | Confirm reusable need and target contract |

First delivery: review the notice contract in its consumer. Preserve content and
semantics. Finish with a supported retain/contribute/replace decision, API evidence
if replacing, and identified behavior checks. No fake migration percentage or
estimated savings. Outcome: the procedure avoids mistaking local code for drift.

## Scenario 2: assess a repository without design-tool access

Apply system-review and discover. Record design-library access as unavailable
unless the team says it does not use one; these are different states. Continue
source review, mark runtime and design conclusions not checked, and keep design
work unknown in the estimate. No score is pro-rated from the inspected subset.
Outcome: the procedure supports a useful partial review without declaring parity.

## Scenario 3: plan-only request, dependencies unresolved

Apply routing and the delivery contract. Deliver mappings, blocked rows, estimates
with basis and first-slice acceptance. Retain the owner's planning-only boundary.
The overview explicitly calls checks planned and does not record approval. The
assessment adapter displays a prerequisite on the first work item rather than
silently presenting it as ready. Outcome: a plan can complete without implying a
migration happened or turning a missing dependency into an invented schedule.

## Automated and visual checks

- Overview tests: deterministic output, non-mutation, escaped executable strings,
  no-plan/no-first-step states, assessment anchors, dependency and estimate basis.
- Full repository and packed-install checks recorded in the plan completion record.
- Chrome: normal report desktop/light, desktop/dark and 375px; four cards, resolved
  links, no page errors or horizontal overflow. Mobile nav occlusion found and fixed.
- Assessment integration tested in a temporary snapshot, without modifying the
  primary checkout. Its patch is in `docs/integration/`.

These checks establish implementation behavior and internal procedure coherence.
They do not prove an unfamiliar developer can complete the journey unaided.
