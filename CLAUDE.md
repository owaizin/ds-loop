# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Design System Loop ships a **deterministic engine** and a **companion agent skill**.
The engine reads supported token/CSS/JSX code and reports rule findings with exact
`file:line` and coverage limits. **No LLM, no API key, no network, no runtime dependencies**
in the engine. Do not introduce a model call or a package dependency in `src/`.

The agent following `skill/SKILL.md` diagnoses the team's problem, recommends a
plan, delivers authorized work, verifies it and retains decisions. The CLI does
not conduct that conversation. Installing the package does not activate an agent.
The team retains priorities and shared-policy authority; the skill respects existing
delegation. Diagnose from product behavior, team context and repository evidence,
not finding counts alone. Keep the engine and skill responsibilities distinct.

This repo ships the **open engine and skill** (MIT). The tuned thresholds and the corpus of
before/after engagement runs live in a separate private repo (`ds-loop-calibration`) and are passed in at
run time. See `docs/guide/reference.md` for configuration and coverage boundaries.

Positioning that has been settled and should not be relitigated: ds-loop **complements** Murphy Trueman's
LLM-based `design-system-ops` skill pack (it reads his `.ds-ops-config.yml` verbatim for interop) and
operates on *the system behind the screens*. A representative screen or product flow
is used to diagnose and verify a shared-system change; this is not a general screen-design skill.

## Commands

```bash
npm install
npm run check          # biome lint + format (CI gate)
npm run check:fix      # biome --write
npm run type-check     # tsc --noEmit
npm test               # node:test over test/**/*.test.ts
```

Run one test file, or one test by name:

```bash
node --experimental-strip-types --test test/rules.test.ts
node --experimental-strip-types --test --test-name-pattern "raw-value-in-markup" test/tailwind-jsx.test.ts
```

Distribution: `bin/ds-loop.mjs` is the one entry point. It imports `dist/cli.js` when present
(a published install) and otherwise runs `src/cli.ts` directly, re-execing with
`--experimental-strip-types` on Node 22.6–22.17. **Node cannot strip types under
`node_modules`**, so the published package must ship JS — `npm run build` emits `dist/`, and
`prepack` runs it. `src/` is deliberately not in `files`. Zero *runtime* dependencies is the
commitment; "no build step" applies to development only.

Run the CLI during development (no build step — Node ≥ 22.6 strips types directly):

```bash
node --experimental-strip-types src/cli.ts audit fixtures/radix-colors   # frozen fixture
node --experimental-strip-types src/cli.ts audit ../some-app/src         # live scan
npm run ds-loop -- audit <path> --json                                   # same, via npm
```

CI (`.github/workflows/ci.yml`) runs `check` + `type-check` + `test`, then sweeps every
`fixtures/*/SOURCE.json` — so a change that alters ΔE clustering shows up as a changed sweep curve there.

## Architecture

One pipeline, format-agnostic after the first stage:

```
target path → resolveSource → adapter(s).extract → RawValue[] + provenance → rules → Finding[] → report
              (core/source)   (adapters/*)          (core/provenance)         (rules/*)  (commands/*)
```

**`core/source.ts` — fixture vs live scan.** A directory containing `SOURCE.json` is a *frozen fixture*
(comparable across runs, `fixtureSha` pins the upstream snapshot). Anything else — a directory or a single
file — is a *live scan*, and `fixtureSha` becomes `git:<HEAD>`. Calibration rows are only comparable when
this distinction is preserved, so don't collapse it.

**`adapters/` — one per storage format.** Interface is `detect(source, config?)` + `extract(source, config)`
(`adapters/types.ts`). Adapters extract and classify **one value at a time**; they never cluster, dedupe or
judge intent. `adapters/registry.ts` runs **every** adapter whose `detect` passes, not the first — a React
app declares tokens in `.css` and then uses or bypasses them in `.tsx`, and half that picture is not an
audit. Each value carries its own `adapterId`/`adapterVersion` so a mixed run stays attributable.

**`core/provenance.ts` — the spine.** Every value records `file · line · selector · property · tokenName ·
classification · reason · fixtureSha · adapterId · adapterVersion`. The point is attribution: a delta
between two runs must be traceable to the source changing, the adapter changing, or the config changing.
Reconstructing this after the fact is impossible, so never drop a field to simplify a call site.

