---
name: govern
description: Decisions, ownership and how a rule gets added or retired.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read contribution rules, decision records, owners and the code they govern.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [governing](../practices/governing.md) and the [governor](../roles/governor.md) role.
Use `ds-loop decide --help` for the required fields before recording an agreed decision.

## Finish line

You have an agreed decision recorded with its owner, alternatives and evidence, or
a clear unresolved choice. Your team owns policy and exceptions; don't record a
proposal as accepted or invent new approval gates.
