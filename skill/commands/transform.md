---
name: transform
description: Move the code, one reviewed slice at a time.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the old and new contracts, affected call sites and agreed migration mapping.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop consumers . --json` to locate known consumers before moving code.

## Route

Follow [transform](../reference/transform.md), [migrating](../practices/migrating.md),
and the [migrator](../roles/migrator.md) role.

## Finish line

The authorized slice is migrated and checked, with remaining and unknown consumers
named. Your team owns compatibility breaks and retirement; an audit isn't permission
to migrate. Preserve existing delegation.
