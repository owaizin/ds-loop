# Worked example: fix a button’s dark theme

This is an authored synthetic walkthrough, not a customer result or an independent agent evaluation. Everything it needs is in this page — write the two files below into an empty directory and the audits reproduce.

## Request

“The primary button should use our action palette in each theme. Fix the dark-theme background. Keep the light theme, button size, and markup unchanged.”

That convention is supplied explicitly for this example. The palette changes from `#245bdb` in light mode to `#9ab8ff` in dark mode, but the action token repeats `#245bdb` in both themes.

`before.css`:

```css
:root {
  --palette-blue-500: #245bdb;
  --color-action-background: #245bdb;
}
.theme-dark {
  --palette-blue-500: #9ab8ff;
  --color-action-background: #245bdb;
}
```

## Investigation and decision

The default unfiltered audit reports `color/semantic-holds-literal` and `color/literal-duplicate-tokens`. These locate relevant code; the requested theme behavior is the reason to change it.

Replace the action literal in both `:root` and `.theme-dark` with:

```css
--color-action-background: var(--palette-blue-500, #245bdb);
```

The reference is declared in each selector so it resolves against that theme's palette. Changing the palette would affect its other consumers. Hardcoding a separate dark action color would leave the action token disconnected from the palette. Neither is needed.

## Verification

Browser measurements before and after:

| Check | Before | After |
| --- | --- | --- |
| Light background | #245bdb | #245bdb — preserved |
| Dark background | #245bdb | #9ab8ff — follows palette |
| Button dimensions in the measured browser | 129.20 × 43.59 CSS px | Same |
| Semantic literal and duplicate findings | Present | Absent |

Keyboard focus reached the light button after the change and displayed its outline. Markup and shared component CSS were unchanged. The demo buttons do not save data.

The after-audit reports `token/tier-model-undetectable`: default patterns cannot classify these reference names. It is not a clean audit. Browser checks establish the requested theme behavior, not full accessibility or application coverage.

`after.css` is the same file with that one declaration replaced in both selectors. Audit each:

```sh
ds-loop audit before.css --json
ds-loop audit after.css --json
```

Both return findings and exit 1.

## Saved decision

The deliverable is the token change plus a decision record: why the alias belongs in both themes, and what would justify revisiting it. Write it where the project already keeps decisions — `context` finds those paths, and [workflow](workflow.md) covers where it goes. Retrieval through an independent agent session has not been tested for this example.

The rendered before/after comparison ships with the website, not with this package.

[Try this workflow](workflow.md#improve-a-partial-system).
