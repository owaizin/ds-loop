---
name: propose
description: Turn the evidence into a plan your team can approve.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read token relationships, affected flows and the existing decisions.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [consult](../reference/consult.md), [engagement](../reference/engagement.md),
and the [consultant](../roles/consultant.md) and [architect](../roles/architect.md) roles.
Use `ds-loop report . --consult consult.json` for the proposed plan.

## Finish line

You have a consulting report with evidence, proposed changes, ordered work and
acceptance checks. A proposal doesn't approve itself; your team owns scope and policy.
