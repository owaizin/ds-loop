# Make each story answer a real question

**our own opinion:** A gallery is useful when you can find the state you need to
inspect. More stories alone aren't our measure of coverage.

## The practice

Capture rendered states as stories. Storybook describes stories as component states
with arguments and documents named exports in Component Story Format (CSF).
[Source: Storybook writing stories](https://storybook.js.org/docs/writing-stories).

Use args and controls to explore supported inputs. Storybook can infer controls;
`argTypes` customizes them, with limits for complex values.
[Source: Storybook controls](https://storybook.js.org/docs/essentials/controls).

Build docs from the same examples. Storybook Autodocs derives pages from story
metadata; MDX and Doc Blocks can extend them. Read the installed version's guidance
before changing tags or configuration.
[Source: Storybook Autodocs](https://storybook.js.org/docs/writing-docs/autodocs).

Review visual changes against a baseline. Storybook's visual testing guide describes
snapshots compared with earlier builds and reviewing detected changes.
[Source: Storybook visual tests](https://storybook.js.org/docs/writing-tests/visual-testing).

## When it is missing

**our own opinion:** Investigate a gallery with only happy states, controls that
create unsupported combinations, or snapshots approved without looking at the
change. A preview with different app styles cannot prove app rendering is correct.

## What to do

**our own opinion:** Use [scaffold](../reference/scaffold.md) for setup and
[review](../reference/review.md#verify-preview-rendering-parity) for preview checks:

1. Keep a useful existing hierarchy. If none exists, group foundations, components
   and product patterns with names contributors already use. No atomic taxonomy
   or fixed story filename set is required.
2. Add stories for meaningful supported variants and risky states: focus, disabled,
   pending, error, long content and themes where applicable. Avoid an exhaustive
   Cartesian matrix. State what remains untested.
3. Limit controls to useful supported inputs. Add prose for selection guidance and
   link docs to real source. Run the docs build and inspect the examples.
4. Verify providers, styles and theme scope against the app. Review visual diffs;
   also use the project's behavior and accessibility checks. A snapshot isn't
   proof that keyboard interaction works.
5. Skip Storybook when the question needs real routing, data or integration that
   the preview doesn't represent, when the framework is unsupported, or when an
   existing reference serves the task. Use the app or its existing harness. Don't
   install Storybook merely to satisfy this playbook.
