# ds-loop

**Your design system says one thing. Your code says another.** ds-loop finds every place they disagree — with the file and the line — then stops new ones getting in.

No LLM. No API key. No network. No runtime dependencies. It's arithmetic, so it gives you the same answer twice.

```bash
npx ds-loop audit .
```

## The problem

Most of your CSS is written by an agent now. When one can't find the right token, it writes the value straight into the component — `bg-[#1da1f2]`, `p-[13px]`. It ships. It looks correct. Your token layer quietly stops being the source of truth.

Nobody counts it, so "how much work is the rebrand?" gets answered with a guess, and the guess is always low.

Then a team spends a sprint cleaning it up, and three months of agent-written PRs put it back.

## The fix

Three commands, in the order you'll use them.

**1. Get the number.** Read-only, seconds, no config:

```bash
npx ds-loop audit .            # this directory
npx ds-loop audit src/         # or a subtree, or a single .css file
npx ds-loop audit . --json     # for CI
```

It exits `1` when it finds something, so it drops straight into a pipeline.

**2. Watch the number move.** `scorecard` appends one row of ratios to
`.ds-scorecard/history.jsonl` and prints the change since the last run:

```bash
npx ds-loop scorecard .
```

```
  since 2026-08-14

    literal-colors-per-distinct    2 → 1  ▼ 1
    colors-per-distinct-in-scope   2 → 1  ▼ 1

  by rule
    color/semantic-holds-literal                 4 → 0  ▼ 4
    color/literal-duplicate-tokens               1 → 0  ▼ 1
```

A delta is only called a delta when the adapters **and** the config match on both
sides. Change either and it says so — the instrument moved, not your code. That
guard exists because a colour-parsing fix once silently invalidated every
measurement taken before it.

**3. Fix what's provable.** `fix` applies only the edits the code already proves — no judgement, no model:

```bash
npx ds-loop fix . --write
```

**4. Decide what a green build means.** Exit 0 says "no findings" — never
"sufficiently checked". Ask for the stronger claim explicitly:

```bash
npx ds-loop audit . --min-severity high --require-coverage
```

That exits 1 when part of the source could not be read or judged, so a passing
pipeline means checked *and* clean. It is opt-in because it would otherwise fail
every repository containing one `.scss` file.

**5. Hold the line.** `guard` writes a `PostToolUse` hook into `./.claude/settings.json`. After any edit to a `.css`, `.jsx`, or `.tsx` file, ds-loop audits that one file and prints `high`+ findings to stderr — so the agent that wrote the problem hears about it while it still has the context to fix it:

```bash
npx ds-loop guard on
```

Silent on a clean save. Silent on files it doesn't read. **Never blocks** — a `PostToolUse` hook fires after the write lands, so it nags, it doesn't gate. `guard off` removes the ds-loop entry and leaves every other hook, permission, and setting alone.

> This is the one that matters. An audit tells you where you stand. The hook is what keeps you there after the cleanup sprint ends.

## What it tells you

Real output, verbatim, from the public Radix fixture in this repo — run
`npx ds-loop audit fixtures/radix-colors` and you get exactly this:

```
  ds-loop audit — Radix Colors  ·  target: all  ·  fixture
  version npm:@radix-ui/colors@3.0.0   adapter css-custom-props@0.3.0   config 4cdd7f44
  11 rules run

  [LOW] color/near-duplicate-primitives
    20 pair(s) of palette primitives are within ΔE 2.3 — below a reliable
    just-noticeable difference
    where: --amber-1 ≈ --blue-1 (ΔE 2.252285); --amber-1 ≈ --green-1 (ΔE 1.956419);
           --amber-1 ≈ --red-1 (ΔE 1.652821); --blue-1 ≈ --blue-2 (ΔE 2.127851) …
    fix:   Confirm each pair is a deliberate ramp step. Collapse the ones that are not.

  [LOW] color/no-intent-plateau
    no ΔE band holds a cluster count within 15% of the 72 shipped primitives
    where: swept ΔE 0.5–12

  2 findings — 0 blocking · 0 high · 0 medium · 2 low

  scope — what this audit read
    css-custom-props@0.3.0
      reads .css — custom-property declarations (--token: value) — not rule bodies
    72 colour value(s) this version cannot convert:
      color(display-p3 0.995 0.992 0.985), color(display-p3 0.994 0.986 0.921) …
      excluded from every colour rule — a gap in the engine, not in your code

  scorecard ratios
    literal-colors-per-distinct  1
    colors-per-distinct-in-scope 1
    ambiguous-share              0.5
```

A source it cannot read is reported as **`not-checked`**, never as clean:

