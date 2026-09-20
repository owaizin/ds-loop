# audit

Run the deterministic rule set against a target, verify every finding in context,
present a severity-ranked report. `audit` documents; it does not fix.

## Run it

```bash
<skill-base-dir>/bin/ds-loop audit <fixture-or-source> --target <target> --json
```

Targets: `all` (default), `tokens`, `color`, `spacing`, `typography`, `elevation`,
`motion`. The CLI exits `1` when a finding survives the selected severity floor; strict
coverage can also make it fail. Read the report rather than using exit status alone.

A source can be a live directory/file or a frozen fixture (`SOURCE.json` plus
its recorded files). Keep cwd at the target project so its config loads; a path
argument alone does not change config discovery. Use `--config <file.json>` for
an explicit JSON configuration. Retain the working-tree diff alongside HEAD when
comparing uncommitted changes.

Always inspect `verdict`, `coverage` and findings together. `not-checked` is not
clean, and `clean` is limited to the adapters' declared reads. The CSS adapter
reads custom-property declarations, not ordinary rule bodies; the markup adapter
reads arbitrary-value strings and named colour utilities off the framework palette,
not resolved theme utilities or inline styles.
`--require-coverage` fails on reported gaps; it does not expand those reads.

## The rule set (v0)

| Rule id | Severity | What it means |
|---|---|---|
| `token/raw-value-in-markup` | high | Arbitrary color/length values at markup use sites; investigate against the project's actual convention. |
| `token/stock-palette-utility` | medium | A colour utility naming the framework's own palette (`bg-white`, `text-slate-900`) rather than a theme token. Review against the actual theme contract and rendered modes. Scoped checks without applicable token context report a low-severity judgment limit. |
| `token/tier-model-undetectable` | low | Too few referencing tokens match configured tier patterns; a scanner limitation, not an absent system. Silent at zero references. |
| `token/tier-leakage` | high | A token references across tiers the wrong way — component → primitive skips the semantic tier, or a reference points upward. Check whether that tier model is applicable and whether behavior is affected. |
| `token/semantic-name-describes-appearance` | medium / low | A semantic token named for a colour or size word (`color.action.blue`). Low when every hit is a category / chart-series token (sanctioned — record it in `DESIGN-SYSTEM.md`). |
| `color/semantic-holds-literal` | high | A non-primitive token holds a literal colour instead of `var(--primitive)`. Conflicts with the configured layer assumption; verify the project contract. |
| `token/raw-dimension-in-semantic` | high | A semantic or component token holds a raw length (`16px`, `1rem`, a shorthand) instead of `var(--space-N)`. The other half of `semantic-holds-literal`. Skips primitives, font-weight / z-index / opacity scales, and shadow recipe parts. Bare unitless numbers are not treated as dimensions. |
| `color/literal-duplicate-tokens` | medium | Two+ tokens declare byte-identical values. Usually a semantic layer re-typing a palette value instead of aliasing it. |
| `color/near-duplicate-primitives` | low | Two palette primitives are within the configured ΔE; visual and semantic equivalence still need review. |
| `color/mixed-storage-forms` | medium | Multiple colour storage forms were read. Check whether the mixture is intentional or causes maintenance problems. |
| `color/no-intent-plateau` | low | No ΔE band holds a cluster count near the shipped primitive count. Hand-authored → ramp may be over-fine; generated scale → expected. |
| `token/var-missing-fallback` | low | A `var(--token)` with no `, fallback`. If the token is ever undefined (import order, an unloaded token file, a dropped theme value) the property silently resolves to nothing. SLDS requires a fallback on every reference. A var() after a comma — itself a fallback — is not flagged. |

Severities are overridable per project via `.ds-loop-config.yml` (`severity:`
block, Murphy Trueman `design-system-ops` format) — `tier_leakage: critical` maps
`token/tier-leakage` to `blocking`.

Each rule is `domain/kebab-slug`, stable, and scorecards key on it. `--target color`
also runs the deeper `no-intent-plateau` check; `--target tokens` runs the
structural rules only.

## Verify before you report

Deterministic findings are candidates, not project-policy verdicts. Read the
entry skill's evidence and decision-state procedure first. For each:

1. Open the cited `file:line`. Confirm the value and the token name.
2. Determine whether the finding demonstrates a defect against an applicable
   commitment, a justified exception, or an unsupported assumption. Preserve the
   original report when explaining that interpretation. A static risk sentence
   does not establish that this product has the described harm.
3. If a recorded exception is appropriate, use the team's decision location.
   Documentation alone does not suppress a rule. Supported `config.ignore` entries
   require a reason and exclude matching inputs for the selected rule; check the
   match scope and the report's suppressions. Severity overrides affect whole rules.
   Use the shipped [exception recipe](../../docs/guide/reference.md#recording-an-exception)
   for the config file, selectors and verification steps before inspecting engine
   internals. `tokenContexts` associates palette consumers with declarations; it
   does not suppress vendor findings or replace `ignore`.
4. For a scoped palette check, establish which theme the consumer uses from imports,
   build configuration or team guidance. Add the association through `tokenContexts`
   only when supported by that evidence. See [Scoped checks and token context](../../docs/guide/reference.md#scoped-checks-and-token-context). Context declarations are read only; they do not become
   findings or enter ratios. Other rules still use only the judged files.
   Without an applicable mapping, the palette check reports a judgment limit, which
   stays in `coverage.couldNotJudge` above the severity floor. An unfiltered audit
   of the same scope explains it. Do not associate an unrelated theme to silence it.

`--files` paths are relative to cwd. `--since <ref>` selects committed changes from
that ref's merge base to HEAD in the target repository; it excludes uncommitted
edits. An empty selection remains `not-checked`; invalid comparisons fail. For a
working-tree review, inspect the diff and pass its relevant paths with `--files`.

## Explain the result

State the actual engine verdict (`clean`, `issues`, or `not-checked`) with its
scope and coverage. Then explain the most consequential observations for the
user's requested outcome, distinguishing confirmed defects, review candidates,
exceptions and unchecked behavior. Include actual rule ids, locations, risk and
fix guidance without presenting your judgment as engine output.

Use the report's actual ratios and their denominators when they help the task;
occurrence and distinct counts can explain work scope. Do not invent a health score
or reuse obsolete metric names. Comparable before/after measurements need matching
scope, adapters and configuration, with dirty diffs retained.

Recommend a bounded next action and explain why it addresses the goal. The engine's
`next` commands describe mechanical possibilities; they are not a consulting plan.
Agent procedures such as `tokenize` or `review` are not CLI commands. A review-only
request ends with the diagnosis and next step, not an automatic migration, mandatory
`drift` invocation, or an unrequested scorecard history.
