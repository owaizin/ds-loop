# Phase 10 — package context and doctor

## Changes

- `context --write-contract` appends package sections to the one repo-level
  `DESIGN-SYSTEM.md`. Package discovery and production shared-component usage
  come from `consumers`; each package extracts its own styling with its own
  adapters. Nested workspace packages are excluded from their parent's extraction.
- Each styling dimension uses `BENCHMARK_POLICY.minOccurrences` (currently 100)
  against its classified ordinary CSS denominator. Shared-component share uses
  that same floor against production shared + local JSX occurrences. Null or
  smaller samples say **not measured**, never a manufactured zero ratio.
  Adapter and consumers limitations remain visible.
- A workspace with no readable styling still gets sections explicitly naming
  its unchecked packages. An unreadable single-package repository retains the
  existing behavior: no empty contract is created. Existing contracts are left
  untouched; new writes use exclusive creation (`wx`) to prevent a race from
  clobbering a file.
- New contracts record adapters and extraction measurements alongside the
  existing date and config hash. Doctor also reads older generated contracts'
  four displayed extraction counts without rewriting them.
- `ds-loop doctor [path] [--json]` is routed before ordinary CLI config loading,
  loads config from the target, writes nothing, and returns exit 0 even when
  config or source cannot be read. Its output distinguishes unavailable evidence
  from unchanged measurements.
- Contract comparison calls scorecard's existing `comparability()`. Adapter or
  config differences produce **instrument-changed**, with no changes/deltas.
  Eligible ordinary CSS tokenization ratios and extraction counts can drift;
  sample-floor transitions carry null and no numeric delta.
- Config checks report unmatched primitive/component/upstream patterns and
  semantic namespace hints. They respect the tier engine's normalization for
  SCSS/JSON names. CSS declaration-name evidence includes values that adapters
  omit from classification. An unmatched pattern is an observation, not a verdict.
- Guard reporting reads PostToolUse settings and the recorded coverage signature.
  Its project-only signature is pinned against the shipped hook in a regression
  test. It never rewrites or advances the guard state.
- Intent reporting pairs one narrowly recognized, standalone convention with
  actual ordinary CSS color findings. Both document and code have file, line and
  text citations. Quoted, fenced, indented-code and commented examples are skipped.
  No pair is presented as a verdict about which side needs changing.
- Updated `skill/reference/doctor.md` with runnable commands and retained the
  agent procedure for interpretation and repairs the command cannot perform.

## Acceptance and tests

Ran `context --write-contract` directly against `fixtures/example-workspace`.
It produced one contract with `@example/dashboard`, `@example/portal`, and
`@example/ui`. Every package said **not checked — no adapter reads this package**;
every small/absent ratio said **not measured**. The generated file was inspected,
copied to `/tmp/phase10-workspace-contract.md`, and removed from the fixture.
The test suite repeats this on a temporary copy and verifies no overwrite.

Added tests cover:

- Package-local ratios at 99 versus 100 classified occurrences; packages without
  styling; the shipped example workspace; shared-component share at the same
  denominator boundary; repeat-write preservation.
- Contract drift, separate adapter/config changes, legacy contract reading,
  handwritten/unreadable contracts, no-adapter workspaces, and sample-floor
  transitions without numeric deltas.
- Unmatched config patterns, normalized and compound names, and CSS declaration
  names whose values the adapters omit.
- Missing/current/changed/malformed guard state, no guard-state writes, and
  signature parity with the shipped hook.
- Both cited halves of intent/code pairs, suppression of illustrative text,
  CLI JSON and exit 0 for findings, drift, instrument changes, missing paths,
  and invalid config.

## Scope and decisions

The sample floor fits both denominator types as a conservative coverage guard,
not a claim that 100 JSX occurrences establish adoption quality. No second
threshold was added. Keeping sections in one contract avoids multiplying files.

The fixture contradicted an implementation assumption: discovering workspace
imports does not imply any styling adapter reads that workspace. Generation now
handles that case explicitly instead of refusing to list its packages.

Intent checking deliberately under-delivers on general prose interpretation, as
requested. It recognizes only “All CSS color values must use tokens.” (also
“colour”) in five root-level intent files. It does not interpret arbitrary
conventions, ADR status, nested scopes, exceptions or aspirations. The report
states this boundary and retains the agent procedure for those cases.