```
  ✗ not checked — no adapter reads any styling format found here.

  scope — what this audit read
    not read at all: 1× .vue, 1× .scss — no adapter handles these
    formats present: 1× .vue, 1× .scss

  This is not a clean result. Nothing was judged.
```

Three outcomes stay distinguishable — nothing to read, nothing that *can* be read,
and read-but-unjudgeable — because a linter whose silence is ambiguous is worse than
no linter. And a severity floor can hide a finding but never the fact that a check
could not judge: the guard runs at `--min-severity high`, which is exactly where
losing that would do the most damage.

That last section is the honest part. Radix ships 72 sRGB entries **and** 72
`color(display-p3 …)` entries, and ds-loop can only convert the first set — so it
says so, instead of reporting a clean palette it only half read. **A clean verdict
is only as wide as its coverage, so the width ships with the verdict.**

Now a drifting one. Given a `tokens.css` that declares `--palette-blue-500: #1da1f2`
and a component that writes the hex straight into the markup:

```
  [HIGH] token/raw-value-in-markup
    3 hardcoded value(s) at use sites bypass the token layer
    (1 colour, 2 length; 3 distinct, 1 already declared as a token)
    where: bg-[#1da1f2] at Card.tsx:2; p-[13px] at Card.tsx:2; text-[14px] at Card.tsx:3
    fix:   #1da1f2 is already --palette-blue-500. Swap those first.
```

Two things to notice. Every finding carries a `file:line`, which makes it a work
item instead of an opinion. And where one of your tokens already holds that value,
the fix **names the token** — that's a swap, not a design decision.

Then it tells you what it could not read:

```
  scope — what this audit read
    css-custom-props@0.2.0
      reads .css — custom-property declarations (--token: value) — not rule bodies
    tailwind-jsx@0.2.0
      reads .jsx .tsx .js .ts .mjs — Tailwind arbitrary values inside string
      literals — not inline style objects, not CSS-in-JS
    not read at all: 19× .html — no adapter handles these
    could not judge: token/tier-model-undetectable — see the finding for why
```

**A clean result is only as wide as its coverage**, so the tool states the width.
"The file was opened" is not "the file was covered" — and a colour it cannot
convert is reported as unconvertible rather than quietly dropped. That section
exists because 76 `oklch()` tokens in a real design system, and 72
`color(display-p3 …)` entries in this repo's own control fixture, were invisible
for the tool's entire life while it reported those sources as nearly clean.

The ratios are ratios on purpose: counts grow with your codebase, ratios don't, so
two runs a month apart are comparable.

Neither ratio is a maturity score, and it is worth knowing why.
`literal-colors-per-distinct` counts declarations against distinct values across
the whole source, so a light/dark theme pair inflates it for free — a maintained
design system measured [redacted] against an ungoverned SaaS repo's 1.486.
`colors-per-distinct-in-scope` takes the same measurement inside each selector
scope, which removes the theme count but is blind to duplication spread across
files. Read both as descriptions of shape, not as grades.

## Why it exists

