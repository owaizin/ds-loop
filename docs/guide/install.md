# Set up Design System Loop

Use Node 22.6 or later. Install the complete package in the project you want to inspect.

## Install from npm

```sh
npm install --save-dev ds-loop@0.2.0
```

npm currently serves 0.2.0. This checkout contains the expanded setup procedure for 0.2.1; use [source installation](#install-from-source) to try it before publication. Both paths install the CLI and companion skill. A local tarball path is specific to your machine; switch to the matching registry release before asking teammates to install it.

## Start with your agent

Ask your agent to read `node_modules/ds-loop/skill/SKILL.md`. Keep the complete package installed: its launcher requires the adjacent `bin/` and `dist/` directories. Copying just the skill folder is not a standalone installation. Your agent's automatic skill discovery depends on its own setup; direct loading makes the entry point explicit.

Describe the problem or outcome in your own words; you do not need to choose an internal command. For example:

> Read node_modules/ds-loop/skill/SKILL.md. Help me understand why developers keep creating local alternatives to our shared components. Investigate the cause and recommend a first delivery with clear completion criteria. Start read-only.

The agent should explain the evidence, recommended intervention, and scope. For a concrete task, say what it may implement. The [workflow guide](workflow.md) gives examples for starting, improving, and maintaining a system. Installing the package alone does not activate an agent or arrange ongoing maintenance.

## Run the checks yourself

You can also use the engine directly, without an agent. From your project directory:

```sh
./node_modules/.bin/ds-loop context .
./node_modules/.bin/ds-loop audit . --json
```

`context` reports configuration, conventional intent-source paths and extraction scope. It runs no rules. The unfiltered audit reports findings and checks that could not judge. Inspect both `verdict` and `coverage`; exit 0 alone does not establish a clean result. These commands provide measurements; they do not conduct the interview or recommend an engagement plan.

## Optional: add edit feedback

From the target project, run:

```sh
./node_modules/.bin/ds-loop guard on
./node_modules/.bin/ds-loop guard status
```

This installs a Claude Code PostToolUse hook in `.claude/settings.json`. It reports high-severity findings after supported edits and announces project extraction-coverage changes. It never blocks an edit. It does not deliver lower-severity judgment limits; run an unfiltered audit at setup and completion. `guard off` removes its entry while preserving other settings.

If the audit fails or times out, the hook says the edit was not checked and reports
the error. Correct the problem and rerun the audit before relying on its result.

## Optional: choose a CI policy

```sh
./node_modules/.bin/ds-loop audit . --min-severity high --require-coverage
```

This fails on findings at the chosen floor or reported coverage gaps. Its pass applies only to the adapters' stated scope and chosen severity. Review your repository's unsupported formats before enabling it. Run an unfiltered audit separately when you need all findings.

## Check the installation

You should receive a report containing a verdict, adapter coverage and findings or their absence. If the result is `not-checked`, consult [coverage](reference.md#coverage); reinstalling will not add an adapter for an unsupported format.

## Install from source

Use this path to test a local change. In a directory outside the project you want to inspect:

```sh
git clone https://github.com/owaizin/ds-loop.git
cd ds-loop
npm ci
npm pack
```

This builds `ds-loop-0.2.1.tgz` without publishing it. From your target project, install the tarball using its actual absolute path:

```sh
npm install --save-dev /absolute/path/to/ds-loop-0.2.1.tgz
```

Continue with [Start with your agent](#start-with-your-agent), or [run the checks yourself](#run-the-checks-yourself). The launcher uses the compiled JavaScript included in the package.

To try the public Radix Colors fixture from the source checkout:

```sh
npm run ds-loop -- audit fixtures/radix-colors
```

The fixture contains known findings, so exit 1 is expected. Fixtures and development scripts are not included in the npm package.

[Next: work through a change](workflow.md)
