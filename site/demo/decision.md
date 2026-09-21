# Primary action follows the theme palette

Status: applied to this synthetic example. This is an authored walkthrough, not a customer evaluation.

## Request and scope

The supplied convention is that the action background follows palette blue500 in each theme. Keep the light appearance, button dimensions, shared component CSS, and markup unchanged. Only the action-token declarations change between before.css and after.css.

## Decision

Replace both action literals with var(--palette-blue-500, #245bdb). Declare the alias in each theme selector so it resolves against that theme's palette. Do not change the palette or hardcode a separate dark action color.

## Evidence

Browser measurement: light remains rgb(36, 91, 219). Dark changes from rgb(36, 91, 219) to rgb(154, 184, 255). Both buttons remain 129.203125 by 43.59375 CSS pixels in the measured browser. After the change, Tab reaches the light button and its computed outline is 3px solid white.

Default-config unfiltered audits: before has color/semantic-holds-literal and color/literal-duplicate-tokens. After has neither, but reports token/tier-model-undetectable. Its tier coverage is incomplete; do not describe the audit as clean. These checks do not establish full accessibility or application behavior. The sample buttons do not save data.

## Revisit

Reconsider if primary actions should intentionally use a different palette role in a theme, or the theme scoping changes. Preserve the reference in each theme unless the replacement has verified CSS resolution behavior.

## Retrieval

The worked example at ../example.html links here. Source: before.css, after.css, component.css, before.html and after.html in this directory. A separate agent-session retrieval test has not been performed for this synthetic example.
