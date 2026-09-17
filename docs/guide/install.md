# Set up Design System Loop

Use Node 22.6 or later. Install the complete package in the project you want to inspect.

## Install from npm

```sh
npm install --save-dev ds-loop@0.1.2
```

Before the first npm release, use [source installation](#install-from-source) instead. Both paths install the same CLI and companion skill.

## Inspect your project

From your project directory:

```sh
./node_modules/.bin/ds-loop context .
./node_modules/.bin/ds-loop audit . --json
```

`context` reports configuration, conventional intent-source paths and extraction scope. It runs no rules. The unfiltered audit reports findings and checks that could not judge. Inspect both `verdict` and `coverage`; exit 0 alone does not establish a clean result.

## Load the companion skill

Ask your agent to read `node_modules/ds-loop/skill/SKILL.md`. Keep the complete package installed: its launcher requires the adjacent `bin/` and `dist/` directories. Copying just the skill folder is not a standalone installation. Your agent's automatic skill discovery depends on its own setup; direct loading makes the entry point explicit.

Choose a task from the [workflow guide](workflow.md): establish a first foundation, investigate an inconsistency, or review new work. Give the agent the relevant files, intended behavior, and scope it may change. The guide includes prompts you can adapt.

## Add edit feedback

From the target project, run:

```sh
./node_modules/.bin/ds-loop guard on
./node_modules/.bin/ds-loop guard status
```

This installs a Claude Code PostToolUse hook in `.claude/settings.json`. It reports high-severity findings after supported edits and announces project extraction-coverage changes. It never blocks an edit. It does not deliver lower-severity judgment limits; run an unfiltered audit at setup and completion. `guard off` removes its entry while preserving other settings.

## Choose a CI policy

```sh
./node_modules/.bin/ds-loop audit . --min-severity high --require-coverage
```

This fails on findings at the chosen floor or reported coverage gaps. Its pass applies only to the adapters' stated scope and chosen severity. Review your repository's unsupported formats before enabling it. Run an unfiltered audit separately when you need all findings.

## Check the installation

You should receive a report containing a verdict, adapter coverage and findings or their absence. If the result is `not-checked`, consult [coverage](reference.md#coverage); reinstalling will not add an adapter for an unsupported format.

## Install from source

Use this path before the npm release, or to test a local change. In a directory outside the project you want to inspect:

```sh
git clone https://github.com/owaizin/ds-loop.git
cd ds-loop
npm ci
npm pack
```

This builds `ds-loop-0.1.2.tgz` without publishing it. From your target project, install the tarball using its actual absolute path:

```sh
npm install --save-dev /absolute/path/to/ds-loop-0.1.2.tgz
```

Continue with [Inspect your project](#inspect-your-project). The launcher uses the compiled JavaScript included in the package.

To try the public Radix Colors fixture from the source checkout:

```sh
npm run ds-loop -- audit fixtures/radix-colors
```

The fixture contains known findings, so exit 1 is expected. Fixtures and development scripts are not included in the npm package.

[Next: work through a change](workflow.md)
