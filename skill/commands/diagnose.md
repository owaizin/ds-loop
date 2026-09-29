---
name: diagnose
description: Find the cause, not just the count.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the affected components, their consumers and the decisions behind them.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [discover](../reference/discover.md) and the [consultant](../roles/consultant.md) role.

## Finish line

You have an evidence-backed cause, another possible explanation and a recommended
first action with a finish line. Your team decides priorities and shared-policy changes.
