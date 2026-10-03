# Plan adoption from verified replacements

Agent procedure for estimating or planning adoption of an existing system. A plan
request produces a plan; implementation follows the existing authorization. Use
[discover](discover.md) for missing context and [transform](transform.md) to execute.

## Establish the boundary

Record the product area, source revision, target library/version, preserved behavior,
owner and requested outcome. Read existing plans and tracker records first. Separate
production consumers from stories, generated output and vendored source. Run the
engine for supported measurements and retain coverage; inspect what it cannot read.

Check whether a design library participates in this workflow. Record code and design
access separately: inspected, supplied by the team, unavailable, or not applicable.
A design variant does not prove a code prop exists. Lack of design access does not
block code-only work; it limits claims and estimates about design work.

Finish this step with a bounded inventory and explicit exclusions. Counts describe
the sampled scope, not all users or all screens.

## Resolve each pattern

Use [the adoption mapping template](../templates/adoption-map.md) in the team's
existing task or document home. Each in-scope pattern needs a disposition:

| Disposition | Required basis |
|---|---|
| Replace | A target export and its actual API satisfy the current contract. |
| Compose | Existing parts support the behavior together; identify integration work. |
| Contribute | A repeated unmet need warrants a proposed shared addition. |
| Blocked | A named missing capability or decision prevents a safe replacement. |
| Retain | A documented local, third-party or intentional difference should remain. |
| Remove | Evidence establishes the item is obsolete within the authorized scope. |

Inspect target source, usage examples, constraints and accessibility behavior.
Record why plausible alternatives do not fit. Similar names and equal token values
are discovery hints, not verified substitutions. When evidence is incomplete, leave
the target unresolved and name the check that will resolve it. Source inspection
can establish API compatibility; it cannot establish rendered or runtime equivalence.

Code and design representations of one pattern share a row. Record their differences
rather than count them as two completed migrations. Existing tracker links remain
the work's home; draft missing work without automatically filing issues.

## Estimate and sequence

Estimate design and code work separately when both apply. For each, give a range,
unit, confidence and basis: locations affected, API/behavior changes, content or
stored-data migration, test coverage and reviewer availability. Unknowns stay unknown;
a fixed file count or component size does not establish elapsed time. Separate
hands-on effort from external waiting time and price investigation explicitly.

Order executable slices by dependencies and the requested outcome. Put blocked rows
apart from ready work. Each slice names its owner or owner-needed, entry condition,
preserved behavior, rollback path and acceptance check. The first slice must exercise
a real consumer and a meaningful risk, rather than merely the easiest replacement.

Done when every in-scope row is resolved or explicitly awaiting evidence, the first
slice is executable, and estimates disclose unknowns and excluded work. Read back the
first action, its finish line and any owner decision needed. Preserve the team's
existing delegation; this is not a new approval ceremony.

## Refresh after a slice

Reinspect the same scope and versions before comparing with retained evidence.
Record adopted, retained, blocked and unchecked rows separately. Refresh target APIs
when versions change. Report changed coverage as changed coverage, not improvement.
Use [engagement](engagement.md) for the completion and continuation record.
