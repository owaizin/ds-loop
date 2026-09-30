# Phase 16 report — 2026-09-30

Updated the five requested reader-facing pages. No engine, benchmark, sample,
site CSS or site JavaScript changes. No git writes in this worktree.

## Pages changed

| Page | Change and reason |
| --- | --- |
| `README.md` | Added a three-sentence reachability section with its purpose, limits and a guide link. |
| `docs/guide/reference.md` | Documented the five JSON fields from `AuditReport` and their construction; added importer states, resolution boundaries, mixed groups, evidence versus filtered findings, the no-agent install path and a benchmark-guide link. |
| `docs/guide/install.md` | Replaced the vague instruction to select an agent with the three commands actually printed and their destination files. |
| `site/reference.html` | Added the equivalent reference facts using existing headings, paragraphs and table markup. |
| `site/docs.html` | Added importer evidence and its limits to the measurement workflow, a short benchmark explanation, and the no-agent installation choices. |

`docs/guide/benchmark.md` and `docs/guide/output.md` were left unchanged.

## Samples and source checks

No output samples were added or edited, so no new verified IDs or test
registrations were needed. All existing verified samples remain unchanged.

Ran the installer from an empty directory made with
`mktemp -d /tmp/ds-loop-phase16-install.XXXXXX`:

```sh
node --experimental-strip-types /Users/owais/Documents/GitHub/ds-loop-docs/src/cli.ts install
```

It reported no agents, said nothing was written, and printed the Claude Code,
Cursor and Codex commands with `CLAUDE.md`, `.cursor/rules/ds-loop.mdc` and
`AGENTS.md` respectively. `ls -A` confirmed the directory stayed empty; it was
removed afterward. The docs describe this run in prose rather than adding an
output sample.

Checked field semantics against `src/commands/audit.ts`, importer behavior against
`src/core/file-imports.ts`, finding dimensions and group totals against
`src/core/finding-dimensions.ts`, and HTML labels and missing-measurement behavior
against `src/core/reach-html.ts` and the three report renderers.

Checked benchmark comparison rules against `src/core/benchmark.ts` and the existing
benchmark guide. Also ran `readReferences()` and `measuredDimension()` locally:
both pinned sets have enough eligible contributors to support colour, spacing and
typography ranges. No public-repository measurements were copied into prose.

## Verification

| Check | Result |
| --- | --- |
| Before edits: `npm test` | 365 tests; 364 passed, 1 failed on the cache permission error below |
| First post-edit `npm run check && npm run type-check && npm test` | Lint/format and types passed; 365 tests, 364 passed, same cache failure |
| Final `npm run check && npm run type-check && npm test`, with a worktree-local cache | All passed; 365 tests, 365 passed, 0 failed/skipped/cancelled |
| `test/readme.test.ts` and `test/naming.test.ts` | Passed within the final full suite, including all 18 registered verified samples |
| `node scripts/check-site.mjs` | Passed: 266 local links resolve and HTML anchor IDs are unique |
| `git diff --check` | Passed |

Test count is unchanged: **365 before, 365 after**. No tests were edited.

The original worktree `node_modules` is a symlink into the adjacent checkout.
The dashboard test's direct call tries to write
`node_modules/.cache/ds-loop/dashboards.json` there, outside this task's writable
workspace. Both the baseline and first post-edit run failed that test with `EPERM`.
For final validation, temporarily replaced only the worktree's dependency symlink
with a local directory whose dependency entries linked to the same installed
packages, giving the test a local writable cache. The original symlink was restored
in a `finally` block. No external dependency or cache files were changed.

## Claims and limitations to review

One existing code/limit mismatch needs engine-owner review:
`fileImports.limits` says CSS `@import` is outside the signal, but the resolver
handles bounded relative stylesheet `@import`, `@use` and `@forward` references
and Sass partial names. The guide and site reference state both facts explicitly;
they do not promise full CSS import resolution. Engine code was left untouched.

The brief's “importer not determined” wording is the HTML label; JSON and detailed
terminal output use `unresolved`. The documentation records that distinction and
also covers `mixed` finding groups.

No added claim was left without code or run evidence. The benchmark corpus was
inspected locally, not fetched or re-measured. No new public-repository reachability
counts were collected. Browser rendering was not visually reviewed; the existing
site markup and classes were retained and local links and anchors were checked.

Task-created scratch logs and the empty install directory were removed before handoff.
