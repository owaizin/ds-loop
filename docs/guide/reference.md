# Commands and coverage

Run commands from the target project so configuration resolves from its working directory. Paths select the source to inspect.

## Engine commands

| Command | Result | Writes? |
| --- | --- | --- |
| `context [path]` | Config, conventional intent-source locations, extraction scope; no rules | No |
| `audit [path]` | Findings, ratios, verdict and coverage | Only with `--out <dir>` |
| `scan <path>` | Extracted-value taxonomy and palette clusters | No |
| `sweep <path>` | Clustering curve across the configured ΔE range | Only with `--out <dir>` |
| `scorecard [path]` | Ratios and comparable deltas | Appends `.ds-scorecard/history.jsonl` in cwd; `--dry-run` previews |
| `fix <path>` | Mechanically resolvable `var()` fallbacks | Only with `--write` |
| `guard on\|off\|status` | Claude Code post-edit feedback configuration | `on` and `off` edit `.claude/settings.json` |

`fix` is not an automatic token migration. `scorecard` does not gate CI. `guard` cannot prevent an edit.

## Agent procedures

The skill includes `discover`, `census`, `drift`, `tokenize`, `scaffold`, `extract`, `shape`, `review` and `doctor`. They instruct an agent to investigate or perform a task. They are not CLI commands and their conclusions are not engine findings. See the [skill entry](../../skill/SKILL.md).

## Audit options

Use `--json` for structured output, `--out <dir>` to retain reports, `--target` for a rule domain, `--files a,b` or `--since main` to narrow files, and `--min-severity` to filter findings. Targets are `all`, `tokens`, `color`, `spacing`, `typography`, `elevation` and `motion`. `--require-coverage` makes reported coverage gaps fail too.

The audit exits 1 on surviving findings; without strict coverage, `not-checked` can exit 0. Severity filtering does not remove coverage limits from the report.

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

The [configuration schema](https://github.com/owaizin/ds-loop/blob/main/src/config/schema.ts) and [defaults](https://github.com/owaizin/ds-loop/blob/main/src/config/defaults.ts) define clustering, taxonomy and sweep settings. Defaults are uncalibrated. Use `sweep` to investigate your source before choosing a clustering cutoff. The `.ds-ops-config.yml` compatibility path reads system context and maps supported severity settings from design-system-ops.

## Coverage

| Adapter | Reads | Does not read |
| --- | --- | --- |
| CSS custom properties | Custom-property declarations in `.css` | Ordinary rule bodies and declarations inside at-rules |
| Tailwind JSX | Arbitrary-value strings and framework-palette colour utilities in `.jsx`, `.tsx`, `.js`, `.ts`, `.mjs` | Utilities naming your own theme tokens, inline style objects, CSS-in-JS |

Sass maps, design-token JSON and other unsupported formats remain outside these adapters. Recognized colors that cannot be converted are reported as ambiguous. A file extension is not a promise of full syntax coverage.

`clean`, `issues` and `not-checked` are different verdicts. Read `coverage.couldNotJudge` even when severity filtering hides the associated finding. `context` runs no rules, and the hook filters at high severity; an unfiltered audit is the channel for all judgment limitations.

## Rules


Twelve. Every one deterministic, and every one returns nothing when that slice of your system is clean.

| rule | severity | catches |
| --- | --- | --- |
| `token/tier-leakage` | high | a token referencing the wrong tier — component → primitive skips, upward references. Breaks theme propagation. |
| `color/semantic-holds-literal` | high | a semantic token holding a literal colour instead of `var(--primitive)` |
| `token/raw-value-in-markup` | high | a component hardcoding a colour or length at the use site — `bg-[#1da1f2]`, `p-[13px]`. Names the token that already carries the value when one does. |
| `token/raw-dimension-in-semantic` | high | a semantic or component token holding a raw `16px` / `1rem` instead of a spacing / type primitive |
| `token/semantic-name-describes-appearance` | medium / low | a semantic token named for a colour or size (`color.action.blue`) — a primitive with extra steps. Low when only category / chart tokens. |
| `token/stock-palette-utility` | medium | a use site naming the CSS framework's palette — `bg-white`, `text-slate-900` — instead of a theme token. Theme-blind: it renders the same value in every mode. Silent when the run read no theme colour tokens. |
| `color/literal-duplicate-tokens` | medium | N tokens declaring byte-identical values — the semantic layer re-typing the palette |
| `color/mixed-storage-forms` | medium | hex + hsl-channels + rgb in one source |
| `color/near-duplicate-primitives` | low | two primitives within one just-noticeable ΔE |
| `color/no-intent-plateau` | low | a palette with no ΔE knee at the count the humans shipped |
| `token/tier-model-undetectable` | low | your token names match no tier convention, so the tier check **could not run** — reported because silence would read as a pass |
| `token/var-missing-fallback` | low | a `var(--token)` with no fallback — resolves to nothing the moment that token is undefined |

Route them with `--target color|tokens|spacing|typography|elevation|motion`, narrow with `--files a,b` or `--since main`, raise the floor with `--min-severity high`.


## Limits of the result

A finding is evidence to investigate, not proof of design intent. Ratios describe extracted code, not system maturity. The engine does not observe rendered behavior, accessibility, user comprehension or product outcomes. It uses regex-based extraction with documented ceilings.

[Example reports](output.md) · [Back to the guide](README.md)
