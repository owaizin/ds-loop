---
name: document
description: Write down the system you actually have.
---

## Evidence first

Before replying, read the repository instructions and the code in your target project.
Read the implemented APIs, examples, existing guides and documentation scripts.
Run `ds-loop context .`, then `ds-loop audit . --json` there, unfiltered.
Keep coverage and `not-checked` results with the findings.
Run `ds-loop consumers . --json` to connect examples to actual consumers.

## Route

Follow [scaffold](../reference/scaffold.md), [documenting](../practices/documenting.md),
[storybook](../practices/storybook.md), and the [docs](../roles/docs.md) role.

## Finish line

You have discoverable guidance and checked examples tied to the implemented system,
with any unchecked build or story named. Your team decides new tooling and policy;
documentation doesn't invent either.
