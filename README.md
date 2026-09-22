# Design System Loop

Your next feature should build on the components you already have. When teams keep rebuilding forms, controls and tables, Design System Loop helps you establish a shared foundation, resolve competing implementations and make the system easier to use and maintain.

Install in your project with Node 22.6 or later:

```sh
npm install --save-dev ds-loop@0.2.1
```

Then ask your coding agent to load the skill and describe the problem you want solved:

> Read node_modules/ds-loop/skill/SKILL.md. Our developers keep rebuilding similar components. Investigate a recent example, explain the cause, and recommend a first improvement with a clear finish line. Start read-only.

Replace that example with your own task. Installing the package provides the engine
and skill files; loading the skill starts the guided work. The agent reads the
repository, asks about unknowns that affect the plan, and carries out the work you
authorize. You do not need to choose its internal commands.

[Installation guide](docs/guide/install.md) · [Design-system workflows](docs/guide/workflow.md) · [CLI reference](docs/guide/reference.md)

## Work on your design system

Describe the outcome you need and the product areas it should cover. A precise repair needs a short plan; a first system needs discovery and an agreed delivery scope.

- **Starting a system:** choose a suitable base, build shared foundations and components, and adopt them in the agreed product workflows. Deliver usage and maintenance guidance alongside the code. A first screen is a checkpoint unless you asked only for a pilot.
- **Improving a partial system:** compare competing implementations with the team's conventions. Reuse the agreed pattern where it fits, and explain differences that need to stay.
- **Maintaining a system:** review new components and changes against existing conventions. Check affected screens and update the documentation when the team makes a new decision.

The package includes an **agent skill** that guides this work and a **command-line engine** that checks supported token and styling code. Your team chooses the design direction and reviews the result. The engine reports source locations and coverage limits; it runs locally without a model, API key, network access, or runtime dependencies.

The skill's broader reviews require an agent to inspect the code and rendered UI. They are not automated engine checks. See the [workflow guide](docs/guide/workflow.md) for examples and expected results.

## What a setup should leave behind

The 0.2.1 setup procedure asks your agent to deliver:

- Editable foundations for type, color, spacing and relevant interaction states.
- Reusable controls and product patterns connected to real workflows.
- A reference or style guide using the same components as the product.
- Instructions for using, customizing, extending and checking the system.

It should reuse a suitable existing library. Design System Loop does not ship a
universal component kit or require shadcn/ui or Storybook. For deeper Storybook
work, the agent can hand off to an available specialist; that skill is not bundled.

Completion includes checking the affected product and demonstrating how a later
contributor can find the guidance and make a change. The handoff distinguishes
what was delivered, what was verified and what remains untested.

## Use it in your project

For a direct engine check, run:

```sh
./node_modules/.bin/ds-loop context .
./node_modules/.bin/ds-loop audit . --json
```

`context` lists configuration, likely sources of design conventions, and supported formats. `audit` runs the code checks. Read the report's `verdict` and `coverage`: exit code 0 can mean nothing was checked. Use `--require-coverage` when CI should fail on reported coverage gaps.

Ask your coding agent to read `node_modules/ds-loop/skill/SKILL.md`, then describe the area you want to work on. For example:

> Compare the forms across our settings screens. Read the shared components and repository guidelines. Identify which differences are accidental and which support different behavior. Propose what to reuse before editing. Once we agree, update the settings screens, check their states and keyboard behavior, and document the decisions beside the components.

Keep the whole package installed; the skill needs its launcher and compiled engine. The [installation guide](docs/guide/install.md) also explains how to enable feedback after Claude Code edits and configure CI checks.

## What the engine finds

Token rules already appear in design-system guidance:

> “Never hardcode colors, spacing, or typography values.”
> — [Fluent UI's agent instructions, rule 1](https://github.com/microsoft/fluentui/blob/master/AGENTS.md#critical-rules-never-violate)

The engine checks for specific ways code can bypass tokens. In this synthetic example, a component hardcodes a color already declared as a token and two lengths:

<!-- verified: audit-markup -->
```
  [HIGH] token/raw-value-in-markup
  │ 3 hardcoded value(s) at use sites bypass the token layer (1 colour, 2 length; 3 distinct …
  │ where: bg-[#1da1f2] at Card.tsx:2; p-[13px] at Card.tsx:2; text-[14px] at Card.tsx:3
  │ fix:   #1da1f2 is already --palette-blue-500. Swap those first. …
```

Before replacing the color, check that the token serves the same purpose in every affected theme. A matching value alone does not establish that.

[View more audit reports](docs/guide/output.md) or [follow a theme fix](docs/guide/example.md) from the original code through browser checks and a documented decision. The [State of AI in Design Systems survey](https://github.com/kaelig/state-of-ai-in-design-systems) provides further examples of how teams guide agents to use their systems.

## Cost and code access

The package and skill are MIT licensed. Your coding agent’s usage costs and data
handling are separate. The engine runs locally, but the agent may send repository
context to its provider according to your host’s settings. There is no automatic
background maintenance.

## Current limits

- The CSS adapter reads custom-property declarations. It does not check ordinary CSS rule bodies or at-rules.
- The Tailwind adapter reads selected arbitrary values and stock-palette utility names in JavaScript and TypeScript strings. It does not resolve their theme values or check inline styles, CSS-in-JS, Sass maps, or token JSON.
- The engine does not review layouts, interactions, accessibility, or whether a design choice is appropriate. Check the rendered UI separately.
- Token naming patterns and color-clustering thresholds are configurable. Adjust them to your system before relying on those checks.

**Supervised alpha:** review changes in an isolated checkout before applying them more widely. A clean audit applies only to the code and checks it covered. [Read the full coverage limits](docs/guide/reference.md#coverage).

## Development

From a repository checkout, run `npm ci`, then:

```sh
npm test
npm run check
npm run type-check
npm run smoke
```

See [contribution notes](https://github.com/owaizin/ds-loop/blob/main/CLAUDE.md), and the [methodology](https://github.com/owaizin/ds-loop/blob/main/docs/METHODOLOGY.md).

Public examples use open-source or synthetic inputs. Client material stays outside this repository. See [LICENSE](LICENSE) for the MIT terms.
