# Commands and coverage

Find what your code uses and what the engine can check. Run this from your project:

```sh
npx ds-loop audit .
```

Most commands resolve configuration from the working directory. Paths select the source to inspect; `doctor` resolves configuration from the target root.

Jump to [commands](#engine-commands), [audit options](#audit-options),
[configuration](#configuration), [coverage](#coverage), or [rules](#rules).
Use the [installation guide](install.md) for your first run.

## Engine commands

These 15 commands come from [the CLI entry point](../../src/cli.ts).

| Command | Result | Writes? |
| --- | --- | --- |
| `start [path]` / bare `ds-loop` | Verdict for this directory, its biggest finding, what was read, and the next command | Creates `ds-loop-report.html` only when no report or `.ds-scorecard/` exists |
| `context [path]` | Config, conventional intent-source locations, extraction scope; no rules | Only with `--write-contract`, which creates `DESIGN-SYSTEM.md` and never overwrites one |
| `audit [path]` | Summary and coverage; `--all` for full details and ratios | Only with `--out <dir>` or `--html <file>` |
| `dashboard [path] [--out file.html]` | Today’s state and saved scorecard trends | Writes HTML and a local dashboard-refresh registration |
| `report [path]` | Consulting report with measured evidence and optional `--consult <file.json>` assessment | Writes `ds-loop-report.html` or `--out <file.html>` |
| `impact <specifier> [path]` | Every direct static import location, production and stories/tests apart; `--json` | No |
| `decide [path]` | Markdown decision with owner, alternatives, date and evidence refs | Creates a new file in `docs/decisions/` |
| `consumers [path]` | Workspace imports and static JSX shared-component share per package; `--scope`, `--json`, `--html <file>` | Only with `--html <file>` |
| `scan <path>` | Extracted-value taxonomy and palette clusters | No |
| `sweep <path>` | Clustering curve across the configured ΔE range | Only with `--out <dir>` |
| `scorecard [path]` | Ratios and comparable deltas | Appends `.ds-scorecard/history.jsonl` in cwd; `--dry-run` previews |
| `fix <path>` | Mechanically resolvable `var()` fallbacks | Only with `--write` |
| `install [--agent claude\|cursor\|codex\|all]` | Add agent instructions; `--dry-run` previews | Appends or replaces its own marked block; `--guard` also edits `.claude/settings.json` |
| `doctor [path]` | Contract drift, config observations, guard state and intent evidence; `--json` | No; advisory, not a CI gate |
| `guard on\|off\|status` | Claude Code post-edit feedback configuration | `on` and `off` edit `.claude/settings.json` |

`fix` is not an automatic token migration. `scorecard` does not gate CI. `guard` cannot prevent an edit.

### Preview a mechanical fix

```sh
ds-loop fix . --help
ds-loop fix .
ds-loop fix . --write
ds-loop audit .
```

The first command explains eligibility; the second previews without writing.
Review that preview against the permitted scope and exceptions before applying it.
The fixer only inserts missing `var()` fallbacks in CSS custom-property declarations
when the referenced token has a direct color or dimension literal in scope. It does
not follow alias chains, migrate JSX utilities, or fix other rule classes. `--target`
belongs to `audit`, not `fix`. A zero-edit result explains whether the scope yielded
no declarations, no candidates, or references without eligible literal targets.
It preserves upstream-internal references. Project aliases pointing to upstream
still need fallbacks; eligible ones appear in the preview.
It does not establish a clean audit. Use an unfiltered audit afterward.

### The contract file

`ds-loop context --write-contract` creates an optional `DESIGN-SYSTEM.md` draft and
never overwrites an existing file. Keep an existing decision home when it serves the
team. The draft contains measured declarations, configured tier classifications,
storage forms, extraction limits, and recorded exceptions with reasons and file scope.
Open questions cover the adopted model, source of truth and consumer requirements;
tier questions apply only where the team uses those tiers.

`context` locates the file; an agent must read and apply its decisions. Editing it
does not configure or suppress rules. Naming patterns can describe a compatible
model, but cannot change the engine's permitted tier relationships. State an
unsupported model as a limitation rather than redesigning it to obtain a clean audit.

## Agent procedures

Use the twelve [agent commands](workflow.md#agent-commands), starting with
`/ds-loop:start`. Their instructions live in `skill/commands/`; deeper procedures
live in `skill/reference/`. An agent investigates and acts within your authorized
scope. These procedures are separate from CLI measurements. The CLI `doctor`
reports evidence; the doctor playbook guides a broader agent review.

## Audit options

Use `--json` for structured output, `--out <dir>` to retain reports, `--target` for a rule domain, `--files a,b` or `--since main` to narrow files, and `--min-severity` to filter findings. Targets are `all`, `tokens`, `color`, `spacing`, `typography`, `elevation`, `motion` and `docs`. `--require-coverage` makes reported coverage gaps fail too.

The audit exits 1 on surviving findings; without strict coverage, `not-checked` can exit 0. Severity filtering does not remove coverage limits from the report.

## CSS inventory and token suggestions

Ordinary CSS rules contribute to seven categories: `color`, `spacing`,
`typography`, `radius`, `shadow`, `z-index` and `duration`. Audit reports show
occurrences, distinct expressions, classification counts, tokenization ratios and
top files. Counts come from extraction, before exceptions or severity filtering;
a lower finding count does not change this inventory.

Tokenization is references / (literals + references + mixed). Unclassified and
excluded values stay outside that denominator; a missing denominator is `null`.
A reference is not proof that the token resolves. Channel-token colours such as
`hsl(var(--x))`, `hsl(var(--x) / 0.5)` and `rgb(var(--x))` count as references;
fallback values are retained. Active literal colour channels remain mixed.

Raw-value findings in CSS and markup include token candidates. The engine follows
whole-value alias chains and normalizes supported equivalent spellings, such as
`#333`, `#333333` and `rgb(51, 51, 51)`. It converts rem using the configured root
font size, tries exact matches before proximity matches, and prefers project aliases
over primitives without dropping other candidates. Multiple preferred candidates
remain ambiguous. Suggestions are candidates for review, never replacements.

### Fields in `audit --json`

| Field | Contents |
| --- | --- |
| `styleInventory.<category>` | `occurrences`, `distinctValues`, `literals`, `references`, `mixed`, `unclassified`, `excluded`, `tokenizationRatio` |
| `styleInventory.<category>.values[]` | `value`, `property`, `classification`, `occurrences`; full extracted distribution |
| `styleInventory.<category>.topFiles[]` | `file`, `occurrences`; full ranking, while the human report shows the first five |
| `findings[].data` for `token/raw-value-in-style` | `category`, `count`, all `hits` with source provenance; unjudged groups also carry `notJudged: true` |
| `findings[].suggestion` | `basis`, shared `resolutionLimits`, and per-use-site `values` |
| `suggestion.values[]` | `value`, `file`, `line`, `property`, `status`, `candidates`, `limits`; statuses are `exact`, `nearest`, `ambiguous`, `no-token`, `not-checked` |
| `candidates[]` | `token`, resolved `value`, `match`, `distance`, `metric` (`identity`, `ΔE`, `px`), `tier`, `aliasChain`, declaration provenance and `preferred` |

CSS rule findings retain every hit in JSON; human locations are grouped and
abbreviated. Suggestions retain candidates and resolution limits rather than
selecting a replacement. See [real output examples](output.md#ordinary-css-inventory).

## Scoped checks and token context

`--files` limits the files judged; paths are relative to your working directory.
`--since <ref>` selects committed changes from the merge base with that ref to HEAD
in the target repository. It does not include uncommitted edits. An empty selection
returns `not-checked`; an invalid Git comparison fails instead of auditing the tree.

For `token/stock-palette-utility`, identify the CSS declarations each consumer uses.
Record that association in `ds-loop.config.json`, or an explicit JSON config:

```json
{
  "tokenContexts": [
    { "files": ["app/*"], "tokens": ["app/theme.css"] }
  ]
}
```

Adding the first mapping makes explicit context required for every stock-palette
use site in the audit scope, including a full-tree audit. Unmapped use sites become
unjudged; they do not fall back to unrelated declarations elsewhere in the tree.
With `--require-coverage`, a partial mapping rollout can therefore fail CI. Inventory
the affected consumers and supply their mappings, or record justified exceptions
for deliberately unthemed scopes, before adopting mappings in that CI run.

These paths are relative to the audit source root (the containing directory when
auditing a single file). `files` accepts exact paths or trailing-`*` prefixes;
`tokens` accepts exact CSS file paths inside that root. This option requires JSON;
the YAML subset cannot represent these entries. If an earlier auto-discovered YAML
config exists, migrate its settings into JSON or select the JSON with `--config`.
The hook uses automatic config discovery, so its configuration must be the first
matching file in the discovery order below.

The declarations are read only. They enable the palette check without adding
out-of-scope declaration findings or changing ratios. JSON reports retain the
selected files and context paths, consumers, adapter versions, content hashes and
read failures in `manifest`. The mapping changes `configHash`.

A scoped palette check without applicable, readable color declarations reports a
low-severity judgment limit. `coverage.couldNotJudge` retains it even when a severity
floor hides the finding. `--require-coverage` fails on that gap. Deliberately
unthemed consumers can have a recorded rule exception with a reason.

These mappings do not resolve CSS imports, Tailwind configuration or effective
colors. Other rules still judge only selected files. Unscoped audits without any
mappings retain the broad gate: a color declaration anywhere in the target enables
palette findings. Use explicit mappings to bound that assumption in a mixed-theme
repository; inspect the project contract and rendered behavior before changing code.
The default hook still filters this medium-severity rule.

## Configuration

Automatic discovery checks `.ds-loop-config.yml`, `.ds-loop-config.yaml`, `ds-loop.config.json`, `.ds-ops-config.yml` and `.ds-ops-config.yaml`, in that order, in cwd. The explicit `--config <file>` path currently accepts JSON. Auto-discovered YAML uses a small supported subset, not a full YAML parser.

For a project whose actual contract uses `--foundation-*` primitives and `--intent-*` semantics, an illustrative `ds-loop.config.json` is:

```json
{
  "taxonomy": {
    "primitivePattern": "^--foundation-",
    "semanticNamespaces": ["intent"]
  }
}
```

Use patterns from your own contract. These settings configure existing rules; they do not create new checks. The engine's palette → semantic → component model is an assumption, not a required architecture. If your model cannot be represented faithfully, report the limitation.

### Upstream tokens, category severity and suggestions

Merge the relevant settings into your existing config:

```json
{
  "taxonomy": { "upstreamPattern": "^--upstream-" },
  "style": {
    "severity": {
      "color": "high",
      "spacing": "high",
      "typography": "medium",
      "radius": "medium",
      "shadow": "medium",
      "z-index": "low",
      "duration": "low"
    }
  },
  "suggestions": { "rootFontSize": 16, "lengthTolerancePx": 1 },
  "clustering": { "deltaE": 2.3, "alphaTolerance": 0.01 }
}
```

| Key | Default / effect |
| --- | --- |
| `taxonomy.upstreamPattern` | `null` disables upstream classification. Otherwise a case-insensitive regex matches full token names before other tiers. |
| `style.severity.<category>` | Defaults shown above; `blocking`, `high`, `medium` or `low`. Applies to literal-presence findings; unclassified expressions still report a low-severity judgment limit. |
| `suggestions.rootFontSize` | `16` px per rem; an explicit assumption, not a measured browser root size. |
| `suggestions.lengthTolerancePx` | `1` px maximum distance for nearest px/rem candidates. |
| `clustering.deltaE` | `2.3`; palette edges require ΔE below this threshold. Also used for colour suggestions. |
| `clustering.alphaTolerance` | `0.01`; palette pairs with a larger alpha difference are excluded before comparing ΔE. |
| `architecture.maxAliasDepth` | `4`; review threshold for reference depth, not an alias validity limit. |
| `architecture.scaleStepPattern` | Regex for numeric or named scale steps; see the defaults for the full pattern. |
| `suggestions.categoryPatterns` / `utilityPatterns` | Per-category regex signals for token names and markup utilities. Usage evidence takes precedence. |
| `suggestions.unitlessRoles` | `font-weight`, `line-height` and `z-index` each configure `tokenPattern`, `properties` and `tolerance` (default `0`, exact only). |

CIEDE2000 compares three colour coordinates and has no alpha term. An opaque
black and a translucent black therefore have ΔE zero even though one composites
with its background. The alpha gate prevents that pair from becoming a palette
near-duplicate or a direct clustering edge. Its tolerance absorbs rounding; it
doesn't establish interchangeable intent. Clusters use single linkage, so chains
of eligible edges can still connect more distant endpoints. See the
[clustering implementation](../../src/color/cluster.ts) and
[near-duplicate rule](../../src/rules/color.ts).

The remaining config groups describe your naming conventions and palette sweep:

| Keys | Purpose |
| --- | --- |
| `taxonomy.primitivePattern`, `componentPattern`, `semanticNamespaces`, `tierCoverageFloor` | Recognize tiers; the default coverage floor is `0.5`. |
| `taxonomy.reservedSemanticTerms`, `categoryTokenHints` | Flag appearance-based semantic names while recognizing category names. |
| `taxonomy.shadowTokenHints`, `shadowAlphaCeiling`, `nonColorTokenHints` | Classify shadow internals and excluded values; the alpha ceiling defaults to `0.25`. |
| `taxonomy.scaleUtilities`, `colorUtilities`, `stockPaletteFamilies` | Select supported scale and palette utility names. |
| `sweep.min`, `sweep.max`, `sweep.step` | ΔE sweep range; defaults `0.5`, `12`, `0.25`. |
| `tokenContexts`, `ignore` | Explicit CSS context and reasoned exceptions, described above and below. |

These defaults are uncalibrated. The [schema](../../src/config/schema.ts) and
[defaults](../../src/config/defaults.ts) are the complete source for keys and regexes.

Upstream declarations may hold literals and reference their own internals without
project fallback requirements. Project aliases reference upstream with fallbacks;
components and supported use sites reference project aliases. `token/upstream-bypass`
reports direct upstream consumption. Palette diagnostics still apply: upstream is
not a blanket exception. Choose a pattern that identifies the imported source,
not every project token.

### Recording an exception

To suppress one verified case, edit the project's existing configuration; avoid
creating a second competing config. The JSON example below belongs in
`ds-loop.config.json`. If a YAML config already takes precedence, migrate its
settings deliberately or pass `--config <file.json>` for the audit. The hook needs
the configuration selected by automatic discovery.

A rule that is wrong about one token does not need a wider threshold. Widening one silences the whole
class in every future run and records nothing anyone can disagree with. Record the case instead, with the
argument attached:

```json
{
  "ignore": [
    {
      "rule": "color/semantic-holds-literal",
      "value": "--color-surface-raised",
      "files": ["theme.css"],
      "reason": "The palette layer lands next sprint and this token is the seed for it.",
      "createdAt": "2026-09-19"
    }
  ]
}
```

`reason` is required — a config with an entry that lacks one fails to load, because an entry dropped
silently would look like the exception was honoured. `rule` takes a rule id or `*`; `value` matches a token
name or a literal, and `*` with `files` is the whole-file exception. Entries remove values from that rule's
*input*, so the counts a surviving finding reports stay true, and `audit` prints every entry that matched —
a clean verdict still shows what was argued away to reach it. Exceptions are part of `configHash`, so a
scorecard delta across a changed exception set reports that the instrument moved.

`files` must be a list. Omit it to cover all files; an empty list covers none.
A path matches exactly or as a path suffix; a trailing `*` matches a prefix from
the audit source root. Thus `theme.css` also matches `legacy/theme.css`, while
`legacy/*` limits the exception to that prefix. Interior wildcards are unsupported.
Malformed selectors fail loading instead of silently widening an exception.
Review the reported matches before relying on a suppression.

Run `ds-loop audit . --json` before and after the edit. Check `suppressions` for
the intended rule, value and matched count; compare finding locations with the
configured file scope and confirm unrelated occurrences remain visible.
A lower count caused by an exception is a policy change, not a product
repair. Editing `DESIGN-SYSTEM.md` alone does not configure an exception.

The [configuration schema](https://github.com/owaizin/ds-loop/blob/main/src/config/schema.ts) and [defaults](https://github.com/owaizin/ds-loop/blob/main/src/config/defaults.ts) define clustering, taxonomy and sweep settings. Defaults are uncalibrated. Use `sweep` to investigate your source before choosing a clustering cutoff. The `.ds-ops-config.yml` compatibility path reads system context and maps supported severity settings from design-system-ops.

Adapter versions and the configuration hash identify the measurement instrument.
Re-measure after an upgrade; a changed instrument prevents a comparable delta.

## Coverage

All five adapters in the [registry](../../src/adapters/registry.ts) run when they
detect supported input. These boundaries follow each adapter’s `extensions` and
`reads` declarations.

| Adapter | Reads | Does not read |
| --- | --- | --- |
| [CSS custom properties 0.6.0](../../src/adapters/css-custom-props.ts) | Custom-property declarations in `.css` | Ordinary rule bodies and declarations inside at-rules |
| [Tailwind JSX 0.5.0](../../src/adapters/tailwind-jsx.ts) | Arbitrary-value strings and framework-palette colour utilities in `.jsx`, `.tsx`, `.js`, `.ts`, `.mjs` | Utilities naming your own theme tokens, arbitrary variants/bracketed opacity, inline style objects, CSS-in-JS |
| [CSS rule bodies 0.3.0](../../src/adapters/css-rule-bodies.ts) | Selected ordinary CSS properties, literals and `var()` references, including nested at-rules | Custom-property declarations, declaration at-rules such as `@font-face`, preprocessors, import/cascade resolution |
| [Token JSON 0.2.0](../../src/adapters/token-json.ts) | DTCG `$value`/`$type`, Style Dictionary `value`/`type`, inherited types, nested groups, aliases and exact value lines in `.json` | Theme merging, `$extends`, composite evaluation; ambiguous aliases when targets are missing, duplicated or cyclic |
| [SCSS 0.2.0](../../src/adapters/scss.ts) | Variables, custom properties, selected rule properties, nested/conditional contexts, `map.get`, `.scss` and indented `.sass`; records `@use`/`@forward` | Module resolution, Sass evaluation, interpolation and mixin/function expansion |

Colour covers colour/background/border-colour properties; spacing covers padding,
margin and gap; typography covers font size, weight and line height. Radius,
box shadow, z-index and transition/animation duration properties complete the
seven categories. This is not every CSS property.

Sass maps are recorded without evaluation. JSON composite values and unresolved or cyclic aliases remain ambiguous; coverage lists these separately from undecided colour roles. Recognized colors that cannot be converted are reported as ambiguous. A file extension is not a promise of full syntax coverage.

`clean` means no findings survived the selected scope and severity. `issues` means
findings survived. `not-checked` means no adapter read the source, including an
empty source. These are different verdicts; a clean result is only as wide as its coverage. Read `coverage.couldNotJudge` even when severity filtering hides the associated finding. `context` runs no rules, and the hook filters at high severity; an unfiltered audit is the channel for all judgment limitations.

## Rules


Fifteen deterministic rules examine supported extracted values. Interpret their
findings against the applicable project contract and the report's coverage.

| rule | severity | catches |
| --- | --- | --- |
| `docs/undocumented-shared-component` | low | detected shared components with neither a matching story nor an adjacent docs page; missing documentation conventions remain not checked |
| `token/upstream-bypass` | high | components or supported style/markup use sites reference upstream directly instead of a project alias |
| `token/raw-value-in-style` | configured per category / low | literal presence in ordinary CSS, not a prohibition; low-severity groups identify unclassified expressions |
| `token/tier-leakage` | high | component → primitive skips and upward references under the configured tier assumption; investigate applicability and theme behavior |
| `color/semantic-holds-literal` | high | a semantic token holding a literal colour instead of `var(--primitive)` |
| `token/raw-value-in-markup` | high | a component hardcoding a colour or length at the use site — `bg-[#1da1f2]`, `p-[13px]`. Names the token that already carries the value when one does. |
| `token/raw-dimension-in-semantic` | high | a semantic or component token holding a raw `16px` / `1rem` instead of a spacing / type primitive |
| `token/semantic-name-describes-appearance` | medium / low | a semantic token named for a colour or size (`color.action.blue`) — a primitive with extra steps. Low when only category / chart tokens. |
| `token/stock-palette-utility` | medium | a use site names a framework-palette utility such as `bg-white`. Verify the applicable theme and project contract. Scoped checks without token context report a low-severity judgment limit. |
| `color/literal-duplicate-tokens` | medium | tokens declaring identical color literals; equivalent values do not establish equivalent intent |
| `color/mixed-storage-forms` | medium | hex + hsl-channels + rgb in one source |
| `color/near-duplicate-primitives` | low | primitive colors within the configured ΔE threshold; investigate whether distinct values serve distinct needs |
| `color/no-intent-plateau` | low | a palette with no ΔE knee at the count the humans shipped |
| `token/tier-model-undetectable` | low | too few referencing tokens match the configured tier patterns; silent at zero references, so it cannot establish that a design system is absent |
| `token/var-missing-fallback` | low | a `var(--token)` with no fallback — resolves to nothing the moment that token is undefined |

Route them with `--target all|color|tokens|spacing|typography|elevation|motion|docs`, narrow with `--files a,b` or `--since main`, raise the floor with `--min-severity high`.


## Edit feedback and scorecard comparisons

The guard reports changed-line findings and summarizes unchanged-line finding
groups in one line. These labels describe overlap with the diff against HEAD,
not causation; untracked files are unknown. A token change can affect untouched
lines. Use an unfiltered audit for details instead of expanding the edit's scope.

When adapter versions or configuration change, `scorecard` reports
`instrument moved` and withholds a delta against the previous row. The new row
becomes the baseline for later comparable runs. Without a previous row, it records
a first baseline instead.

## Limits of the result

A finding is evidence to investigate, not proof of design intent. Ratios describe extracted code, not system maturity. The engine does not observe rendered behavior, accessibility, user comprehension or product outcomes. It uses regex-based extraction with documented ceilings. Suggestions do not resolve
the cascade, modes or semantic intent. Alias cycles, missing targets, computed
expressions and unsupported colour syntax retain limits; fallbacks are not assumed
active. Colour proximity does not compare different alpha values. A channel-reference
classification does not make that expression resolvable by the suggestion engine.

[Example reports](output.md) · [Back to the guide](README.md)

## Consulting report

```sh
npx ds-loop report .
npx ds-loop report . --consult consult.json --out design-system-report.html
```

`report [path]` audits the source without a severity filter and checks component
usage when workspace packages exist. It writes `ds-loop-report.html` in the current
directory by default. Parent output directories are created. `--config` uses the
same configuration and severity overrides as `audit`. Generation exits 0 even if
findings exist or coverage is incomplete; invalid input and I/O errors exit nonzero.
Use `audit --require-coverage` for a CI gate.

The self-contained report makes no network requests. It includes summary, problem,
current evidence and architecture, cited practices, proposed state, plan, and
coverage limits, in that order. Without `--consult`, the four assessment sections
say they have not been written and point to `skill/reference/consult.md`.
Light/dark appearance follows the system or the appearance control. Printing starts
each main section on a new page. Expand evidence before printing; the HTML retains
the full recorded evidence browser. Source links use local `file:` URLs with line
fragments; editors/browsers may not navigate to the exact line. Recipients need the
same source checkout. Reference URLs are links, never fetched by the engine.

### consult.json schema

All fields below are required. Strings must be non-empty. `problem`, `practices`
and `plan` must have at least one entry; `assumptions` may be empty. Unknown extra
fields are ignored. Paths in evidence are relative to the scanned source directory
(or the containing directory for a single-file scan).

| Field | Shape |
|---|---|
| `title` | String naming the engagement |
| `problem` | Array of claims: `{ "text": "…", "evidence": [{ "ref": "src/theme.css:12" }] }` |
| `practices` | Array of claims with an additional required `system` string naming the source system |
| `after` | Claim with required `architecture` proposal (see below) |
| `plan` | Array of `{ "title": "…", "effort": "…", "changes": "…", "why": "…", "verification": "…", "evidence": [...] }` |
| `assumptions` | Array of claims, visibly labelled as assumptions awaiting confirmation |

Every `evidence` entry has a `ref`: a `file:line` (optionally `file:line:column`), a
registered rule ID, or an HTTP(S) URL. An optional `report` string identifies the
source report. Empty evidence arrays are permitted and visibly labelled unsupported.
The validator checks structure and reference syntax, not whether a citation proves
the claim. Agent-cited evidence is labelled as such; it is not engine verification.
Malformed input lists all detected validation errors and does not write a report.

`after.architecture` uses the same validator and renderer as
`skill/tools/proposal.mjs`:

- `title`: non-empty string; optional `scope` string.
- `lanes`: non-empty array of `{ "id": "before", "label": "Before" }` (optional `note`).
- `nodes`: non-empty array of `{ "id": "ui", "lane": "before", "label": "Shared UI", "status": "observed", "evidence": [...] }`.
  Optional `detail` and `replaces` (an existing node ID).
- Optional `edges`: `{ "from": "ui", "to": "app", "meaning": "Imported by", "status": "proposed", "evidence": [...] }` entries.
- Status is `observed`, `inferred`, `proposed` or `not-checked`. Observed and inferred
  nodes/edges require evidence. Proposed claims without evidence render unsupported.
- Optional `decisions` and `roadmap` retain the proposal tool's schema; see
  `skill/templates/proposal.example.json`. A decided decision names its owner;
  each roadmap stage names entry criteria rather than a promised date.

A complete synthetic example is in `skill/templates/consult.example.json`. To try
it in a source checkout:

```sh
npm run ds-loop -- report fixtures/example-workspace --consult skill/templates/consult.example.json --out scratch/phase-1/example-workspace-report.html
```


### Dashboard: today and saved trends

```sh
npx ds-loop scorecard .
# After a source change, save the next measurement:
npx ds-loop scorecard .
npx ds-loop dashboard .
```

Open `ds-loop-dashboard.html`. `dashboard [path] [--out file.html]` runs a fresh,
unfiltered audit, reads `.ds-scorecard/history.jsonl` from the current directory,
and writes one offline HTML file. It never appends history. With fewer than two
saved rows it shows today alone and the command to record a baseline.

Charts show per-category style tokenization and production shared-component share
per package. Every series has a disclosure with the dates, ratios and coverage of
every run. Missing measurements say “not checked”; they are not zero. An adapter,
configuration or consumers-analysis change breaks the line and says
“instrument changed — not a comparison”. Invalid history suppresses the trend
rather than silently joining rows around missing evidence. Today is separate from
the saved runs. Numeric direction does not establish product quality.

History is matched by source label, as in `scorecard`; labels do not identify full
paths or scan scope. Use a separate working directory/history for unrelated scans
with the same label. Keep the target and configuration consistent between runs.

`ds-loop guard on` refreshes existing dashboards after edits.
The command remembers output paths, targets and explicit `--config` paths locally
in `node_modules/.cache/ds-loop/dashboards.json`. Deleted dashboards are skipped.
Without that cache, the guard refreshes only `ds-loop-dashboard.html` in the
project root, using the project root as its target and normal config discovery.
Refresh failures report that the dashboard may be stale; they do not record history
or erase the hook’s coverage state. There is no watcher or server.

Keep the coverage gate in CI and regenerate the artifact even when the audit fails:

```yaml
- run: npm ci
- name: Check design-system coverage and findings
  run: npx ds-loop audit . --require-coverage
- name: Refresh dashboard
  if: always()
  run: npx ds-loop dashboard . --out artifacts/ds-loop-dashboard.html
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: design-system-dashboard
    path: artifacts/ds-loop-dashboard.html
```

Restore or check out your real `.ds-scorecard/history.jsonl` before regeneration to
include trends. CI generation alone doesn't create baselines. The audit's failure
still fails the job; writing HTML isn't a replacement gate.

Consultation plan steps accept optional `effort` text. Missing effort displays
“not estimated”; the engine does not invent estimates. The report cover uses three
source ratios, and print CSS gives the cover its own page with 18mm margins.

JSON token names retain dotted paths. Tier patterns test the original names and a separator-normalized form; semantic namespaces and reserved terms recognize dotted segments. Configure naming patterns for the source before interpreting tier findings. JSON aliases do not require CSS `var()` fallbacks. SCSS assignment modifiers (`!default`/`!global`) are omitted from the extracted value.


## Documentation, impact and decisions

```sh
ds-loop audit . --target docs --json
ds-loop impact '@example/ui#Button' . --json
ds-loop decide . --decision 'Use the shared Button' --alternatives 'Keep local buttons' --evidence 'packages/ui/Button.tsx:1' --owner 'UI maintainers'
```

Documentation ratios cover detected exported JSX components in shared packages
(with package exports or workspace consumers). Each package reports stories,
adjacent Markdown/MDX pages, prop types/tables and literal usage examples.
`docs/undocumented-shared-component` is low severity and lists components with
neither a matching story nor a page. No detectable documentation convention, no
component denominator, or a file-filtered scan means **not checked**, not zero.
Presence does not establish quality or compliance with a contribution checklist.
Re-export chains, generated or remote docs, inferred types, and HOCs without JSX
are outside this regex analysis; matching uses adjacent source/component basenames.
The JSON includes evidence file:line locations and all ratios.

Impact accepts an exact package subpath, a bare export name, or
`package/subpath#Export`. It includes every direct static import location without
a sample cap, split into production and stories/tests. Export names survive local
import aliases. Re-export chains, dynamic imports, require calls, namespace member
usage, runtime composition, aliases and external consumers are not resolved.
**No static import found** never means **safe to delete**. The unconsumed-subpaths
list retains the broader consumers analysis (including literal dynamic specifiers).

`decide` requires `--decision`, `--alternatives`, comma-separated `--evidence` refs,
and `--owner`. It defaults to today's UTC date and `accepted` status; use
`--date YYYY-MM-DD` or `--status proposed` when appropriate. Optional `--problem`,
`--consequences` and `--reconsider` preserve the governance context. Repeated titles
create separate files; existing records are never replaced. `context` discovers
these as intent sources. A record does not grant approval or configure enforcement.

`report` reads `.ds-scorecard/history.jsonl` from the current working directory,
matching the audited source label. Its adoption section states the period and
recorded-run count, then compares baseline and latest ratios by category/package.
One row is a baseline, not a trend. Any adapter, config, consumer-analysis or
documentation-analysis change in the period prevents a delta. Missing ratios are
not checked, never zero. Labels are not full paths: avoid mixing identically named
sources in one history file. Ratios describe source evidence, not money or time saved.
