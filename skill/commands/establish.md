---
name: establish
description: Stand up a system your product can use.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the product code, existing foundations and representative workflows.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [establish](../reference/establish.md), [starting](../practices/starting.md),
and the [architect](../roles/architect.md) and [components](../roles/components.md) roles.

## Finish line

Your agreed scope has editable foundations, reusable components used in real flows,
a reference guide and contribution instructions, with checks and gaps recorded.
Your team owns shared design choices and release authority; preserve existing delegation.
