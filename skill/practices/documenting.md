# Answer the question behind the import

**our own opinion:** A props table isn't enough if your reader still cannot tell
whether this is the right component.

## The practice

Explain use as well as code. Carbon requires usage, style, code and accessibility
guidance for components and patterns. Its Button page covers when to use buttons,
when to choose something else, content and behavior.
[Sources: Carbon documentation requirements](https://carbondesignsystem.com/contributing/get-started/overview/),
[Button usage](https://carbondesignsystem.com/components/button/usage/).

Show the component's parts, API defaults, examples and keyboard behavior. Radix's
Dialog page provides each of these, plus source and accessibility-pattern links.
Use it as a concrete page model, not a claim that every component is a dialog.
[Source: Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog).

Explain token intent and themes. Atlassian documents how names encode foundation,
property and purpose, and links to usage descriptions for available tokens.
[Source: Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/).

## When it is missing

**our own opinion:** Look for a copyable example with a dead import, a token table
that omits its role, or a state shown in docs that the component doesn't support.
Check the implementation before calling the page wrong.

## What to do

**our own opinion:** Use [shape](../reference/shape.md) and
[scaffold](../reference/scaffold.md) to answer these questions in your existing docs:

1. What task does this serve? When should I use something else?
2. How do I import and compose it? What props, defaults, states and keyboard
   behavior are supported? Which examples have actually been checked?
3. Which tokens and themes does it use? Link names, roles, values or aliases to
   canonical sources; say how to refresh any generated reference.
4. Who owns it, how stable is it, and how do I request or contribute a change?

**our own opinion:** Write one contract for people and agents. Use direct headings,
real paths and runnable examples. Link it from the normal contributor entry point.
For an adoption pilot, ask a fresh reader or agent to find and apply it without
being handed the answer. Record that trial's limits; an agent trial doesn't prove
human usability. These are our retrieval checks, not a published Radix standard.