**`tokenName === null` means a use site, not a declaration.** This single field is the seam between
"the system declares a literal" (`color/semantic-holds-literal`) and "a component hardcoded one"
(`token/raw-value-in-markup`). Palette analysis — `sweep`, `color/no-intent-plateau`,
`color/mixed-storage-forms` — must filter to declarations, or use-site literals smear the curve.

**`config/` — the mechanism/policy seam.** `schema.ts` + `defaults.ts`. Every tuned number
(`clustering.deltaE`, `primitivePattern`, `componentPattern`, `semanticNamespaces`,
`reservedSemanticTerms`, `taxonomy.shadow*`, sweep range) lives here with an **UNCALIBRATED** default.
**Nothing in `src/` outside `config/` may hardcode a threshold** — if it does, the seam has leaked.
`load.ts` also reads Murphy's `.ds-ops-config.yml` and maps its `severity:` block onto rule ids
(`MURPHY_SEVERITY_TO_RULES`); `yaml-lite.ts` is a deliberately minimal parser so the zero-dependency rule
holds.

**A colour that cannot be converted must be surfaced, not dropped.** `convert.ts` parses hex, rgb, hsl,
bare HSL triples and `oklch()`; `isUnparsedColorFunction` catches `lab`/`lch`/`hwb`/`color()` so adapters
classify them `ambiguous` instead of `excluded`. This exists because 76 oklch tokens once vanished from
every rule silently, and Radix's 72 display-p3 entries with them. Adding a colour form means adding it to
`parseColor` **and** keeping the unparsed-function net intact.

**Three outcomes, never conflated.** `verdict` is `clean` | `issues` | `not-checked`. A source no
adapter reads returns `not-checked` and prints its coverage — it used to return early, before the
report it most needed. An empty tree, styling in an unreadable format, and a read-but-unjudgeable
source must stay distinguishable in output; a linter whose silence is ambiguous is worse than none.
`coverage.complete` requires at least one adapter, so "every rule could judge" can never print inside
a not-checked report.

**The guard's coverage policy has regression tests** (`test/guard-hook.test.ts`). Both
failures it covers shipped and were found by a reviewer, not by this suite — writing the policy without
moving the test count gave it no protection. The cases that matter: a notice must fire when *no finding
survives the severity floor* (the hook passed `--quiet`, which suppressed the whole report in exactly
that case); every observed state is recorded including a complete one (writing only while incomplete
meant `incomplete → complete → incomplete` stayed silent the second time); and the signature is
**project-scoped only**, because the hook audits one file and file-scoped facts would make alternating
edits look like coverage flapping.

**Coverage notification is a decided policy, and each limitation has exactly one channel.** Preserving
coverage in the report is not the same as informing the agent.

| Limitation | Delivered by | Not delivered by |
|---|---|---|
| Formats nothing reads, unread token files | `context` at setup; the hook on change | — |
| **Which checks could not judge** | **`audit .` unfiltered, run deliberately** | the hook (filters at `high`), `context` (runs no rules) |
| CI's stronger claim | `audit --require-coverage` (exit 1) | a zero exit alone |

The middle row was claimed twice in docs to arrive "through the findings list". It does not, while the
hook filters that list — `token/tier-model-undetectable` is low severity. The skill's setup step now
requires an unfiltered audit at session start **and** before calling a change complete, and
`test/guard-hook.test.ts` pins the fact that the hook does *not* deliver it. If that test starts
failing, the hook policy widened and every one of these documents has to change with it.

**An audit execution failure is separate from rule findings.** The hook reports a
failed, timed-out or unusable audit as not checked, exits 2 for feedback and leaves
the last coverage state unchanged. It cannot turn a config error into an ordinary
silent save. This does not widen the high-severity filter or make the hook block edits.

**A severity floor filters findings, never coverage.** `couldNotJudge` is built from the *unfiltered*
finding set. The guard hook runs at `--min-severity high`, which is exactly where hiding a
"could not judge" would read as a pass. `test/coverage.test.ts` pins both.

**Coverage is part of the report** (`core/coverage.ts`). `audit` states which formats no
adapter read, what each adapter reads *inside* the files it opens, which colours were
recognised but not convertible, and which rules could not judge. An adapter therefore
declares `extensions` and `reads` in its type. The rule: a clean verdict is only as wide as
its coverage, so the width ships with the verdict.

