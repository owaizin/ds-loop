# Set up Design System Loop

Give your agent the same design-system instructions on every task. Install the
complete package in your project with Node 22.6 or later.

## Install from npm

```sh
npm install --save-dev ds-loop@0.4.0
```

To test local changes, use [source installation](#install-from-source). Both paths install the CLI and companion skill. A local tarball path is specific to your machine; switch to the matching registry release before asking teammates to install it.

## Add instructions for your agent

```sh
npx ds-loop install --agent codex --dry-run
npx ds-loop install --agent codex
```

Choose `claude`, `cursor`, `codex` or `all`. Without `--agent`, the installer detects
`.claude/`, `.cursor/`, and either `AGENTS.md` or `.codex/`. If it finds none, it
writes nothing and prints three runnable choices with their destination files:
`ds-loop install --agent claude` writes `CLAUDE.md`,
`ds-loop install --agent cursor` writes `.cursor/rules/ds-loop.mdc`, and
`ds-loop install --agent codex` writes `AGENTS.md`. Run the command for your agent;
use `npx ds-loop` in place of `ds-loop` for a local npm installation.

| Agent | Project file |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/ds-loop.mdc` |
| Codex | `AGENTS.md` |

The [installer](../../src/commands/install.ts) writes a short instruction block:
the first CLI command, twelve agent commands, and paths to the bundled skill and
command instructions. It creates missing parent directories and files. In an
existing file it appends the block and preserves your text. On reruns it replaces
only the text between `<!-- ds-loop:start -->` and `<!-- ds-loop:end -->`, including
the markers. Unchanged blocks aren't rewritten. Missing, repeated or reversed
markers stop installation before any selected instruction file changes.

The guard is opt-in because it edits your `.claude/settings.json`:

```sh
npx ds-loop install --agent claude --guard --dry-run
npx ds-loop install --agent claude --guard
```

Without `--guard`, installation only writes agent instructions. `--dry-run`
previews both instruction and requested guard changes. These references don't
launch an agent or register slash commands in every host; load the bundled skill
using your agent's setup below.

## Get a first reading

From your project directory, run `npx ds-loop` (or `npx ds-loop start .`).
On a fresh project it prints findings and coverage and writes `ds-loop-report.html`.
Open it for findings and coverage, then ask your agent to add the assessment and plan.
A pre-existing report or `.ds-scorecard/` prevents automatic creation. Explicit
`npx ds-loop report .` refreshes the report; `audit` remains read-only unless given an output flag.

## Check the installation

Run `npx ds-loop doctor .` for read-only installation and contract diagnostics.
It reports missing evidence and drift without changing settings or acting as a CI gate.

Your first audit produces a report containing a verdict, adapter coverage and findings or their absence. If the result is `not-checked`, consult [coverage](reference.md#coverage); reinstalling will not add an adapter for an unsupported format.

## Start with your agent

Ask your agent to read `node_modules/ds-loop/skill/SKILL.md`. Keep the complete package installed: its launcher requires the adjacent `bin/` and `dist/` directories. Copying just the skill folder is not a standalone installation. Your agent's automatic skill discovery depends on its own setup; direct loading makes the entry point explicit.

Describe the problem or outcome in your own words; you do not need to choose an internal command. For example:

> Read node_modules/ds-loop/skill/SKILL.md. Help me understand why developers keep creating local alternatives to our shared components. Investigate the cause and recommend a first delivery with clear completion criteria. Start read-only.

The agent should explain the evidence, recommended intervention, and scope. For a concrete task, say what it may implement. The [workflow guide](workflow.md) gives examples for starting, improving, and maintaining a system. Installing the package alone does not activate an agent or arrange ongoing maintenance.

## Run the checks yourself

You can also use the engine directly, without an agent. From your project directory:

```sh
npx ds-loop context .
npx ds-loop audit . --json
```

`context` reports configuration, conventional intent-source paths and extraction scope. It runs no rules. The unfiltered audit reports findings and checks that could not judge. Inspect both `verdict` and `coverage`; exit 0 alone does not establish a clean result. These commands provide measurements; they do not conduct the interview or recommend an engagement plan.

## Optional: add edit feedback

From the target project, run:

```sh
npx ds-loop guard on
npx ds-loop guard status
```

This installs a Claude Code PostToolUse hook in `.claude/settings.json`. It reports high-severity findings after supported edits and announces project extraction-coverage changes. It never blocks an edit. It does not deliver lower-severity judgment limits; run an unfiltered audit at setup and completion. `guard off` removes its entry while preserving other settings.

If the audit fails or times out, the hook says the edit was not checked and reports
the error. Correct the problem and rerun the audit before relying on its result.

## Optional: choose a CI policy

```sh
npx ds-loop audit . --min-severity high --require-coverage
```

This fails on findings at the chosen floor or reported coverage gaps. Its pass applies only to the adapters' stated scope and chosen severity. Review your repository's unsupported formats before enabling it. Run an unfiltered audit separately when you need all findings.

## Install from source

Use this path to test a local change. In a directory outside the project you want to inspect:

```sh
git clone https://github.com/owaizin/ds-loop.git
cd ds-loop
npm ci
npm pack
```

This builds `ds-loop-0.4.0.tgz` without publishing it. From your target project, install the tarball using its actual absolute path:

```sh
npm install --save-dev /absolute/path/to/ds-loop-0.4.0.tgz
```

Continue with [Start with your agent](#start-with-your-agent), or [run the checks yourself](#run-the-checks-yourself). The launcher uses the compiled JavaScript included in the package.

To try the public Radix Colors fixture from the source checkout:

```sh
npm run ds-loop -- audit fixtures/radix-colors
```

The fixture contains known findings, so exit 1 is expected. Fixtures and development scripts are not included in the npm package.

[Next: work through a change](workflow.md)

## Claude Code plugin

After installing `ds-loop@0.4.0`, launch Claude Code from your project:

```sh
claude --plugin-dir ./node_modules/ds-loop
```

Invoke `/ds-loop:ds-loop` and describe your goal. The plugin loads the same skill,
including its roles, practices and playbooks, and registers the post-edit guard.
Do not also install the project guard: if you previously ran `guard on`, run
`npx --no-install ds-loop guard off` before using the plugin to avoid duplicate feedback.
Leaving the plugin out of the next session removes its hook from that session.
The hook reports after edits; it cannot block them or replace an unfiltered audit.

To install it without npm, add this repository as a plugin marketplace:

```text
/plugin marketplace add owaizin/ds-loop
/plugin install ds-loop@ds-loop
```

To update the installed plugin, run this in your terminal:

```sh
claude plugin marketplace update ds-loop
claude plugin update ds-loop@ds-loop
```

Start a new Claude Code session to load the update. The marketplace command
refreshes the listing; the plugin command updates the installed copy. You can
also enable auto-update for this marketplace in Claude Code's `/plugin` panel.
A marketplace install runs from the repository source and needs Node 22.6 or later.

The package follows Claude Code's [plugin manifest format](https://code.claude.com/docs/en/plugins-reference)
and [local loading workflow](https://code.claude.com/docs/en/plugins).
Keep the entire package or repository together. The npm package runs compiled
JavaScript; the repository launcher can run source directly on Node 22.6 or later.

## Codex skill

The same `skill/SKILL.md` is the Codex entry point, using the documented
[local skill discovery format](https://developers.openai.com/codex/skills/#where-codex-loads-local-skills). From your project root,
make it discoverable without copying it away from the engine:

```sh
mkdir -p .agents/skills
ln -s ../../node_modules/ds-loop/skill .agents/skills/ds-loop
```

Start a new Codex session and invoke `$ds-loop`, followed by your goal. The relative
link stays inside the project and resolves the package's launcher. If a skill with
that name already exists, inspect it before replacing it. Directly asking Codex to
read `node_modules/ds-loop/skill/SKILL.md` also works. Codex does not run the Claude
Code hook; run the unfiltered audit at setup and completion as the skill directs.
