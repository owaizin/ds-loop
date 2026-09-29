# Phase 8 report — context interoperability and agent wiring

Implemented B first, then A from the phase-8 brief. No commits, staging, branches or Git writes. No file in the brief's “Do not touch” list was edited.

## Changes

- `src/commands/context.ts` now names `PRODUCT.md`, `docs/PRODUCT.md`, `DESIGN.md`, `docs/DESIGN.md`, `.agents/context/` and `.impeccable/design.json` under the existing intent framing. The absence copy is unchanged.
- Generated metadata is explicitly labeled evidence, not instruction or measured source. Its parsed JSON claims are quoted on one line and labeled unverified. Invalid JSON reports unavailable claims without failing orientation. No adapter, configuration or measurement logic was changed.
- `src/commands/install.ts` detects `.claude/`, `.cursor/`, `AGENTS.md` and `.codex/`, reports detection and selection, and writes the appropriate instruction reference. An explicit `--agent` selects destinations even when no agent was detected; automatic mode with no detection writes nothing and exits 0, including with `--guard`.
- Existing text is retained; one old marked block is replaced in place. Malformed or duplicate markers cause an error before any reference is written. Every planned block is printed before writing. Unchanged content is not rewritten.
- `src/cli.ts` routes and documents `install`, validates its arguments, and does not require audit configuration to install references.
- `src/commands/guard.ts` gained a dry-run option. `install --guard` calls that existing implementation; dry-run prints the exact proposed settings JSON without writing it. Existing hooks and settings remain intact. Without the flag, install prints the guard availability line.
- `test/context.test.ts`, `test/install.test.ts` and `scripts/smoke.mjs` cover source and published-package behavior. Package scripts and dependencies are unchanged; no postinstall hook was added.

## Exact reference block

The block below is the exact output for this checkout. The skill path is resolved from the running package, so a published installation substitutes its actual package location (verified against the packed package). It does not assume a local `node_modules` installation when invoked from a global installation or npx cache. A moved/deleted installation requires rerunning install to refresh the path.

```markdown
<!-- ds-loop:start -->
Design System Loop (ds-loop) measures design-system code with deterministic checks and stated coverage limits.
Its companion agent skill guides diagnosis, decisions, implementation and verification.
Run first: `npx ds-loop` — audits this directory and names the next command.
Read the companion skill: /Users/owais/Documents/GitHub/ds-loop/skill/SKILL.md
<!-- ds-loop:end -->
```

The same block goes into `CLAUDE.md`, `.cursor/rules/ds-loop.mdc`, or `AGENTS.md`. Appending adds a separating newline when needed and a final newline; replacing preserves all surrounding content, including its original line endings.

## Added tests

### test/context.test.ts

- context names product, design and per-agent context as intent sources
- context reports generated metadata claims as unverified evidence
- context reports invalid generated metadata without failing orientation
- intent files and generated metadata never change audit measurements

### test/install.test.ts

- install dry-run lists the exact block and writes nothing
- install applies the block and a second run leaves every byte identical
- install --agent cursor writes only its rule even when Claude is detected
- install appends while preserving every original byte of CLAUDE.md
- install replaces an older block in place and preserves surrounding content
- install with no detected agent reports it and writes nothing even with --guard
- install detects all agent signals and writes one Codex reference
- install --agent all explicitly creates all references without detection
- install --guard previews exact settings, preserves other hooks and is idempotent
- install rejects malformed markers before writing any reference
- install rejects invalid arguments without writes and appears in help

### Packed smoke check

- installed wiring previews, appends and stays byte-identical on a second run

## Verification

- `npm run check`: passed (163 files).
- `npm run type-check`: passed.
- Test suite: 298 tests passed, zero failures. Six existing Git-writing tests were excluded to obey the user's explicit no-Git-writes/no-commits restriction. Node omits these excluded tests from its reported total.
- `npm run build`: passed.
- `npm run smoke`: 31 checks passed, including the published installer and private-material scan with the existing list. Initial packing failed with the default npm cache under the sandbox; rerunning offline with a writable temporary cache passed.
- Manual scratch-project review: ran the compiled CLI's `install --dry-run`, `install`, and bare invocation. Detection, exact preview and guard offer were readable; bare invocation wrote the report and named next commands. Its exit 1 correctly represented the fixture's missing-fallback finding. The scratch directory was removed.

The test command used the same runner and file glob as `npm test`, with exclusions placed before the positional glob (this Node version ignores test options after it):

```sh
node --experimental-strip-types --test --test-skip-pattern='^--since selects against|^a finding on a line this edit|^an untracked file inside a repository|^a finding counting changed and unchanged|^legacy style file:' 'test/**/*.test.ts'
```

Excluded existing tests, all of which initialize repositories and/or commit fixture baselines:

- --since selects against the target repository and does not conceal invalid refs
- a finding on a line this edit did not touch is placed on unchanged lines
- a finding on a line this edit introduced is placed on changed lines, not called caused
- an untracked file inside a repository is attributed unknown, not unchanged
- a finding counting changed and unchanged lines is partly changed
- legacy style file: one edited line is reported; unchanged findings have one summary line

Successful smoke command:

```sh
npm_config_cache=/tmp/ds-loop-phase-8-npm-cache npm_config_offline=true npm_config_audit=false npm_config_fund=false npm run smoke
```

## Scope and deviations

All requested A/B behaviors are implemented. The literal unrestricted `npm test` gate was not run because six existing tests violate the no-Git-writes/no-commits instruction even in temporary directories. This is a verification gap, not a passing full-suite claim.

The broader plan's C (slash commands), D (per-package context), and E (doctor) are outside this brief and were not implemented. The installer therefore does not advertise future slash commands. The plan's “default to showing the diff before writing” is implemented as a destination/action plus exact marked-block preview before applying; existing surrounding file content is never rewritten by the preview. No interactive confirmation is required by the brief's explicit `install` acceptance case.