**`commands/scorecard.ts` — the delta.** Appends one row per run to
`.ds-scorecard/history.jsonl` (append-only JSONL, no service) and prints the change since
the last row for that source. A delta is only reported as one when `adapters` and
`configHash` match on both sides; otherwise the instrument moved and it says so. Note
`audit`'s two suppression modes: `quiet` is hook semantics (silent only when clean),
`silent` is programmatic (never prints).

**`rules/` — deterministic checks.** A rule returns zero findings when that slice is clean. Ids are
`domain/kebab-slug` and are **stable**: scorecards and calibration rows key on them, so renaming a rule id
breaks historical comparison. `registry.ts` holds the list and the `RuleTarget` routing used by
`audit --target`.

**`color/`** — `convert.ts` (hex/hsl/rgb → Lab), `delta-e.ts` (CIEDE2000, verified against the Sharma et al.
test data in `test/color.test.ts`), `cluster.ts` (single-linkage union-find over the ΔE threshold graph).
The ΔE cutoff decides whether a palette "has" 7 greys or 11, which is why it is config and why `sweep`
exists: the right cutoff is discovered per source, never assumed.

**`commands/`** — `audit` (all rules, severity-ranked, exit 1 on findings), `sweep` (the ΔE curve + plateau
verdict), `scan` (taxonomy + cluster count), `guard` (installs/removes a `PostToolUse` hook in
`./.claude/settings.json`), `fix` (the MAPE-K "Execute" step — applies **only** mechanically provable
transforms; v0 does one: `var(--x)` → `var(--x, <literal of --x>)`).

Reference framing for the whole tool is the MAPE-K self-healing loop. ds-loop is Monitor + Analyze + the
provable subset of Execute. Judgment stays with a human or a coding agent — don't extend `fix` with
heuristics.

## Adding a rule

1. Implement in the domain file under `src/rules/` (`color.ts`, `tier.ts`, `dimension.ts`, `markup.ts`), or
   a new domain file. Export it.
2. Register in `src/rules/registry.ts` and set `targets` so `audit --target` routes it.
3. Cite the field evidence in a doc comment next to the rule, with the URL — existing rules cite Fluent's
   `AGENTS.md` and the SLDS `.builderrules`. A rule justified only by an MCP snapshot loses its provenance
   when the snapshot ages.
4. Add a test in `test/`. Construct `RawValue`s directly (see `test/rules.test.ts`) or write a temp-dir
   fixture (see `test/tailwind-jsx.test.ts`).
5. **Measure it on a repo nobody here wrote** before trusting it. Every precision defect found so far was
   invisible in unit tests: geometry utilities counted as scale bypasses (241 hits, 239 wrong), build output
   audited as source, oklch palettes read as "not a colour", and a tier rule that could not fire on any
   real naming convention while reporting nothing. `npm run smoke` covers distribution, not precision —
   that still needs a real repo and a human reading the hits.

## Adding an adapter

1. Implement `Adapter` in `src/adapters/`, using `core/files.ts` (`listFiles` / `filesInScope`, which honour
   `source.only` for hook and `--files` mode) and `core/literals.ts` (`isLengthLiteral`) so adapters can't
   disagree about scope or value shapes.
2. Add it to `ADAPTERS` in `src/adapters/registry.ts` and export it from `src/index.ts`.
3. Set `tokenName` to `null` for use-site values; put the conditional context in `selector`.
4. Bump the adapter's `VERSION` when extraction behaviour changes — a calibration delta is attributed to it.

## Conventions and constraints

- **Do not rewrite the tool's output strings into plain English.** Rule summaries, `fix` text and audit
  output stay in domain vocabulary. This was tried once and reverted by the user: engineers and agents share
  the domain language, and plain phrasing forces a lossy translation step. (Customer-facing wording belongs
  on a landing page, framed *around* verbatim output.)
- Rules are regex-based, not parser-based. Where that leaves a known ceiling, mark it with a `ponytail:`
  comment naming the ceiling and the upgrade path, as `dimension.ts`, `tier.ts` and `tailwind-jsx.ts` do.
- biome: single quotes, trailing commas, 110-column lines, `fixtures/**` ignored. `console.log` and
  non-null assertions are allowed on purpose.
