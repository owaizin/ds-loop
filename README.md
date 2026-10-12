# Design System Loop

Your tokens and components are only useful when product code uses them. Design System Loop finds hardcoded styles and measures shared-component usage from your code.

**Works with:** CSS custom properties, ordinary CSS rules, Tailwind classes in JavaScript/TypeScript, DTCG/Style Dictionary token JSON, and bounded SCSS/Sass extraction. **Not yet:** Vue/Svelte or CSS-in-JS. Sass evaluation and composite JSON values remain coverage limits.

```sh
npx ds-loop@0.4.0
```

Run it from your project directory with Node 22.6 or later. Your first run saves `ds-loop-report.html` and prints findings, what was checked, and the next command. Open the report for findings and coverage; ask your agent to add the assessment and plan. Existing reports are preserved. Read `verdict` and `coverage` together.

The engine checks code locally, without a model, API key or runtime dependencies. The companion skill guides your coding agent to plan and build. Your team decides what should change.

## Read your first results

This is real output from the [Example DS CSS fixture](https://github.com/owaizin/ds-loop/tree/main/fixtures/css-audit-example), an independently written test case. From a source checkout, reproduce it with `npm run ds-loop -- start fixtures/css-audit-example`:

<!-- verified: start-css-showcase -->
```text
  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:7
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:9
  [LOW] Missing backup values · token/var-missing-fallback · 2 hits · styles.css:8, styles.css:10
```

The color and spacing findings point straight to `styles.css:7` and `styles.css:9`. Run `npx ds-loop audit . --all` for risks, fix guidance and candidate tokens.

Save the findings, architecture and coverage as one consulting report:

```sh
npx ds-loop report .
```

With an agent-written assessment, add `--consult consult.json`. Without it, the
problem, recommended practices, proposed state and plan are clearly marked as not
written yet. From the source checkout, run
`npm run ds-loop -- report fixtures/css-audit-example --out scratch/phase-1/css-report.html`:

<!-- verified: report-css-example -->
```text
  ds-loop report — ds-loop
  wrote scratch/phase-1/css-report.html
```

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

## Check which files have importers

Reachability helps you separate code your product ships from tests, stories, examples and orphans by showing which finding locations have a static importer in the scanned tree. It does not prove runtime use or justify deletion: dynamic imports, route manifests, globs, build-time copies and consumers outside the tree can be missed. Read the [states and limits](docs/guide/reference.md#reachability) before using it to prioritize work.

## Open a visual report

Save reports you can open locally or share with your team:

```sh
npx ds-loop report . --consult consult.json --out consulting-report.html
npx ds-loop audit . --html audit-report.html
npx ds-loop consumers . --html consumers-report.html
```

**Audit and token architecture.** Start with findings and coverage, then inspect token layers, references and source locations.

![Audit report for the Example DS CSS fixture, showing coverage, color and spacing findings, and source locations](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/audit-report.png)

**UI architecture and component usage.** See the workspace import graph and each app's shared-component share.

![Example DS workspace diagram showing dashboard and portal imports, shared-component share bars, and stories counted separately](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/consumers-report.png)

Both screenshots come from the public fixtures above. [Reproduce the reports](https://github.com/owaizin/ds-loop/blob/main/docs/assets/README.md).

## Ask your agent to help

Install the engine and companion skill in your project:

```sh
npm install --save-dev ds-loop@0.4.0
npx ds-loop install --agent codex
```

Use `--agent claude`, `cursor` or `all` for another host. The installer preserves
your text and updates only its marked block. Add `--guard` to opt into Claude Code
post-edit feedback. [Installer details](docs/guide/install.md#add-instructions-for-your-agent).

For automatic discovery, use the [Claude Code plugin or Codex skill setup](docs/guide/install.md#claude-code-plugin). Both use the same bundled skill.

Then give your coding agent a problem:

> Read node_modules/ds-loop/skill/SKILL.md. Find why we're rebuilding components instead of using our system. Recommend a first improvement and how we'll verify it. Start read-only.

For a new system, ask it to set up editable foundations, reusable components in real workflows, a reference guide, and contribution instructions. For an existing system, name the feature or inconsistency you want to tackle. The agent inspects the repository, asks about decisions it can't infer, and carries out the scope you authorize.

It can compare foundation options from the MIT [ds-kit](https://github.com/owaizin/ds-kit), reuse your existing library, and produce a visual proposal with the bundled `skill/tools/proposal.mjs`. The handoff records what was delivered, verified and left unchecked. [Choose a workflow](docs/guide/workflow.md).

With the companion skill loaded, ask your agent for one of these commands. Each
starts by reading your code and running `ds-loop context` and an unfiltered
`ds-loop audit`. The CLI commands below supply evidence and write the requested
artifacts; the agent follows the bundled playbooks.

| Agent command | What you get | Backing CLI commands |
|---|---|---|
| `/ds-loop:start` | A first reading of your system | `context`, `audit`, `report` |
| `/ds-loop:diagnose` | A cause and a first action | `context`, `audit`, `consumers` |
| `/ds-loop:inventory` | What exists and who uses it | `audit`, `consumers` |
| `/ds-loop:foundations` | Type, colour and spacing options | `audit`, `scan`, `sweep` |
| `/ds-loop:propose` | A plan your team can approve | `audit`, `consumers`, `report` |
| `/ds-loop:establish` | A system your product can use | `context`, `audit`, `consumers` |
| `/ds-loop:transform` | A checked migration slice | `audit`, `consumers` |
| `/ds-loop:component` | A component built or reviewed | `audit`, `consumers` |
| `/ds-loop:document` | Guides tied to real code | `context`, `audit`, `consumers` |
| `/ds-loop:govern` | Decisions with owners and evidence | `context`, `audit`, `decide` |
| `/ds-loop:drift` | Feedback after edits | `audit`, `guard` |
| `/ds-loop:prove` | What changed and what wasn't checked | `audit`, `scorecard`, `report` |

## Choose your next command

| You want to… | Run |
|---|---|
| Get a first reading | `npx ds-loop` or `npx ds-loop start .` |
| Check installation, contract drift and guard state | `npx ds-loop doctor .` |
| See configuration and convention files | `npx ds-loop context .` |
| Inspect every finding or export data | `npx ds-loop audit . --all` or `--json` |
| Save a consulting report | `npx ds-loop report . --consult consult.json` |
| Map shared imports and component usage | `npx ds-loop consumers .` |
| Open today’s measurements and saved trends | `npx ds-loop dashboard .` |
| Find direct consumers of an export | `npx ds-loop impact '@example/ui#Button' .` |
| Record a decision with its owner and evidence | `npx ds-loop decide --help` |
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


### See whether your system is changing

```sh
npx ds-loop scorecard .
# Save another run after a source change, then:
npx ds-loop dashboard .
```

Open `ds-loop-dashboard.html` for today's verdict, tokenization and shared-component
trends, findings by theme and coverage. One HTML file, fully offline. With fewer
than two saved runs it shows today alone; it never invents a baseline. Instrument
changes break the chart and are labelled. The guard refreshes existing dashboards
after edits. [Dashboard reference and CI setup](docs/guide/reference.md#dashboard-today-and-saved-trends).

Captured with `npm run ds-loop -- dashboard fixtures/css-audit-example --out scratch/phase-2/dashboard-empty.html`:

<!-- verified: dashboard-css-example -->
```text
  ds-loop dashboard — ds-loop
  wrote scratch/phase-2/dashboard-empty.html
```

## Website and documentation updates

The website is maintained in [ds-loop-site](https://github.com/owaizin/ds-loop-site). Update `docs/guide/` here alongside behavior changes; those files ship in the npm package. After publication, the website checks for the release hourly, verifies examples against the package, and opens a documentation update PR. Merging that PR deploys the website. See [the release handoff](docs/WEBSITE-SYNC.md).
