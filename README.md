# Design System Loop

**Your design-system team, working with your coding agent.**

Your product is growing. Buttons get rebuilt, tokens get bypassed, and the reasons behind design decisions disappear in chat. Design System Loop helps you understand what you have, improve what needs work and leave a system the next developer can use.

```sh
npx ds-loop@0.4.0
```

Run from your project directory with **Node 22.6+**. This checks supported source and saves a local report. For guided implementation, [connect your coding agent](#work-with-your-coding-agent).

[Website](https://design-system-loop.vercel.app) · [Getting started](docs/guide/install.md) · [Workflows](docs/guide/workflow.md) · [npm](https://www.npmjs.com/package/ds-loop)

![Design System Loop audit showing findings beside coverage, with color and spacing evidence from the public Example DS fixture](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/audit-report.png)

*Real output from an invented, public test project. [Reproduce this report](docs/assets/README.md).*

## Start where your team is

You don't need to replace a working system or have one already.

| Your starting point | What the skill helps your agent deliver |
|---|---|
| **“We don't have a system.”** | Agree on foundations, build reusable components in a real product flow, and leave usage and contribution guidance. |
| **“We have one, but people work around it.”** | Find whether the problem is a missing capability, unclear guidance or drift. Improve an agreed area and check the result. |
| **“Our AI keeps reinventing our components.”** | Make existing components, APIs and decisions discoverable. Test whether a fresh agent can find and use them correctly. |
| **“We need to keep it working.”** | Inspect known consumers, review changes, retain exceptions and compare supported measurements over time. |

The **engine** supplies repeatable source checks and evidence. The **skill** guides your agent through diagnosis, delivery and verification. Your team keeps control of priorities and shared decisions.

## Work with your coding agent

Install the package and connect it to your project:

```sh
npm install --save-dev ds-loop@0.4.0
npx ds-loop install --agent codex
```

Use `--agent claude`, `cursor` or `all` for your host. The installer preserves your instructions and updates only its own marked block. [Claude Code plugin and other setup options](docs/guide/install.md).

Then describe the problem in your own words:

> Use Design System Loop to understand our existing system. Find why we're rebuilding components, recommend a first improvement and explain how you'll verify it. Start read-only.

The agent investigates your repository, asks about decisions it can't infer and proposes a useful next step. Once authorized, it carries out the work and records what was delivered, verified and left unchecked.

For a new system, ask for editable foundations, components used in real workflows and guidance for extending them. For an established system, keep what works. A component catalog or better instructions may be more useful than another redesign.

**Installation doesn't start an agent.** Load the skill in your host or point it to `node_modules/ds-loop/skill/SKILL.md`. No separate agent framework is required.

<details>
<summary>Browse the Claude Code plugin commands</summary>

These shortcuts are provided by the Claude Code plugin. In other hosts, describe the same task in your prompt.

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

</details>

## Try the source checks on their own

You can use the CLI without an AI account. It runs locally, with no model calls, API key or runtime dependencies.

```sh
npx ds-loop audit .
```

The summary names the finding, its source locations and what the engine could read. Here is a real excerpt from the [Example DS fixture](https://github.com/owaizin/ds-loop/tree/main/fixtures/css-audit-example):

<!-- verified: start-css-showcase -->
```text
  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:7
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:9
  [LOW] Missing backup values · token/var-missing-fallback · 2 hits · styles.css:8, styles.css:10
```

The first two rows point to color and spacing literals. They establish what is in the code; the agent or team decides whether those values should change.

```sh
npx ds-loop audit . --all                 # Full findings and token suggestions
npx ds-loop audit . --html audit.html     # Shareable audit and token architecture
npx ds-loop consumers . --html usage.html # Workspace imports and component usage
```

Token suggestions are candidates, not automatic replacements. [See more verified output](docs/guide/output.md).

## See the system behind the screens

Reports are self-contained HTML files. Open them locally or share them with your team.

- **Audit:** findings, coverage, styling inventory and token references, with source locations.
- **Consulting report:** the measured state alongside an agent-written assessment, proposed changes and a plan. Run `npx ds-loop report . --consult consult.json` after the agent prepares the assessment.
- **Component usage:** workspace imports and static shared-component usage, with stories and tests counted separately.
- **Dashboard:** today's measurements and comparable saved trends. Run `npx ds-loop scorecard .` to save a row, then `npx ds-loop dashboard .` to view it. A single run does not invent a trend.

<details>
<summary>View the component-usage report</summary>

![Example DS workspace report showing dashboard and portal imports, shared-component share and separate story/test usage](https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/consumers-report.png)

This is a synthetic workspace, not a customer benchmark. Shared-component share counts static production JSX, not runtime renders or adoption quality.

</details>

[Report examples](docs/guide/output.md) · [Command reference](docs/guide/reference.md)

## What it reads—and what still needs review

**Supported source:** CSS custom properties, selected ordinary CSS properties, selected Tailwind utilities in JavaScript/TypeScript, DTCG/Style Dictionary token JSON, and bounded SCSS/Sass extraction.

**Coverage limits:** no Vue/Svelte template or CSS-in-JS support, full Sass evaluation, complete composite-token evaluation or browser cascade resolution. Every audit reports its coverage. A clean result covers only the checks and scope that ran.

**Design and behavior:** layout, interaction, accessibility and effective theme values need rendered review. The skill guides that work; a source audit cannot certify it. The skill is a supervised alpha: review implementation changes before shipping.

**Changes and maintenance:** `fix` previews mechanically resolvable `var()` fallback edits until you pass `--write`. The optional Claude Code guard reports after edits and cannot block them. CI policy and background scheduling are separate choices. Your coding agent's costs and data handling depend on its provider and host settings.

## Built for the work after the audit

A list of inconsistencies is only the beginning. The useful outcome is a system someone can use: working components, decisions they can find and a clear way to make the next change.

Design System Loop is open source under MIT. Use it with your existing library, or explore foundation options in [ds-kit](https://github.com/owaizin/ds-kit). Storybook is optional; the skill can guide a small setup and refer deeper work to the separately installed Storybook Architect skill.

## Contribute

Bug reports are most useful with a small reproduction, the command you ran and its coverage output. Please remove private source and customer data before opening an [issue](https://github.com/owaizin/ds-loop/issues).

From a checkout:

```sh
npm ci
npm run check
npm run type-check
npm test
npm run smoke
```

[Contributor instructions](CLAUDE.md) · [Methodology](docs/METHODOLOGY.md) · [Website documentation sync](docs/WEBSITE-SYNC.md) · [MIT license](LICENSE)