- **Client fixtures live only in the private calibration repo.** A client's real token file, and the
  findings measured on it, never come into this repo — not the file, not the ratios, not the repo name.
  Public fixtures here are open-source systems anyone can verify. Examples in defaults, tests and skill
  docs are independently constructed (`--ds-*`, "Example DS"); a private namespace renamed and presented
  as a generic default is still the engagement's data.
  The check is mechanical: `npm run smoke` greps **every packed file** — `dist/` included, where TS
  comments survive — against `.private-names` (gitignored, one name per line) or
  `DS_LOOP_PRIVATE_NAMES`. Grepping tracked source for two spellings is what declared it clean twice
  while the names shipped in the npm manifest. **An absent list fails the check** — nothing checked is
  not a pass — with `DS_LOOP_PRIVATE_NAMES=none` as the deliberate opt-out for a clone with no private
  material. The list holds **measurements as well as names**: a private source's ratios attached to a
  renamed label are still the engagement's data, and `src/` comments survive into `dist/`.
  CI passes the list to the smoke job from the `DS_LOOP_PRIVATE_NAMES` secret and **fails a trusted run
  that does not have it**; a fork PR cannot read the secret, so that run warns and skips the scan.
  Scan **the ref being published and the packed tarball** — not `git log --all`, which in a working clone
  also walks Codex checkpoint refs holding pre-rewrite objects, and not `main` alone, which misses the
  artifact.
- Ratios, not counts, in reports — a scorecard row has to survive codebase growth. No
  ratio may describe the tool rather than the source: `findings-per-rule` was retired for
  exactly that, since its denominator moved from 7 to 11 when rules were added and nothing
  about any source changed.
- `hashConfig` must change when any nested value changes. It once passed a property
  allowlist to `JSON.stringify`, believing it sorted keys, and returned the same constant
  for every config — so the threshold leg of the attribution model did nothing for months.
  `test/config.test.ts` pins this.

## The name: Design System Loop, `ds-loop`

**The public product is "Design System Loop". The identifier is `ds-loop`, everywhere.** A naming
decision, not a restructuring — capabilities and verified output do not change with it.

| Use "Design System Loop" | Keep `ds-loop` |
|---|---|
| Prose in reader-facing docs, the site, a title, a sentence introducing the product | `package.json` `name` and `bin` · the CLI you type · the repository · every path and directory · config filenames · `skill/SKILL.md`'s `name:` · the `$ds-loop` skill invocation |

**Do not rename any of the following**, and do not "modernise" them for brand consistency:

- `ds-loop` — the package, the binary, the command in every example
- `.ds-loop-config.{yml,yaml}`, `ds-loop.config.json`, and `.ds-ops-config.{yml,yaml}` — the last is
  Murphy Trueman's filename, kept verbatim for interop, and renaming it breaks that
- `.ds-scorecard/history.jsonl` — an append-only file in users' repositories
- `skill/hooks/ds-loop-guard.mjs` — referenced by hook entries already written into users'
  `.claude/settings.json`; renaming it silently disables their guard
- `node_modules/.cache/ds-loop/` — the guard's state directory

**Never rebrand CLI output.** Report headers like `ds-loop audit — <label>` are checked against real
runs by `test/readme.test.ts`, and rebranding a header breaks documentation verification. An agent that
then "fixes" the failing test has quietly removed the guard against fabricated samples. The name in the
banner is the command, not the product.

`test/naming.test.ts` enforces the identifier half of this table, so the distinction survives a future
agent who reads only the branding half.

### Ownership while the rename lands

The website task owns `site/` and its assets. The original Codex task owns `README.md` and the core
documentation under `docs/guide/`. Neither boundary is a suggestion: editing another task's surface
during a naming pass is how a coordinated rename becomes a merge conflict with opinions in it.

## Every exit names the next command

`src/core/next.ts` builds the `next` block that `audit`, `scan`, `sweep` and the bare command end
on, and it lands in `AuditReport.next` so `--json` carries the same handover a person reads.

Why it exists: a user installed the package, typed `ds-loop`, and got the seven-command flag manual
— which is a reference, and the wrong answer to "now what". Meanwhile `audit` ended on scorecard
ratios, the one number that says nothing until a second run exists, and nothing anywhere mentioned
that `fix` could repair a subset of the findings just printed. `PRODUCT.md`'s jobs section records
this as job 1, the worst-served job.

The rules, all pinned by `test/next.test.ts`:

- **Bare `ds-loop` and `ds-loop start` audit the directory** and print verdict, biggest finding,
  what was read, and the handover. `--help` keeps the full reference, with the entrance named first.
