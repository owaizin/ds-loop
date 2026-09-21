---
name: Design System Loop
description: Violet orbit — a violet-black system with spectral sculpture and precise editorial framing.
colors:
  paper: '#080512'
  white: '#110d20'
  ink: '#f3f0ff'
  muted: '#b1abc4'
  line: '#2d2541'
  accent: '#d1bcff'
  deep: '#0e091b'
  code: '#f3f0ff'
  warm: '#efd79b'
  focus: '#dfcbff'
  action-hover: '#7b46dc'
  surface-hover: '#211632'
  code-ground: '#151022'
  inline-code-ground: '#261d38'
  line-strong: '#776391'
  loop-panel: '#171027'
  loop-selected: '#382256'
  action-base: '#6323b9'
  action-top: '#8141df'
  action-text: '#fff'
  action-border: '#a371dc'
  secondary-ground: '#171021'
typography:
  hero:
    fontFamily: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: clamp(38px, 5vw, 64px)
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: -.04em
  section:
    fontFamily: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: clamp(28px, 3vw, 38px)
    fontWeight: 500
    lineHeight: 1.18
    letterSpacing: -.035em
  display-base:
    fontFamily: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: clamp(48px, 5.2vw, 76px)
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: -.035em
  headline-base:
    fontFamily: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: clamp(34px, 3.3vw, 48px)
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: -.035em
  title:
    fontFamily: Manrope, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: -.025em
  body:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
  panel-body:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 14px
    lineHeight: 1.6
  specimen-label:
    fontSize: 12px
  lead:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.65
  navigation:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.65
  button:
    fontFamily: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.65
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.75
rounded:
  flat: '0'
  compact: 4px
  text-action: 6px
  navigation-action: 7px
  action: 8px
  frame: 12px
spacing:
  page-gutter: clamp(24px, 5vw, 80px)
  small: 12px
  medium: 24px
  section-inset: 32px
  section-gap: 40px
  section: 76px
  section-narrow: 44px
components:
  button-primary:
    backgroundColor: '{colors.action-base}'
    textColor: '{colors.action-text}'
    typography: '{typography.button}'
    rounded: '{rounded.action}'
    padding: 12px 22px
  button-primary-hover:
    backgroundColor: '{colors.action-hover}'
  button-secondary:
    textColor: '{colors.ink}'
    rounded: '{rounded.text-action}'
    padding: 12px 16px
  button-copy:
    backgroundColor: '{colors.white}'
    textColor: '{colors.ink}'
    rounded: '{rounded.compact}'
    padding: 6px 11px
  navigation:
    textColor: '{colors.ink}'
    padding: 8px 10px
  faq:
    textColor: '{colors.ink}'
    rounded: '{rounded.flat}'
    padding: 20px 0
---

# Design System: Design System Loop

## Overview

**Creative North Star: "Violet orbit"**

Design System Loop uses a violet-black ground, pale lilac text, restrained Manrope headings and spectral process artwork. Ruled editorial sections make the information easy to scan; shallow perspective and sculptural material concentrate attention on the maintenance loop.

The user-selected violet identity remains established. Current homepage refinements use compact actions and open navigation, while supporting pages retain some earlier rounded treatments. `site/styles.css` owns shared primitives; homepage cascade order is `styles.css`, `home.css`, `theme.css`, `craft.css`, `refinements.css`, then `restored-loop.css`. The surface brief owns composition and demonstration timing. This document records the implemented local source, not a deployment or visual-quality certification.

**Key Characteristics:**

- Violet-black reading surfaces and lilac text.
- Manrope hierarchy, system reading text and monospace evidence.
- Spectral sculptures, concentric geometry and a shallow central record.
- Compact controls, ruled sections and accessible native interactions.

## Colors

### Primary

The action palette supplies the purple gradient and its lighter border; `accent` and `focus` support selection and visible focus. The current homepage removes the broad external button glow while retaining its inset highlight. `warm` is a technical severity annotation, not an implied success state.

### Neutral

Preserve the incumbent CSS names: `paper` is the violet-black page, `white` a raised dark surface, and `ink` the pale reading text. Muted text, boundaries and code grounds use their shared properties. Inherited loop properties remain available to supporting styles; the current hero has more specific local paints.

The hero's cyan, blue, lilac, rose and warm-white spectrum is a protected illustration treatment. The cool-blue after interface and deliberately inconsistent before palettes are specimen-local, outside the website token system. Generated sidecar ramps are previews only.

**The Scoped Color Rule.** Preserve the main loop spectrum without promoting illustration or demonstration paints into global brand tokens.

## Typography

Self-hosted variable Manrope supplies headings; its license remains `site/assets/OFL.txt`. System UI handles public reading text and the monospace stack handles commands, source and evidence. Base documentation display roles remain in the frontmatter because supporting pages still consume the shared styles; the homepage uses the hero and section roles.

