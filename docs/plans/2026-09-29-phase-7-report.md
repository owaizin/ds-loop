# Phase 7 report — packaging and the first run

Implemented for **0.4.0**. All five required checks pass. The packed engine and
Claude Code plugin run from scratch installations; the Codex skill launcher works
through the documented project symlink. No publish, push, tag or Git-writing
command was run. The owner retains release authority.

## First run

- Bare `ds-loop` and `start` share the entrance. With no `.ds-scorecard/` and no
  `ds-loop-report.html` in cwd, they save the offline consulting report using the
  same audit measurement printed in the terminal. They do not append history.
- The compact view shows the verdict, readers and coverage gaps before up to
  three finding groups. It points to findings/source locations and coverage as
  the two things to inspect, then gives the skill path and consultation command.
  The ordinary `audit` view, detailed output and structured findings remain intact.
  Exceptional coverage and suppression lists can extend the compact view; they
  are retained rather than concealed to force a fixed screen height.
- Missing agent assessment and plan remain explicitly unwritten. Installation
  does not activate an agent. First-run findings retain exit 1; empty/unsupported
  sources remain not checked and point to `context`.
- Existing reports are preserved, with a stale-report notice. Explicit `report`
  refreshes them. Automatic creation uses exclusive file creation to avoid races
  and symlink overwrites. Write failure retains the audit, reports the error and
  next command, and exits 1. CLI execution errors also name a next command.
- Default report/dashboard filenames are treated as derived output during tree
  discovery. Creating a report no longer changes the next audit's coverage by
  adding “unread HTML.” Custom output filenames are not implicitly excluded.
- The plain first-run banner and compact output replace the large terminal
  wordmark on this entrance to keep attention on the result.

Regression coverage includes repeat runs, prior scorecard state, preserving an
owner-authored report, unsupported/empty sources, a failed exclusive write,
invalid configuration, and the unchanged source/detail routes. README output
tests now run the writing entrance in temporary directories.

## Plugin and skill

`.claude-plugin/plugin.json` declares `./skill`. The default `hooks/hooks.json`
registers the existing PostToolUse guard for Write/Edit/MultiEdit using a quoted
`${CLAUDE_PLUGIN_ROOT}` path. Roles and practices remain skill references, without
inventing another agent runtime. This follows the official
[manifest reference](https://code.claude.com/docs/en/plugins-reference).

Claude Code **2.1.277** validated the final packed package without warnings. With
`CLAUDE_CONFIG_DIR` isolated under `/tmp`, a local scratch marketplace installed
`ds-loop@ds-loop-final-test`, version 0.4.0, local scope. Its installed skill
launcher ran on the Example DS CSS fixture: bare invocation exited 1 for real
findings and wrote the report; `report` and `dashboard` exited 0. The registered
hook command ran from the installed plugin cache and returned exit 2 with
high-severity feedback, as intended for a post-edit hook.

No production agent settings were changed and no model-backed consultation was
run. The local marketplace is verification scaffolding, not a published catalog.
Users can load the npm-installed package with
`claude --plugin-dir ./node_modules/ds-loop`. The install guide explains avoiding
an additional project guard, which would duplicate feedback.

Codex uses the same frontmatter-bearing `skill/SKILL.md`. The guide documents
`.agents/skills/ds-loop` linked to `../../node_modules/ds-loop/skill`, matching
[Codex's local skill discovery](https://developers.openai.com/codex/skills/#where-codex-loads-local-skills).
The exact relative-link launcher was exercised from the packed install. This
checks layout and execution; a fresh Codex model session remains an owner
experience check. Codex does not inherit the Claude-specific hook.

Scratch plugin installation/runtime evidence:
`/tmp/ds-loop-phase7-final-plugin/verification.log`.

## Tarball contents

Verified with **actual `npm pack` output and `tar -tzf`**, plus an installed-package
smoke test. Artifact: `/tmp/ds-loop-phase7-artifact/ds-loop-0.4.0.tgz`.
The complete listing is `/tmp/ds-loop-phase7-artifact/contents.txt`;
pack metadata is `/tmp/ds-loop-phase7-pack.json`.

| Packed path | Files | Contents |
| --- | ---: | --- |
| `dist/` | 144 | Compiled engine JavaScript and declarations, including report/dashboard |
| `skill/` | 40 | Entry, launcher, hook, proposal tool, 20 playbooks, 8 roles, 6 practice guides, 2 templates |
| `docs/guide/` | 8 | Installation, command and workflow guidance |
| `.claude-plugin/` | 1 | `plugin.json` |
| `hooks/` | 1 | `hooks.json` |
| `benchmarks/` | 1 | `reference.json` |
| `bin/` | 1 | `ds-loop.mjs` |
| Root | 4 | `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE` |
| **Total** | **200** | No source TypeScript, development fixtures, website or private files |

Packed size: **271,531 bytes**; unpacked size: **871,478 bytes**.
SHA-1: `b557e6945cc4893472315c771febbdf5dd9fe935`.
Integrity:
`sha512-CQZ6sNv1c68zxvg0cpBg9MgKnANuG1Afei4Oy148y6dyLO+f6j3Ap17vz6kSOG9a+HVD/p963+z7LQS1A03G2A==`.

These identify this working-tree artifact. The owner's final release artifact
must be repacked and checked after any further edits.

## Copy and version

- Package, lockfile, skill and plugin metadata are 0.4.0. README install commands
  are pinned to that version, and install guidance includes both agent hosts.
- The changelog covers Phases 1–6, including 3b/5b corrections, remaining coverage
  boundaries, instrument changes, and this packaging phase.
- Landing copy is in `docs/site/landing-copy.md`. It starts with a runnable command,
  includes a verbatim Example DS output excerpt checked by the test suite, puts
  installation before architecture, and keeps limits in their own section.
  No existing `site/` page was edited.
- The pre-existing `benchmarks/reference.json` working-tree changes were preserved
  untouched. This task did not refresh the corpus or close prior precision gates.

## Verification

| Required command | Result |
| --- | --- |
| `npm run check` | Passed; 160 files, no fixes |
| `npm run type-check` | Passed |
| `npm test` | Passed; 289 tests, zero failures/skips |
| `npm run build` | Passed |
| `npm run smoke` | Passed; 30 checks |

Smoke packed and installed the artifact, ran bare invocation/report/dashboard
on the Example DS fixture, verified plugin assets and hook execution, checked
skill links and launcher behavior, and scanned **every installed packed file**
against the real private-name deny list. No private-name opt-out was used.

The first pack attempt could not write the sandbox-restricted global npm cache.
The successful runs used `npm_config_cache=/tmp/ds-loop-phase7-npm-cache` without
changing global settings. Smoke also contained stale assumptions from before
Phases 1/5/5b: Sass as unreadable, the old CSS adapter version, old coverage words,
and an `--html` detail route. Those assertions now reflect the supported engine;
`.less` supplies the genuinely unsupported-format case. New smoke probes clean up
their sources before the existing empty-install check.

Logs are `/tmp/ds-loop-phase7-{check,types,tests,build,smoke}.log`.

## Owner actions and limits

Follow `2026-09-29-release-checklist.md` for exact validation, staging, artifact,
publish, tag and push commands. Review the existing benchmark diff separately.
Carry forward the unresolved public-repository precision/corpus work and license
follow-up recorded in the earlier phase reports; packaging checks do not resolve
it. Run the fresh-agent consultation and browser review before claiming the
vision's half-hour success test. Coordinate landing-page integration with its
owner. Nothing was released by this task.
