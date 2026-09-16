# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **deterministic** design-system linter. It reads a design system's token/CSS/JSX code and reports what
drifted, with exact `file:line`. **No LLM, no API key, no network, no runtime dependencies** — math, not AI.
If a change to this repo would introduce a model call or a package dependency in `src/`, that is the wrong
change.

This repo is the **open engine** (MIT): policy-free mechanism. The tuned thresholds and the corpus of
before/after engagement runs live in a separate private repo (`ds-loop-calibration`) and are passed in at
run time. See `README.md` § "The leaky seam" for where that split is deliberately imperfect.

Positioning that has been settled and should not be relitigated: ds-loop **complements** Murphy Trueman's
LLM-based `design-system-ops` skill pack (it reads his `.ds-ops-config.yml` verbatim for interop) and
operates on *the system behind the screens*, not on individual screens.

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

**`adapters/` — one per storage format.** Interface is `detect(source)` + `extract(source, config)`
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
- `fixtures/example-ds/example-preview-tokens.css` (a client's real tokens) lives **only** in the private
  calibration repo. Never vendor it here.
- Ratios, not counts, in reports — a scorecard row has to survive codebase growth.

## Orientation files

- `HANDOFF.md` — running project state, pending work in survey-backed order, and the user's standing
  corrections. Read it before proposing direction.
- `STRATEGY.md` — the portfolio read: what the engine, the calibration corpus and the skills pack are each
  for, and what is missing.
- `docs/METHODOLOGY.md` — the engagement methodology the tool automates, including the four-layer token
  model and the relationship to `design-system-ops`.
- `skill/` — the `/ds-loop` skill: `SKILL.md`, per-command playbooks in `reference/`, the guard hook in
  `hooks/ds-loop-guard.mjs`, and the CLI launcher `bin/ds-loop`. Most commands listed there are still
  scaffolding; `audit`, `sweep`, `scan`, `guard` and `fix` are the ones that work.
- `product-system-skills-v0.2/` is an **unrelated, untracked** skills pack that happens to sit in this tree.
  It is not part of the engine; see its `docs/skill-quality-review.md`.