- **`fix` is offered only when the fixer can actually act.** The count comes from `planFixes`, not
  from a rule's own count — a rule counts `var()` references, the fixer skips any whose target is not
  a resolvable literal. Offering a command that then says "nothing mechanically fixable" is the same
  broken promise as no guidance at all.
- **A baseline is offered only when no history exists**; otherwise the row says how many rows it
  would compare against. The guard row disappears once the hook is installed.
- **Ratios stay, but never last.** They are the comparison instrument, not the reading.
- **The handover names commands. It does not restate findings.** Rule summaries and fix text are
  untouched — see the output-strings constraint above; this is sequence, not translation.

## Documented output must be real output

`test/readme.test.ts` runs every README or `docs/guide/output.md` sample marked `<!-- verified: <id> -->` and asserts each
documented line appears in the actual output. A stale sample fails the build; so does a fabricated
one; so does adding a `verified:` block without registering a check for it.

This exists because a sample was once **composed from memory and presented as "real output"** — it was
plausible, it was wrong, and it was caught by accident. Another carried an invented date. On its first
run this test caught a third: two finding pairs spliced together across a line wrap as though
contiguous, silently dropping the two entries between them.

**When adding a sample: run the command, paste the output, mark it verified, register it.** Reflowing
for width is allowed — lines are matched after whitespace normalisation, and a trailing `…` marks
truncation — but reordering or splicing is not, because that is how a wrapped line becomes a false one.

## Writing standard for reader-facing docs

**The bar is [mattpocock/skills](https://github.com/mattpocock/skills).** Applies to `README.md`, landing
pages, skill docs — anything a stranger reads. Not to rule output (see the constraint above) and not to
internal notes.

- **Hook, then problem, then fix.** Open with what breaks for the reader, not a definition of the tool. No
  etymology, no "this repo is X", no status disclaimer above the fold.
- **A runnable command in the first ten lines.** The reader should be able to try it before they've read an
  explanation of it.
- **Install and use before architecture.** Provenance, seams, and roadmaps go near the bottom or into
  `docs/`. A stranger doesn't care how it thinks until it has told them something true.
- **Direct address, contractions, short sentences.** "Your tokens live in `.css` and get bypassed in
  `.tsx`" beats "the mechanism/policy split is real but not clean". Vary length for rhythm; end sections on
  the short one.
- **Confident, never hedged.** State limits in a dedicated section, plainly, rather than apologising
  throughout. "It can't price your rebrand" is honest; "most engines are scaffolding" in the intro is
  self-sabotage.
- **Show real output.** Paste a genuine run, unedited, and point at the two things worth noticing.
- **Cite a source for the specific claim it supports.** A quote in a callout carries weight only when the
  source actually says the thing the sentence claims — the field survey for a survey number, the system
  whose rule a check encodes for that rule. A named source next to an unsupported generalisation is how
  this project shipped comparative claims about other tools that nothing backed.
- **Cut abstract nouns.** "policy-free mechanism", "scope line", "the leaky seam" are notes-to-self. Name
  the thing a reader would name.

## Orientation files

- `HANDOFF.md` — running project state, pending work, and the user's standing corrections. Read it
  before proposing direction. **Untracked on purpose**: it quotes client findings and calibration
  ratios, which belong with the private corpus. Present on disk, absent from the published history —
  as are `STRATEGY.md` and the review/triage documents under `docs/`.
- `STRATEGY.md` — the portfolio read: what the engine, the calibration corpus and the skills pack are each
  for, and what is missing.
- `docs/METHODOLOGY.md` — the engagement methodology the tool automates, including the four-layer token
  model and the relationship to `design-system-ops`.
- `skill/` — the `/ds-loop` skill: `SKILL.md`, per-command playbooks in `reference/`, the guard hook in
  `hooks/ds-loop-guard.mjs`, and the CLI launcher `bin/ds-loop`. Eight CLI commands are implemented:
  `start` (also the bare invocation), `context`, `audit`, `scan`, `sweep`, `guard`, `fix` and
  `scorecard`. The other named operations are agent playbooks.
- `product-system-skills-v0.2/` is an **unrelated, untracked** skills pack that happens to sit in this tree.
  It is not part of the engine. Its review history lives in
  `docs/FEEDBACK-TRIAGE-2026-09-16.md` (untracked), which records every accept/reject
  decision and the lines worth preserving if a skill there is ever cut.
