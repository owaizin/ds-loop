# Phase 11a website report

Only files under `site/` were edited. No commits, staging, branch operations or Git metadata writes were performed. Read-only diff/status commands used `--no-optional-locks`. No CSS, visual assets or browser behavior files changed.

This report is under `site/` rather than the brief’s requested `docs/plans/` path because the user explicitly restricted edits to `site/`.

## Changes by page

- `reference.html`: replaced the two-adapter table with all five adapters and their limits; removed the false SCSS/JSON exclusion. Added all fifteen CLI commands, grouped by reader task, preserving Result/Writes columns. Added the twelve namespaced agent commands and the distinction between agent work and CLI instruments. Updated release copy from `package.json`. Regenerated every displayed output sample and added registered verification markers.
- `setup.html`: leads with `npx ds-loop`, then local package installation and `ds-loop install`. Documents Claude Code, Cursor and Codex instruction paths, detection, explicit agent selection, preview, idempotency and optional guard installation. Removes the source-versus-npm setup distinction and refreshes source archive instructions.
- `index.html`: adds a runnable first command, the consulting report and dashboard, the agent-supplied assessment/plan, current format coverage and current release copy. Uses existing paragraphs and page structure.
- `docs.html`: removes outdated publication notes, names version 0.4.0 and links to installation and agent commands.
- `examples.json`: all four saved excerpts regenerated from the current engine. The unsupported case now uses LESS and Vue, because SCSS is supported.
- `check-examples.mjs`: site-local reproduction/check script derived from the existing `scripts/site-examples.mjs`, with `--all` and the corrected unsupported input. Checks fresh output against both JSON and HTML.
- `README.md`: updates the setup sequence, release alignment and reproduction instructions.

## Sources for adapter rows

The adapter set comes from `src/adapters/registry.ts`. Each row’s extensions and reads/limits come from the corresponding adapter’s `EXTS`, `extensions` and `reads` fields:

| Row | Source |
| --- | --- |
| CSS custom properties | `src/adapters/css-custom-props.ts` |
| Tailwind JSX | `src/adapters/tailwind-jsx.ts` |
| CSS rule bodies | `src/adapters/css-rule-bodies.ts` |
| Token JSON | `src/adapters/token-json.ts` |
| SCSS / Sass | `src/adapters/scss.ts` |

SCSS reads variables, custom properties, selected nested rule properties and `map.get` references; it does not evaluate Sass or resolve modules. Token JSON reads DTCG and Style Dictionary declarations, inherited types and aliases; it does not merge themes or evaluate composites. Both limits stay visible beside coverage.

## Sources for command rows

Command names, positional arguments and flags were checked against `src/cli.ts`. Result and write behavior were checked against the corresponding implementation:

| Row | Implementation |
| --- | --- |
| start (and bare invocation) | `src/commands/overview.ts`, plus `src/commands/report.ts` |
| context | `src/commands/context.ts` |
| audit | `src/commands/audit.ts`, plus the CLI’s `--html` branch |
| scan | `src/commands/scan.ts` |
| sweep | `src/commands/sweep.ts` |
| consumers | `src/commands/consumers.ts` |
| impact | `src/commands/impact.ts` |
| doctor | `src/commands/doctor.ts` and the CLI’s early doctor branch |
| report | `src/commands/report.ts` |
| dashboard | `src/commands/dashboard.ts` |
| scorecard | `src/commands/scorecard.ts` |
| fix | `src/commands/fix.ts` |
| decide | `src/commands/decide.ts` |
| install | `src/commands/install.ts` and the CLI’s early install branch |
| guard | `src/commands/guard.ts` |

The twelve agent rows use the `name` and `description` frontmatter in their respective `skill/commands/{start,diagnose,inventory,foundations,propose,establish,transform,component,document,govern,drift,prove}.md` files. Every invocation uses `/ds-loop:name`.

## Output reproduction

Ran `node site/check-examples.mjs` to generate JSON, copied the HTML-escaped inputs and output into the corresponding specimens, then ran `node site/check-examples.mjs --check`. The script creates each synthetic case in a temporary directory and runs:

```sh
node --experimental-strip-types --no-warnings /absolute/path/to/ds-loop/src/cli.ts audit . --all
```

All four excerpts are contiguous matches from actual stdout, not composed samples:

| Case | Inputs | Marker |
| --- | --- | --- |
| Hardcoded value | `tokens.css`, `Card.tsx` | `site-finding` |
| Undetectable tier naming | `tokens.css` | `site-judgment` |
| Unsupported source | `theme.less`, `W.vue` | `site-unread` |
| Framework palette with token context | `theme.css`, `Card.tsx`, `ds-loop.config.json` | `site-palette` |

No report/dashboard output was invented or added. Their homepage mentions are command descriptions, not output samples. No CLI output headers were rebranded.

## Verification

- `npm run check`: passed after formatting the new site-local script, but the final rerun found a new formatting error at `test/readme.test.ts:266` from parallel edits. That file is outside this task’s boundary and was not changed here.
- `npm run type-check`: passed, including the final rerun.
- `./node_modules/.bin/biome check site/`: passed (26 files).
- `node site/check-examples.mjs --check`: all four examples match engine 0.4.0 and the HTML.
- `node scripts/check-site.mjs`: 262 local asset, page and documentation links resolve; anchor IDs and copy targets pass.
- `node --experimental-strip-types --test test/readme.test.ts`: 18 passed, including all site specimens and marker checks.
- Content checks: five adapter rows, fifteen CLI rows matching the actual dispatch including early handlers, twelve agent rows, current versions on all four pages and balanced reference sections.
- Read-only `git --no-optional-locks diff --check -- site/`: passed.
- Broader test result: 341 passed, 1 failed across 342 executed tests. The remaining failure is `test/naming.test.ts` ("both command tables list exactly the commands the CLI implements"): its switch-only extraction omits the early `doctor` and `install` handlers, while `docs/guide/reference.md` correctly lists both. Fixing that test is outside `site/`. Six Git-writing tests were excluded before execution.

The exact broader test command was:

```sh
node --experimental-strip-types --test --test-skip-pattern='^--since selects against|^a finding on a line this edit|^an untracked file inside a repository|^a finding counting changed and unchanged|^legacy style file: one edited line' 'test/**/*.test.ts'
```

Six tests were excluded because they initialize Git repositories, change Git configuration and create commits. Those actions conflict with the explicit no-Git-writes/no-commits instruction. No test source was edited.

## Plan discrepancies and unfinished verification

- The brief says the CLI switch is the complete command list. In this checkout, `install` and `doctor` are handled before the switch. Both exist and are documented; a test that extracts only switch cases misses them.
- The plan says there are nine output samples. There are four displayed output specimens on this page; all four were regenerated.
- The original site example generator assumes default output contains full rule details and that SCSS is unsupported. Both assumptions are stale. Its replacement lives under `site/` to respect the edit boundary. Wiring the npm site scripts to the corrected implementation requires an owner authorized to edit `scripts/` or `package.json`.
- The parallel documentation work added site coverage to `test/readme.test.ts` during this pass. The site now supplies its registered markers, and the targeted suite passes. No test files were edited by this task.
- The requested 375px and desktop visual checks could not run. The in-app browser was unavailable; the Chrome browser tool then rejected localhost access, explicitly reporting denied permission and forbidding alternate browser routes. No workaround was attempted. Responsive layout, table wrapping and browser console behavior remain unverified. Existing table-scroll containers and styles were preserved.
- No registry artifact or deployment was verified. This pass uses the local package version and source as the brief requires.