Homepage titles use restrained weight and tight tracking. Meaningful section headings and introductions align left; the hero and closing action align center. Panel body copy uses 14px or larger; current compact specimens, hero labels and record text use a 12px floor. The larger letter specimens are illustrations. Existing 11px metadata in older supporting styles is not a recommendation for new content.

**The Three Voices Rule.** Use Manrope for hierarchy, the system stack for reading, and monospace for commands, source and technical labels.

## Layout

The shared container is `min(1280px, calc(100% - 2 * var(--gap)))`. Homepage sections use thin vertical rails, horizontal rules and small crosshair intersections. Two-column heading/description layouts collapse at 760px. Most substantial sections use the recorded section spacing; the problem and comparison have local spacing.

Entry paths form three ruled columns. Maintenance specimens share a two-by-two frame and stack on narrow screens. Adoption is a three-step ruled sequence, then a vertical sequence. The footer combines an introduction, two link columns and a typographic signature. These are homepage compositions, not mandatory layouts for every screen.

Compact comparison and component workbench are separate iframe documents resized by `home.js`. The comparison uses a two-by-two overview that stacks on narrow screens. The workbench uses a source library beside one product canvas; below 700px its library becomes four compact cells above the canvas. Long evidence and source scroll locally rather than widening the page.

## Elevation & Depth

Use thin boundaries and tonal separation for ordinary frames. The comparison and workbench product window have no broad frame shadow. Spectral light, sculpture and the tilted hero record supply the expressive depth; the record retains its specific soft shadow and inset highlight. Its mouse parallax is shallow, resets on pointer exit and is disabled for reduced motion. Touch does not drive parallax.

**The Scoped Light Rule.** Concentrate expressive illumination on the process artwork and preserve quiet reading and product frames.

## Shapes

The current homepage uses compact 4–12px corners for controls, specimens and frames. Main actions are 8px; the header action is 7px and secondary text actions are 6px. Older supporting-page pill navigation and controls remain an inherited implementation detail, not the default for new homepage work.

The loop uses concentric SVG geometry and five generated transparent PNG assets: a ribbon-loop brand mark and four process sculptures. The stage controls are unboxed. Small interface arrows, checks and row symbols use authored SVG. Text initials and numeric record identifiers remain data. Raster provenance is recorded in `.impeccable/review/workbench/artwork.md`.

## Components

### Actions and navigation

Primary actions retain the purple gradient, white text and thin violet border with a small inset highlight. Secondary actions are unfilled text controls. The homepage navigation has no enclosing pill frame; native links retain hover/current states. Shared visible focus uses a three-pixel outline offset five pixels. Copy buttons preserve their progress and polite success/fallback states.

### Maintenance loop

Four native pressed-state buttons select Measure, Decide, Verify and Retain. Sculptures, a circular progress trace and text color show selection; there is no stage card or Active badge. A central illustrative record and explanation change with selection. The continuous 24-second clock allocates six seconds per stage. Pause/Play, manual seeking, offscreen and hidden-tab pause, and reduced-motion behavior remain. Automatic text changes are not live-announced; manual changes are polite. Without JavaScript the initial record and explanation remain readable.

### Maintenance specimens and evidence

Four authored diagrams explain tokens, shared components, intentional density differences and saved decisions. Headings carry the categories without decorative eyebrows. These are illustrations, not operational component controls. Homepage FAQ uses native details/summary in flat ruled rows; source and reports retain their monospace ground and local overflow.

**The Evidence Boundary Rule.** Keep authored examples and illustrative records distinct from actual engine findings.

### Comparison and workbench

The compact overview has one full-canvas divider and one native keyboard range. Before and after preserve the same four product areas and data. Obsolete focus/strip review queries no longer select variants. Before remains structurally inconsistent with calmer color; after uses one polished cool-blue interface language.

“Your next feature starts here” introduces a separate finite workbench. Billing and Members reuse the same canvas and source library. Four DOM assembly phases show shell, type, controls and rows; Replay and Pause remain available. Reduced motion and no-JavaScript show a completed result. Component colors and timings belong to this demonstration, not shared website primitives.

## Do's and Don'ts

### Do:

- **Do** preserve the established violet identity and main loop spectrum.
- **Do** use shared properties for reading surfaces, text, actions and focus.
- **Do** preserve native controls, keyboard range access, visible focus and motion fallbacks.
- **Do** keep panel copy at least 14px and current specimen text at least 12px.
- **Do** retain synthetic-example disclosures and the artwork and font provenance.

### Don't:

- **Don't** promote local specimen paints or intentional before-screen inconsistencies into brand tokens.
- **Don't** restore boxed loop stages, an Active badge or pill-shaped main homepage actions.
- **Don't** use decorative eyebrows or Unicode glyphs as the small icon system.
- **Don't** imply automatic repair, measured customer outcomes or automatic agent memory through illustration.
- **Don't** treat local source checks as proof of live deployment, measured contrast or visual-reference equivalence.
