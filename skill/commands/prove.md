---
name: prove
description: What changed, and what nobody checked.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the changed sources, previous evidence and saved measurement history.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop scorecard . --dry-run --json` to preview today without saving a row.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [scorecard](../reference/scorecard.md), [maintaining](../practices/maintaining.md),
[consult](../reference/consult.md), and the [auditor](../roles/auditor.md) role.
Use `ds-loop report .` for the report and `ds-loop scorecard .` when saving is authorized.

## Finish line

You have a report of verified changes and unchecked areas; compare saved runs only
when their source scope and instruments match. Without a baseline, report today alone.
Your team decides release acceptance; fewer findings don't approve a release.
