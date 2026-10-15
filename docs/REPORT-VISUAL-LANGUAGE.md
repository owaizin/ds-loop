# Report visual language

The Ember glass foundations live in `src/core/ember-theme.ts` and are inlined by `report-html.ts` and `assessment-html.ts`. Reports stay offline and self-contained. The same foundations feed the website style guide, report walkthrough, and historical report sample skins through the website repository’s explicit `scripts/sync-report-theme.mjs` command.

The palette adapts the orange, lavender, and aubergine direction requested from [Devloopy](https://www.behance.net/gallery/239537691/Devloopy). No reference artwork is included. Gradient actions use dark aubergine text; glass uses a translucent highlight and warm edge light. Light mode retains a warm cream reading canvas. Brand colors are decorative and must not replace severity or evidence meanings.

Change `EMBER_FOUNDATIONS_CSS` for shared paints and `EMBER_REPORT_CSS` for report treatment. Keep presentation overrides screen-only so the existing print rules remain authoritative. After edits, build and run report/assessment tests; inspect dark/light and narrow layouts, and sync the website assets. This source change is not a published package release.
