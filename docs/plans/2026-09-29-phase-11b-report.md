# Phase 11b execution report

Completed the guide refresh and added the site to documentation verification.
Reproduce the focused checks from the repository root:

```sh
node --experimental-strip-types --test test/readme.test.ts
```

## Scope and deviations

Only `README.md`, `docs/guide/` and `test/readme.test.ts` were edited by this task.
`docs/site/landing-copy.md` needed no change; its existing sample passed.
No Git writes or commits were performed. Site and engine changes observed during
verification belonged to concurrent work and were not edited here.

The brief requests `docs/plans/2026-09-29-phase-11b-report.md`, but the user's
explicit edit allowlist excludes `docs/plans/`. This report lives in the permitted
`docs/guide/` directory instead.

The brief's command inventory premise was imprecise: 13 named commands appear in
`switch (cmd)`, while `install` and `doctor` are handled before it. Both are real
commands in the inspected source, bringing the total to 15. They are documented.

## Changes by file

| File | Change |
| --- | --- |
| `README.md` | Added installer usage and links, plus doctor, dashboard, impact and decision entries. Preserved structure and existing verified samples. |
| `docs/guide/README.md` | Added a first command and linked the new release note. |
| `docs/guide/reference.md` | Documented 15 CLI commands and their writes, all five adapters with current versions and source links, alpha tolerance and other config keys, the docs target and rule, and the three distinct verdicts. Corrected the automatic first-report write and dashboard table. |
| `docs/guide/install.md` | Documented agent detection, per-agent paths, append behavior, marked-block replacement, malformed-marker refusal, dry runs and opt-in guard settings changes. Added doctor diagnostics. |
| `docs/guide/output.md` | Added a freshly generated report sample, independently registered the regenerated dashboard sample, refreshed Radix output from a real run, and corrected unsupported-source prose from SCSS to Less. |
| `docs/guide/workflow.md` | Added all twelve colon-form agent commands, linked eight roles and six practice guides, and explained how they support authorized work. |
| `docs/guide/release-0.4.0.md` | Added current release guidance, upgrade checks and coverage limits. |
| `docs/guide/release-0.2.0.md` | Marked historical and linked its replacement. Kept the old note so existing release-handoff links still resolve. |
| `test/readme.test.ts` | Included `site/reference.html`; extracted HTML pre/code blocks and decoded entities; rejected orphan markers and conflicting duplicate IDs; registered guide report/dashboard samples and the four site cases. Added order-sensitive matching and regression checks for reordered/spliced claims. Site case registration is checked against the supplied input cases. |
| `docs/guide/phase-11b-report.md` | This report. |

## Generated samples and exact commands

The CLI was run directly against source, avoiding a potentially stale `dist/`.
Report and dashboard commands ran in an empty OS temporary directory, with the
absolute fixture path, so they created no output or cache in the working tree.
The temporary directory was removed afterward.

```sh
node --experimental-strip-types --no-warnings /Users/owais/Documents/GitHub/ds-loop/src/cli.ts report /Users/owais/Documents/GitHub/ds-loop/fixtures/css-audit-example --out scratch/phase-1/css-report.html
node --experimental-strip-types --no-warnings /Users/owais/Documents/GitHub/ds-loop/src/cli.ts dashboard /Users/owais/Documents/GitHub/ds-loop/fixtures/css-audit-example --out scratch/phase-2/dashboard-empty.html
```

Both exited 0. Their complete two-line stdout was pasted into
`guide-report-css-example` and `guide-dashboard-css-example`. The README's existing
`report-css-example` and `dashboard-css-example` retain the same actual output and
are checked independently against the same runs.

From the repository root:

```sh
node --experimental-strip-types --no-warnings src/cli.ts audit fixtures/radix-colors
```

This exited 1 on two findings. Complete stdout, with trailing blank lines removed,
replaced `audit-radix`. It records `css-custom-props@0.6.0` and config `1fc1f13c`.
No output headers were rebranded or findings spliced.

All other existing README, guide and landing samples were rerun by the focused
test. New site checks create each synthetic input set from `site/examples.json`
in a temporary directory, then run this exact argument sequence with that directory
as cwd:

```sh
node --experimental-strip-types --no-warnings /Users/owais/Documents/GitHub/ds-loop/src/cli.ts audit . --all
```

## What happened when the site entered the net

The actual page had **four output specimens**, not nine, and initially no verified
markers. Its old specimens included the obsolete claim that SCSS was unreadable.
The site owner regenerated its specimens and changed its reproduction instructions
to `audit . --all` during this task. The first integration run still failed:
three detailed specimens were checked against overview output, and the markers
were absent. The checker was aligned with the page's documented `--all` command;
no sample was edited by this task to satisfy a test.

The site owner subsequently added `site-finding`, `site-judgment`, `site-unread`
and `site-palette` HTML markers. All four now pass against real CLI runs using
their supplied inputs. Missing markers, unregistered IDs or changed case inventories
remain failures. The final focused suite passes **18/18** checks, including every
existing README/guide/landing sample. No claim is made that nine site samples exist.

## Benchmark review

Read `benchmark.md`; did not edit it, edit pinned measurements, or run the corpus.
Its coverage section is stale relative to the inspected manifest: the manifest
contains nine reference rows, including SCSS extraction, while the guide describes
one eligible source and says no adapter reads SCSS. This is reported rather than
silently rewriting the explicitly protected guide.

The pinned rows carry config hash `3c93c488`; the current defaults produce
`1fc1f13c`. The alpha gate fixes a real palette-analysis defect: ΔE alone could
connect translucent and opaque versions of the same colour. Old palette clusters
and near-duplicate findings may therefore need remeasurement before comparison.
The benchmark's seven published dimensions are style-tokenization ratios, not
palette cluster counts, so the alpha fix alone does **not** establish that those
ratios were numerically wrong. The instrument mismatch still prevents claiming
comparability. No affected corpus counts were invented or changed.

## Verification

| Check | Result |
| --- | --- |
| `npm run check` | Passed. |
| `npm run type-check` | Passed. |
| Focused documentation test | 18 passed, 0 failed, including four site specimens. |
| `npm test` | 341 passed, 6 failed in the full run; details below. |
| `npm run build` | Passed in an isolated temporary copy. |
| `npm run smoke` | 31 passed in that copy, including the packed-artifact private-name check. No privacy-check opt-out was used. |
| Scoped `git diff --check` | Passed; read-only operation. |

The verification commands were run individually so the known suite failure did
not prevent build and smoke verification. The temporary copy included the source,
fixtures, docs, site, package inputs and existing local dependencies, but no `.git`.
Build and smoke therefore did not write `dist/` in this working tree. A temporary
Git wrapper permitted read-only commands and rejected mutations throughout the
full suite, build and smoke run. No shared Git configuration was changed.

Five test failures attempted Git initialization and commits in temporary fixtures:
the `--since` case in `test/audit-context.test.ts`, plus four changed/unchanged-line
cases in `test/guard-hook.test.ts`. They were blocked to honor the user's no-Git-writes
and no-commit instructions. Their behavior was not verified by this run.

The sixth failure is `both command tables list exactly the commands the CLI
implements` in `test/naming.test.ts`. Its inventory regex reads only switch cases,
so it expects 13 commands and rejects the correctly documented `install` and
`doctor`. That test and `skill/SKILL.md` are outside the allowed edit surface.
The reference was not made inaccurate to satisfy it.

No browser inspection was performed: this task changed Markdown and tests, not
rendered website pages. Website edits and visual verification belong to the other
thread. The broader plan's browser check was not claimed as completed here.
