# Start with something your product can use

**our own opinion:** Start with a real flow. A shelf of unused components isn't
our definition of a working first release.

## The practice

Separate an experiment from a supported release. Atlassian limits Early Access
support to pilot groups and allows breaking changes in minor `0.x` releases.
Its Beta phase is supported at `1.0+`, with breaking changes in major releases.
These are Atlassian's terms, not a universal definition of v0.
[Source: Atlassian release phases](https://atlassian.design/release-phases).

Give your first components shared foundations. Primer publishes color, typography
and layout guidance alongside its components.
[Source: Primer foundations](https://primer.style/product/getting-started/foundations/).

Choose tokens by their meaning. Atlassian warns that matching a color by appearance
can break other themes.
[Source: Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/).

## When it is missing

**our own opinion:** Look for a demo that has no product consumer, unclear support
promises, or a first screen that needs a second private scale. These are prompts
to investigate, not proof that the system has failed.

## What to do

**our own opinion:** Use this pilot recipe with [establish](../reference/establish.md):

1. Name one product flow, its owner, supported platforms and finish line. Keep the
   rest of the requested delivery visible; a pilot doesn't shrink the assignment.
2. Select the color roles, type, spacing, radius, elevation and motion that flow
   needs. Preserve a suitable adopted base. Record modes and unchecked categories.
3. Build or reuse the controls and patterns that flow actually uses. Verify their
   imports, states and keyboard behavior in the first product consumer.
4. Call this v0 only with a written scope: what works, who may use it, what may
   change, how to get help, and what remains unverified. Don't imply stability
   from the version number alone.
5. Hand the working consumer, editable foundation sources and remaining delivery
   list to the consultant. Expand only within the authorized scope.
