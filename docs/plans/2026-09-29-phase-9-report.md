# Phase 9 report — the twelve agent commands

Implemented section C of `2026-09-29-adoption-surface-plan.md` under the phase 9 brief.
The CLI names, rule IDs and engine behavior are unchanged. Each router reads code,
runs `context` and an unfiltered `audit . --json` before replying, links to the
owning playbooks and roles, and states a finish line and decision boundary.

## Command files

All referenced files exist on disk. Each router has `name` and `description`
frontmatter and stays below 40 lines. Paths below are relative to the package root;
links inside the routers are relative to the command file so they survive installation.

| File | Backing playbooks / practices | Roles | Lines |
|---|---|---|---|
| `skill/commands/start.md` | `skill/SKILL.md`, `skill/reference/consult.md` | `skill/roles/auditor.md`, `skill/roles/consultant.md` | 23 |
| `skill/commands/diagnose.md` | `skill/reference/discover.md` | `skill/roles/consultant.md` | 21 |
| `skill/commands/inventory.md` | `skill/reference/census.md` | `skill/roles/auditor.md` | 21 |
| `skill/commands/foundations.md` | `skill/reference/foundations.md`, `skill/reference/tokenize.md` | `skill/roles/foundations.md` | 23 |
| `skill/commands/propose.md` | `skill/reference/consult.md`, `skill/reference/engagement.md` | `skill/roles/consultant.md`, `skill/roles/architect.md` | 23 |
| `skill/commands/establish.md` | `skill/reference/establish.md`, `skill/practices/starting.md` | `skill/roles/architect.md`, `skill/roles/components.md` | 23 |
| `skill/commands/transform.md` | `skill/reference/transform.md`, `skill/practices/migrating.md` | `skill/roles/migrator.md` | 23 |
| `skill/commands/component.md` | `skill/reference/shape.md`, `skill/reference/review.md` | `skill/roles/components.md` | 23 |
| `skill/commands/document.md` | `skill/reference/scaffold.md`, `skill/practices/documenting.md`, `skill/practices/storybook.md` | `skill/roles/docs.md` | 23 |
| `skill/commands/govern.md` | `skill/practices/governing.md` | `skill/roles/governor.md` | 23 |
| `skill/commands/guard.md` | `skill/reference/guard.md`, `skill/reference/drift.md` | `skill/roles/governor.md` | 24 |
| `skill/commands/prove.md` | `skill/reference/scorecard.md`, `skill/practices/maintaining.md`, `skill/reference/consult.md` | `skill/roles/auditor.md` | 25 |

`inventory` uses the `consumers` CLI; `govern` routes decision recording to `decide`;
`prove` uses `report` and `scorecard`. These are existing instruments, not missing
playbooks. No replacement playbooks or roles were invented.

## Wiring and checks

- `.claude-plugin/plugin.json` now declares `"commands": "./skill/commands"`
  alongside the existing `"skills": "./skill"`.
- `src/commands/install.ts` changes only the exported `INSTALL_BLOCK` text. It names
  all twelve `/ds-loop …` commands and their installed instruction directory.
- `README.md` adds one short table mapping the twelve agent commands to their
  outcomes and backing CLI commands.
- `test/commands.test.ts` checks the exact twelve filenames, frontmatter, the
  evidence-first unfiltered audit, every local Markdown reference, role and
  playbook routing, finish lines, line limits, plugin wiring, installer names,
  and README rows.
- `scripts/smoke.mjs` lists the real packed tarball, checks all twelve command
  entries, and checks that the installed manifest points to the installed files.
  The existing packed-link check also traverses the new command files.

Verification completed:

| Check | Result |
|---|---|
| `npm run check` | Passed |
| `npm run type-check` | Passed |
| `npm test` | 319 passed, 0 failed |
| `npm run build` | Passed |
| `npm_config_cache=/tmp/ds-loop-phase9-npm-cache npm run smoke` | 31 passed |

The requested check chain passed through build, then its first smoke invocation
failed at `npm pack` (exit 255, no diagnostic from silent pack). Repeating smoke
with the npm cache in writable `/tmp` passed. No approval, Git mutation or global
configuration change was used to resolve it. The private-name scan passed without
an opt-out.

## Actual tarball listing

Captured from the smoke run's `tar -tzf` output, filtered to the command directory:

```text
package/skill/commands/component.md
package/skill/commands/diagnose.md
package/skill/commands/document.md
package/skill/commands/establish.md
package/skill/commands/foundations.md
package/skill/commands/govern.md
package/skill/commands/guard.md
package/skill/commands/inventory.md
package/skill/commands/propose.md
package/skill/commands/prove.md
package/skill/commands/start.md
package/skill/commands/transform.md
```

The smoke run installed that tarball and checked its command paths and local
Markdown links. It ended with `31 checks passed — the published package runs.`

## Scope and remaining review

`package.json` was not edited: its existing `skill` entry already includes the
command directory. The listing above proves this, as the phase 9 brief requires.
Sections A and B were prerequisites already present; sections D and E are outside
this phase. No requested section C implementation was omitted.

The only source file changed is `src/commands/install.ts`, and only its block text,
as explicitly requested. All eight files under **Do not touch** retain their
original hashes. The repository's `.git` file contents and file list also match the
pre-work snapshot. No repository commit was made.

End-to-end Claude Code verification remains the reviewer's task, as the brief
specifies. Packing and structural tests cannot prove host discovery or agent behavior.
In a scratch repository with the plugin installed, try these first:

1. `/ds-loop start`: it should read source and intent, run `context` and unfiltered
   `audit` (plus `consumers` for a workspace), then give a readable first assessment,
   explicit coverage limits and a path to an actual report. It must distinguish
   `not-checked` from a clean result and leave shared-policy choices with the team.
2. `/ds-loop diagnose`: it should inspect affected components and consumers before
   asking questions, then explain a likely cause using source locations, consider
   another explanation, and recommend a bounded first action with a finish line.
   A repeated finding count or an opening questionnaire would not satisfy it.

Both commands must be discoverable and route to their bundled instructions in the
host. The reviewer should verify the requested invocation syntax as part of that check.
