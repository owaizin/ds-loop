# Phase 15 brief for Codex: make "importer not determined" the exception

Read `CLAUDE.md` first, then item 7 of `docs/plans/2026-09-30-open-work.md`. **No git writes**:
no commit, no branch, no staging, nothing under `.git`. The reviewer commits.

## Why

The HTML reports now show reachability on every finding card. On public code, most cards say
"importer not determined", so the signal says almost nothing. The pilot asked for it because
"counts included legacy code".

## The causes, measured by the reviewer (`audit --json` on `/tmp/precision/*`)

| Repo | Cards | Cards with no locations | Of those, `docs/undocumented-shared-component` |
|---|---:|---:|---:|
| PostHog | 242 | 224 | 217 |
| Primer | 55 | 42 | 40 |
| Excalidraw | 20 | 5 | 0 |

A card with no locations can only be `unresolved`, whatever the import graph says. That is the
dominant cause. It is not the resolver.

The secondary cause is clouding in `src/core/file-imports.ts`. PostHog has 1,618 locations
marked "A static import this resolver could not follow may name this file". The top clouding
tails are `icons` (2,023 specifiers), `react` (1,459), `quill`, `jest-dom` and `user-event`.
These are npm packages: `@posthog/icons`, `@testing-library/react`, `@testing-library/jest-dom`.
The code already treats single-segment bare names (`react`) as package names that cloud nothing.
It does not do the same for scoped names, so `@testing-library/react` clouds every file named
`react.*`.

## The three changes (decided)

**A. A finding that names exactly one place gets that place as its location.**
`docs/undocumented-shared-component` sets `where: "packages/react/src/X.tsx:21"` and no
`evidence`. In `annotateFindings` (`src/core/finding-dimensions.ts`): when a finding has no
evidence and its `where` is exactly one `file:line` that exists in the import graph, use it as
the single location. `where` strings that list several places, or text, stay unresolved.
**Do not parse a truncated list into locations.** Phase 12 refused to guess membership from a
truncated display string, and that refusal stands. Recorded exceptions and decisions must still
apply to the synthesised location. If `applyIgnores` needs a `RawValue`, build the smallest
honest one and say in a comment that it is synthesised.

**B. `token/var-missing-fallback` attaches its evidence.** It is the largest count on all three
repos (Primer 2,211, PostHog 3,255) and iterates the `RawValue`s already (`src/rules/tier.ts`
~237). Attach them as `evidence`, the way other rules do. `summary`, `where`, `fix` and `data`
(including `hits.slice(0, 40)`) stay byte-identical: those strings are stable output. First grep
every reader of `finding.evidence` (fix planning, suggestions, HTML examples, consult) and state
in your report what changes for each. `fix` must still act on exactly what it acted on before.

**C. Package names cloud nothing.** In the clouding loop:
- `@scope/name` with no further path is a package name. Treat it like bare `react`.
- `@scope/name/sub` and `name/sub` resolve from `node_modules` **when `@scope/name` / `name` is
  declared** in the `dependencies`, `devDependencies` or `peerDependencies` of any `package.json`
  in the tree, **and it is not a workspace package** (workspace packages keep their existing
  handling). Those cloud nothing.
- Everything else still clouds as today. An undeclared deep specifier may be a build alias.
  `~/`, `@/`, `lib/...` and similar stay uncertain. This is the direction that must stay
  conservative: **a file wrongly labelled "No static importer found" is the expensive error.**
  A wrongly undetermined one is merely unhelpful.

Bump `FILE_IMPORTS_VERSION`. The instrument changed, and scorecard attribution depends on the
version saying so.

## Do not touch

- `src/core/report-html*.ts`, `consult-html.ts`, `dashboard-html.ts`, `reach-html.ts`: the
  renderers already read `dimensions`. Nothing there should need to change. If something does,
  stop and report it.
- `README.md`, `docs/guide/`, `site/`: another Codex task is editing them now.
- `benchmarks/`, `scripts/benchmark.mjs`.
- Rule ids, `summary` / `where` / `fix` strings, the `--json` shape (adding `evidence` to one
  finding is the only additive change). No threshold outside `src/config/`.
- The wording: "No static importer found", never dead, unused, unreachable or safe to delete.

## Tests

- A: a single-`file:line` finding gets one location with the right reach state. A multi-place
  `where` stays unresolved. A config ignore or `## Covers` decision matching that file still
  records `declaredIntentional`.
- B: evidence is present and its length equals `data.count`, and the `summary`/`where`/`data`
  strings match the pre-change output exactly. Snapshot one real run if that is easiest.
- C: `@testing-library/react` clouds nothing. `lodash/fp` with `lodash` declared clouds nothing.
  `lodash/fp` with `lodash` undeclared still clouds `fp.*`. A workspace package's subpath keeps
  its existing handling.

## Precision gate: counts, hand-checked

On `/tmp/precision/{primer,posthog,excalidraw}` (public, nobody here wrote them), give
**before and after** tables for:
- finding cards by state (reached / no-static-importer / unresolved / mixed);
- locations by state;
- files by state (`fileImports.files`).

Then hand-check, per repo, **10 locations that moved into "No static importer found"** (or all of
them if fewer). For each, grep the tree for an importer: `import`, `require`, dynamic `import(`,
`@import` / `@use` / `@forward`, and the bare filename in any config or manifest. Report
*N of 10 have no static importer I could find*, and list each one that does, with the importer.
A dynamic importer does not make the label wrong. Note it anyway, as last time.

Separately, hand-check **5 docs-rule cards that now say "No static importer found"**. An exported
shared component with no in-tree importer is plausible: consumers can live outside the tree.
Say whether each one is exported through a package entry. If package exports are what make
these look orphaned, **report that as a finding**. Do not suppress it silently.

If any hand-check finds a location wrongly labelled "No static importer found" (a static
importer exists in the tree), that is a failure of this phase. Fix it or report it. Do not
round it away.

## Done means

`npm run check && npm run type-check && npm test` pass. Report the test count before and after.
Write `docs/plans/2026-09-30-phase-15-report.md` with the tables, the hand-check counts, the
`evidence` reader list for B, and anything you did not do or could not verify. Delete all scratch
output before finishing.
