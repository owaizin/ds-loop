# Commands and coverage

Run commands from the target project so configuration resolves from its working directory. Paths select the source to inspect.

## Engine commands

| Command | Result | Writes? |
| --- | --- | --- |
| `context [path]` | Config, conventional intent-source locations, extraction scope; no rules | Only with `--write-contract`, which creates `DESIGN-SYSTEM.md` and never overwrites one |
| `audit [path]` | Findings, ratios, verdict and coverage | Only with `--out <dir>` |
| `scan <path>` | Extracted-value taxonomy and palette clusters | No |
| `sweep <path>` | Clustering curve across the configured ΔE range | Only with `--out <dir>` |
| `scorecard [path]` | Ratios and comparable deltas | Appends `.ds-scorecard/history.jsonl` in cwd; `--dry-run` previews |
| `fix <path>` | Mechanically resolvable `var()` fallbacks | Only with `--write` |
| `guard on\|off\|status` | Claude Code post-edit feedback configuration | `on` and `off` edit `.claude/settings.json` |

`fix` is not an automatic token migration. `scorecard` does not gate CI. `guard` cannot prevent an edit.

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

The skill includes `discover`, `census`, `drift`, `tokenize`, `scaffold`, `extract`, `shape`, `review` and `doctor`. They instruct an agent to investigate or perform a task. They are not CLI commands and their conclusions are not engine findings. See the [skill entry](../../skill/SKILL.md).

## Audit options

Use `--json` for structured output, `--out <dir>` to retain reports, `--target` for a rule domain, `--files a,b` or `--since main` to narrow files, and `--min-severity` to filter findings. Targets are `all`, `tokens`, `color`, `spacing`, `typography`, `elevation` and `motion`. `--require-coverage` makes reported coverage gaps fail too.

The audit exits 1 on surviving findings; without strict coverage, `not-checked` can exit 0. Severity filtering does not remove coverage limits from the report.

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

### Recording an exception

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

The [configuration schema](https://github.com/owaizin/ds-loop/blob/main/src/config/schema.ts) and [defaults](https://github.com/owaizin/ds-loop/blob/main/src/config/defaults.ts) define clustering, taxonomy and sweep settings. Defaults are uncalibrated. Use `sweep` to investigate your source before choosing a clustering cutoff. The `.ds-ops-config.yml` compatibility path reads system context and maps supported severity settings from design-system-ops.

Tailwind JSX adapter 0.4.0 adds numeric opacity modifiers and respects configured
palette families during detection. Re-measure a baseline before comparing it with
0.3.0; extraction counts may change.

## Coverage

| Adapter | Reads | Does not read |
| --- | --- | --- |
| CSS custom properties | Custom-property declarations in `.css` | Ordinary rule bodies and declarations inside at-rules |
| Tailwind JSX | Arbitrary-value strings and framework-palette colour utilities in `.jsx`, `.tsx`, `.js`, `.ts`, `.mjs` | Utilities naming your own theme tokens, arbitrary variants/bracketed opacity, inline style objects, CSS-in-JS |

Sass maps, design-token JSON and other unsupported formats remain outside these adapters. Recognized colors that cannot be converted are reported as ambiguous. A file extension is not a promise of full syntax coverage.

`clean`, `issues` and `not-checked` are different verdicts. Read `coverage.couldNotJudge` even when severity filtering hides the associated finding. `context` runs no rules, and the hook filters at high severity; an unfiltered audit is the channel for all judgment limitations.

## Rules


Twelve deterministic rules examine supported extracted values. Interpret their
findings against the applicable project contract and the report's coverage.

| rule | severity | catches |
| --- | --- | --- |
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

Route them with `--target color|tokens|spacing|typography|elevation|motion`, narrow with `--files a,b` or `--since main`, raise the floor with `--min-severity high`.


## Limits of the result

A finding is evidence to investigate, not proof of design intent. Ratios describe extracted code, not system maturity. The engine does not observe rendered behavior, accessibility, user comprehension or product outcomes. It uses regex-based extraction with documented ceilings.

[Example reports](output.md) · [Back to the guide](README.md)
