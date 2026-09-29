---
name: start
description: See what is really in your system.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read your token sources, component entry points and existing intent records.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [SKILL.md steps 1–2](../SKILL.md#start-with-the-persons-task) for setup,
[consult](../reference/consult.md) for `ds-loop report . --consult consult.json`,
and the [auditor](../roles/auditor.md) then [consultant](../roles/consultant.md) roles.

## Finish line

You have a first reading, a report path, what was checked and what couldn't be checked.
Your team chooses the next scope; this reading doesn't authorize shared-policy changes.
