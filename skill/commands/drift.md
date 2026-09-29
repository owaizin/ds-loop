---
name: drift
description: Catch new hardcoded values as they are written.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read styling sources, hook settings and any retained audit baseline.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop guard status` before changing hook settings.
If this is a workspace, also run `ds-loop consumers . --json`.

## Route

Follow [guard](../reference/guard.md), [drift](../reference/drift.md),
and the [governor](../roles/governor.md) role.

## Finish line

You have the requested hook state verified and its coverage limits explained.
Install or remove it only when authorized; your team decides CI gates. The hook
reports after edits and cannot block them or replace an unfiltered audit.
