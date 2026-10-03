# Adoption mapping — <product area>

Scope and revision: <source, target library/version, exclusions>
Outcome and owner: <what becomes possible; decision owner or existing delegation>
Evidence access: <code; design library; rendered product; unavailable/not applicable>

| Pattern / consumers | Current contract and evidence | Target API and evidence | Disposition and reason | Design work | Code work | Unknown / dependency | Acceptance |
|---|---|---|---|---|---|---|---|
| Example DS search field / results page | Illustrative: labeled input with validation; verify source and keyboard behavior | Candidate Field export; API not checked | Blocked: verify validation and focus contract | Not applicable if this team has no design library | Not estimated until API review | Inspect target example and test focus after error | Working label, error association and preserved submission behavior |

Example only; replace with inspected project facts. Evidence labels: observed,
reported, inferred, proposed, not checked. Attach source/revision to each observation.

## First slice

Rows: <ids or names>
Owner: <owner or owner-needed>
Entry condition: <dependencies resolved; baseline captured>
Design estimate: <range/unit, basis, confidence, or not applicable>
Code estimate: <range/unit, basis, confidence, or unknown>
Waiting time: <external dependency, separate from effort>
Preserve: <behavior and compatibility>
Rollback: <how to restore the prior behavior>
Finish: <observable acceptance; required checks>

## Continuation

Completed / retained / blocked / not checked: <rows and evidence>
Next decision: <who decides what, or none>
Resume from: <existing task, mapping and evidence locations>
