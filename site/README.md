# Design System Loop website

A static site with self-hosted typography. No framework, analytics, or browser-side engine execution. Serve `site/` as the web root.

```sh
npm run site:serve
npm run site:check
```

Preview: http://127.0.0.1:4187. Set `DS_LOOP_SITE_PORT=4188` if that port is busy.

## Customer journey

The homepage explains the outcome, shows synthetic product examples, and offers Start / Improve / Maintain. Setup follows install → load the skill → agree on delivery. Direct engine commands are optional; readers do not have to interpret an audit before working with an agent.

A full setup means editable foundations, reusable components and product patterns adopted in the agreed workflows, a reference using the same source, and usage and maintenance guidance. A first screen is a checkpoint unless the request is only for a pilot. The skill guides the agent; the engine supplies deterministic checks; the team retains shared decisions and release authority.

Use **Design System Loop** publicly and `ds-loop` for technical identifiers. Preserve supervised-alpha, coverage, and synthetic-example disclosures. The engine's local execution is not a privacy guarantee for the agent's provider.

## Files

- `index.html`: product promise, interactive maintenance loop, comparison, three entry paths, deliverables, workbench, engagement steps, FAQs.
- `setup.html`: published installation, explicit skill loading, delivery prompt, source installation, and help.
- `docs.html`, `workflows.js`: task examples, connected loops, progress and handoff.
- `reference.html`, `examples.json`: engine commands, configuration, limits, and reproduced output.
- `example.html`, `system-example.html`, `demo/`: synthetic examples. They do not execute an automated design-system repair.
- `app.js`: copy controls and documentation navigation.
- `home.js`: loop clock, stage selection, playback, and iframe sizing.
- `loop-field.js`, `loop-field-home.js`: background ring renderer and selected preset.
- `assets/`: original illustration assets, Manrope font, license and [provenance](assets/README.md).
- `variants/`: local design review tools, excluded from deployment.

## Visual contract

Preserve the selected violet-black identity, lilac text, purple actions and Circuit D/S mark. Homepage stylesheet order: `styles.css`, `home.css`, `theme.css`, `craft.css`, `refinements.css`, `restored-loop.css`. The final layer supplies the rectangular glass stage cards and spectral icons.

The central loop takes 24 seconds, six per stage. Background rings repeat over 12 seconds. Pause controls both; reduced motion starts paused; offscreen and hidden-tab handling remain. Automatic stage changes are not live-announced. The initial example remains readable without JavaScript.

The four-area comparison has one native range control and stacks on narrow screens. The separate component workbench illustrates reuse in Billing and Members with a finite assembly animation. Reduced motion shows its completed state. Product specimens use local palettes; they are not website brand tokens.

Shared design decisions live in `../DESIGN.md` and `../.impeccable/surfaces/site-index-html.md`. Historical review captures remain local and are not needed to build the site.

## Release alignment — 21 September 2026

npm currently serves **0.2.0**; the checkout is **0.2.1**. Public install commands use the available registry version. The homepage FAQ, setup and guide label the expanded establishment workflow as 0.2.1 source work, with source installation instructions. Do not announce it as available on npm before publication is verified.

Saved examples are regenerated from local engine 0.2.1. `site:check` compares all four excerpts against fresh engine output and their HTML representation. The engine is unchanged from 0.2.0; the earlier registry-artifact check is historical evidence, not a new download check.

After 0.2.1 is published, verify its downloaded artifact, update the pinned commands in README.md, docs/guide/install.md and setup.html, and remove the pending-release notes from the homepage, setup, guide and README. Update this record too. Do not globally replace historical version references.

After engine output changes, run `npm run site:examples`, update the reference excerpts from real output, then run `npm run site:check`. The latter also checks local links, HTML anchors and copy targets. CI runs it alongside the existing repository checks.

## Hosting

The configured target is https://design-system-loop.vercel.app. Deploy only `site/`, with index.html at its root. `vercel.json` disables build and install steps. Internal README files, local review tools and the `.vercel` account link are excluded from deployment. Website source is outside the npm package's file allowlist.

Committing these files does not deploy the site. Deployment and npm publishing are separate actions.
