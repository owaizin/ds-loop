---
name: component
description: Build or review a shared component against its contract.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the component contract, implementation, call sites, stories and tests.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop consumers . --json` for known consumers.

## Route

Follow [shape](../reference/shape.md), [review](../reference/review.md),
and the [components](../roles/components.md) role.

## Finish line

You have a checked component change or review findings against its contract, with
rendered behavior and accessibility gaps named. Your team owns shared API and
compatibility decisions; a review doesn't authorize an API change.
