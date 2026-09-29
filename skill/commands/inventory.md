---
name: inventory
description: List what exists and who uses it.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read component exports, wrappers and call sites in the requested scope.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop consumers . --json` for the import and JSX evidence.

## Route

Follow [census](../reference/census.md) and the [auditor](../roles/auditor.md) role.

## Finish line

You have a scoped component and consumer inventory with source locations and gaps.
You don't treat static imports as runtime use or decide what to merge or delete.