> Of 20 open-source design systems surveyed in July 2026, **7 tell contributors not to hardcode a value a token already covers. All 7 say it in prose. None of them check it.**
> — [State of AI in Design Systems](https://github.com/kaelig/state-of-ai-in-design-systems), CC BY 4.0

That's the wedge. The rule is already written down across the industry, in English, in a `CONTRIBUTING.md` nobody greps. Prose commitments decay silently; the ones that hold are the ones something verifies.

Individual rules are sourced the same way, in a comment next to the rule: `token/raw-dimension-in-semantic` is [Fluent UI's rule #1](https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md), `token/var-missing-fallback` is a [Salesforce SLDS](https://github.com/salesforce-ux/design-system-2-starter-kit) requirement.

## The rules

Eleven. Every one deterministic, and every one returns nothing when that slice of your system is clean.

| rule | severity | catches |
| --- | --- | --- |
| `token/tier-leakage` | high | a token referencing the wrong tier — component → primitive skips, upward references. Breaks theme propagation. |
| `color/semantic-holds-literal` | high | a semantic token holding a literal colour instead of `var(--primitive)` |
| `token/raw-value-in-markup` | high | a component hardcoding a colour or length at the use site — `bg-[#1da1f2]`, `p-[13px]`. Names the token that already carries the value when one does. |
| `token/raw-dimension-in-semantic` | high | a semantic or component token holding a raw `16px` / `1rem` instead of a spacing / type primitive |
| `token/semantic-name-describes-appearance` | medium / low | a semantic token named for a colour or size (`color.action.blue`) — a primitive with extra steps. Low when only category / chart tokens. |
| `color/literal-duplicate-tokens` | medium | N tokens declaring byte-identical values — the semantic layer re-typing the palette |
| `color/mixed-storage-forms` | medium | hex + hsl-channels + rgb in one source |
| `color/near-duplicate-primitives` | low | two primitives within one just-noticeable ΔE |
| `color/no-intent-plateau` | low | a palette with no ΔE knee at the count the humans shipped |
| `token/tier-model-undetectable` | low | your token names match no tier convention, so the tier check **could not run** — reported because silence would read as a pass |
| `token/var-missing-fallback` | low | a `var(--token)` with no fallback — resolves to nothing the moment that token is undefined |

Route them with `--target color|tokens|spacing|typography|elevation|motion`, narrow with `--files a,b` or `--since main`, raise the floor with `--min-severity high`.

## What it reads

| adapter | recognises |
| --- | --- |
| `css-custom-props` | `--token: value` in any `.css` — hex, `rgb()`, `hsl()`, `oklch()`, and bare HSL channel triples |
| `tailwind-jsx` | Tailwind arbitrary values in JS/TS — `bg-[#1da1f2]`, `hover:p-[13px]`, `text-[color:var(--x)]`. It reads string literals, so `className`, `cn()`, `clsx`, `cva` and tagged templates all work. |

Every matching adapter runs, not the first. Your tokens live in `.css` and get bypassed in `.tsx`, and half that picture isn't an audit.

Sass maps, styled-components, and design-token JSON aren't read yet. Each is one adapter, and [the interface](src/adapters/types.ts) doesn't move.

## How it thinks

**Every tuned number is config.** `clustering.deltaE`, `primitivePattern`, `componentPattern`, `reservedSemanticTerms`, `shadowAlphaCeiling` — each ships with an `UNCALIBRATED` default, because the right ΔE cutoff for your palette is *discovered* by `npx ds-loop sweep .`, never assumed. Nothing outside `src/config/` hardcodes a threshold.

**Every value carries its provenance:** `file · line · selector · property · tokenName · classification · reason · fixtureSha · adapterId · adapterVersion`. So when a number moves between two runs, you can tell whether your code changed, the adapter changed, or a threshold changed. Reconstructing that after the fact is impossible. It's cheap now.

**A colour it can't convert gets flagged, never dropped.** `lab()`, `lch()`, `hwb()` and `color(display-p3 …)` come back as `ambiguous` with a reason, because a silently discarded colour is a false negative and those are the expensive kind. Found the hard way: 76 `oklch()` tokens in one design system read as "not a colour" and vanished from every rule at once. oklch is parsed properly now.

**The taxonomy is an opinion, and it's inspectable.** Whether `rgba(0,0,0,.06)` inside a shadow is a colour or part of an elevation recipe is a judgement call. ds-loop makes one, prints its reason beside the value, and surfaces the ambiguous set for a human. Disagree, and override the hint in config.

**It reads the config you already have.** Running [Murphy Trueman's `design-system-ops`](https://github.com/murphytrueman/design-system-ops)? Point ds-loop at the same `.ds-ops-config.yml` — the `system:` block seeds context, the `severity:` block maps onto ds-loop rule severities. That pack is 40 LLM skills for governance and communication; ds-loop is the deterministic instrument it doesn't have. They compose.

## What it can't do

- It can't tell you your users are happier. That needs research, not a linter.
- It can't price your rebrand — only measure the surface one has to touch.
- It can't see a rendered screen. **impeccable operates on screens; ds-loop operates on the system behind them.**
- The rules are regex, not a CSS parser. Where that leaves a known ceiling, a `ponytail:` comment in the source names it.
- The thresholds here are neutral starting points, not recommendations. Sweep your own palette before trusting one.

## Development

A git checkout runs the TypeScript directly — no build step:

```bash
npm install
npm run ds-loop -- audit fixtures/radix-colors
npm test          # 19 tests; CIEDE2000 verified against Sharma et al.
npm run check     # biome
```

The published package ships compiled JS (`npm run build`, wired to `prepack`) because Node won't strip types under `node_modules`. Zero runtime dependencies either way.

A **fixture** is a frozen snapshot of one source's token files plus a `SOURCE.json` recording exactly what was copied and from where — never a live checkout. That's what makes a measurement reproducible by a reader. Public fixtures here are open-source systems anyone can verify; client fixtures stay in a private calibration repo, with the tuned cutoffs and the before/after corpus behind them.

CI runs the checks, then sweeps every public fixture — so a change that moves ΔE clustering shows up as a changed curve.

## License

MIT.
