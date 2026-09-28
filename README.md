# Design System Loop

Your tokens and components are only useful when product code uses them. Design System Loop finds hardcoded styles and measures shared-component usage from your code.

**Works with:** CSS custom properties, ordinary CSS rules, and Tailwind classes in JavaScript/TypeScript. **Not yet:** SCSS, Vue/Svelte, CSS-in-JS or token JSON.

```sh
npx ds-loop@0.3.0
```

Run it from your project directory with Node 22.6 or later. You get findings, source locations, what was checked, and the next command. Read `verdict` and `coverage` together.

The engine checks code locally, without a model, API key or runtime dependencies. The companion skill guides your coding agent to plan and build. Your team decides what should change.

## What you see

This is real output from the [Example DS CSS fixture](https://github.com/owaizin/ds-loop/tree/main/fixtures/css-audit-example), an independently written test case. From a source checkout, reproduce it with `npm run ds-loop -- start fixtures/css-audit-example`:

<!-- verified: start-css-showcase -->
```text
  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [HIGH] token/raw-value-in-style · 1 color property value(s) contain literals in ordinary CSS (1 distinct); project permission not judged · 1 hits · styles.css:7
  [HIGH] token/raw-value-in-style · 1 spacing property value(s) contain literals in ordinary CSS (1 distinct); project permission not judged · 1 hits · styles.css:9
  [LOW] token/var-missing-fallback · 2 var() reference(s) have no fallback value · 2 hits · styles.css:8, styles.css:10
```

The color and spacing findings point straight to `styles.css:7` and `styles.css:9`. Run `npx ds-loop audit . --all` for risks, fix guidance and candidate tokens.

In a workspace, see which apps render shared components:

```sh
npx ds-loop consumers . --scope @your-org/ui
```

From the [Example DS workspace fixture](https://github.com/owaizin/ds-loop/tree/main/fixtures/example-workspace):

<!-- verified: consumers-example -->
```text
  @example/dashboard: shared-component share 75.0% · shared 3 · local 1 · external 0 · unresolved 0 · stories/tests 1 JSX elements
```

Shared-component share is shared / (shared + local) production JSX elements. External and unresolved elements stay outside that ratio; stories and tests are counted separately. This is a synthetic example, not an adoption benchmark.

## See the system

Save reports you can open locally or share with your team:

```sh
npx ds-loop audit . --html audit-report.html
npx ds-loop consumers . --html consumers-report.html
```

**Audit and token architecture.** Start with findings and coverage, then inspect token layers, references and source locations.

![Audit report for the Example DS CSS fixture, showing coverage, color and spacing findings, and source locations](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/audit-report.png)

**UI architecture and component usage.** See the workspace import graph and each app's shared-component share.

![Example DS workspace diagram showing dashboard and portal imports, shared-component share bars, and stories counted separately](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/consumers-report.png)

Both screenshots come from the public fixtures above. [Reproduce the reports](https://github.com/owaizin/ds-loop/blob/main/docs/assets/README.md).

## Work with your agent

Install the engine and companion skill in your project:

```sh
npm install --save-dev ds-loop@0.3.0
```

Then give your coding agent a problem:

> Read node_modules/ds-loop/skill/SKILL.md. Find why we're rebuilding components instead of using our system. Recommend a first improvement and how we'll verify it. Start read-only.

For a new system, ask it to set up editable foundations, reusable components in real workflows, a reference guide, and contribution instructions. For an existing system, name the feature or inconsistency you want to tackle. The agent inspects the repository, asks about decisions it can't infer, and carries out the scope you authorize.

It can compare foundation options from the MIT [ds-kit](https://github.com/owaizin/ds-kit), reuse your existing library, and produce a visual proposal with the bundled `skill/tools/proposal.mjs`. The handoff records what was delivered, verified and left unchecked. [Choose a workflow](docs/guide/workflow.md).

## Commands

| You want to… | Run |
|---|---|
| Get a first reading | `npx ds-loop` or `npx ds-loop start .` |
| See configuration and convention files | `npx ds-loop context .` |
| Inspect every finding or export data | `npx ds-loop audit . --all` or `--json` |
| Map shared imports and component usage | `npx ds-loop consumers .` |
| Compare measurements over time | `npx ds-loop scorecard .` |
| Inspect the palette or its clustering threshold | `npx ds-loop scan .` or `npx ds-loop sweep .` |
| Preview mechanical fallback fixes | `npx ds-loop fix .` |
| Get feedback after Claude Code edits | `npx ds-loop guard on` |

[Installation](docs/guide/install.md) · [Command reference](docs/guide/reference.md) · [More verified output](docs/guide/output.md)

## Limits

- The adapters read selected CSS properties and Tailwind utilities. They do not resolve the cascade, evaluate every styling expression or check inline styles. A clean result covers only the stated checks and scope; exit 0 alone can also mean nothing was checked. [Coverage details](docs/guide/reference.md#coverage).
- Token names and clustering thresholds are configurable. Match them to your conventions. Suggested tokens are candidates: equal values do not prove the same role in every theme. `fix` only adds mechanically resolvable `var()` fallbacks; it previews until you pass `--write`.
- Component share counts static JSX, not runtime renders or adoption quality. Unresolved imports can skew the known-origin ratio. Import diagrams do not prove runtime relationships.
- Layout, behavior, accessibility and design decisions need agent or human review of the rendered product. **Supervised alpha:** review changes in an isolated checkout. The skill does not bundle a universal component library or a Storybook specialist.
- Installing the package does not activate your agent or arrange background maintenance. The optional guard reports after edits; it cannot block them. CI gating is a separate team choice.
- The engine runs locally. Your agent's usage costs and data handling depend on its provider and host settings.

## Contribute

From a source checkout, run `npm ci`, then `npm test`, `npm run check`, `npm run type-check` and `npm run smoke`.

[Contribution notes](https://github.com/owaizin/ds-loop/blob/main/CLAUDE.md) · [Methodology](https://github.com/owaizin/ds-loop/blob/main/docs/METHODOLOGY.md) · [MIT licence](LICENSE)