Contract drift compares recorded root extraction counts and sample-qualified
ordinary CSS ratios. It does not compare arbitrary edits to prose, every token
value, or per-package sections/shared-component shares; these remain evidence
for agent review. The package tables have no independent dated consumers
instrument record, so presenting their changes as comparable deltas would
require an additional versioned record. No heuristic Markdown diff was added.

Doctor does not resolve external upstream packages or prove that an installed
hook executes. Matching the stored guard signature means only that the recorded
project unread-format/token-file state agrees with today's state.

No repository Git writes or commits were performed. No source file on the
brief's **Do not touch** list was edited by this task. Other tasks changed report
and documentation files during the run; their changes were left in place.

## Verification results

The final complete chain passed:

```sh
npm run check && npm run type-check && npm test && npm run build && npm run smoke
```

- Biome: 169 files checked; no fixes applied.
- TypeScript: passed.
- Tests: **341 passed, 0 failed**.
- Build: passed.
- Packed-install smoke: **31 checks passed**, including the private-name scan.

The command inherited `npm_config_cache=/tmp/ds-loop-phase10-npm-cache` because
an earlier plain smoke run could not complete `npm pack` using the default cache
under the filesystem restriction. No private-name scan was disabled. An earlier
lint pass also encountered another task's in-progress changes to the protected
`src/core/consult-html.ts`; that file was not edited here, and the final whole-repo
lint check passed once the concurrent work settled. The final chain log is at
`/tmp/phase10-verification.txt`.

## Real-repository precision review

After the final build, ran the compiled CLI against both local public checkouts:

```sh
node dist/cli.js doctor /tmp/precision/primer
node dist/cli.js doctor /tmp/precision/excalidraw
```

Both exited 0. Both reported no recorded contract, no installed guard or recorded
coverage state, unmatched default semantic namespace hints, and no established
intent/code pair. Checked the actual paths to confirm the missing contract and
guard state. These outputs do not claim either repository's documentation is
current or its naming is wrong.

**A misleading observation was found and fixed during this review.** The first
Primer run reported `opacity` unmatched even though
`packages/react/src/AvatarStack/AvatarStack.module.css:6` declares
`--opacity-step: 15%`. The value adapter omits that value, so the original report
was technically limited to extracted values but unhelpful as config evidence.
Doctor now uses the existing CSS declaration reader to include declaration names
regardless of value classification. The regression test failed before the fix
and passed after it. This also removed Primer's unmatched `transition` candidate.

The final Primer run still lists nine unmatched namespace hints, explicitly as
observations about the checked names. Its source contains component-specific
names such as `--banner-bgColor` and `--table-border-radius`; it need not match
this tool's default semantic namespaces. I found no incorrect assertion in the
final output. The repeated default-namespace observations are noisy, and the
absence of an intent pair is expected given the intentionally narrow recognizer.
Excalidraw's run similarly lists eight unmatched namespace hints; no doc/code
contradiction was fabricated from its broader guidance.

Final Primer stdout, verbatim:

```text

  ds-loop doctor — /tmp/precision/primer

  contract: not-recorded
    DESIGN-SYSTEM.md not found; intent may live elsewhere.

  config: defaults — checked
    semanticNamespaces: color
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: type
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: text
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: space
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: elevation
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: shadow
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: motion
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: radius
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.
    semanticNamespaces: z
      No extracted token name opens with this namespace (with or without a brand prefix); this does not prove the configuration is wrong.

  guard: not installed; recorded coverage not-recorded
    Project unread formats and unread token files only; current means the recorded signature matches, not that all rules could judge or the hook executes successfully.

  intent/code pairs: none established (not a pass)
    Only the exact standalone convention “All CSS color values must use tokens.” (also colour) in root AGENTS.md, CLAUDE.md, DESIGN-SYSTEM.md, STYLEGUIDE.md or CONTRIBUTING.md is paired with ordinary CSS color literal findings. Other prose, nested intent, exceptions and scope require an agent. Pairs are evidence for discussion, not a verdict about which side is correct.

  next: ds-loop audit . --json   inspect findings and coverage unfiltered

```

Full Excalidraw stdout: `/tmp/phase10-excalidraw-final.txt`.
