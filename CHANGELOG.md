# Changelog

## Unreleased

Changes planned for 0.3.0; not published.

- Start and audit show coverage and one row per finding group before the compact
  CSS inventory. `audit --all` retains full terminal details; JSON, HTML, rule
  severities, counts, guard behavior and scorecard ratios are unchanged.

- Audit selected ordinary CSS rules with `css-rule-bodies@0.2.0`: literals and
  references across seven categories, per-category severity through
  `style.severity`, and the new `token/raw-value-in-style` rule.
- Add per-category inventory to human and JSON audits: occurrences, distinct
  expressions, tokenization ratios and top files, before finding filters.
- Recognize channel-token colours such as `hsl(var(--x))`, alpha-modulated HSL
  and `rgb(var(--x))` as references. Active literal channels remain mixed;
  unsupported expressions remain ambiguous. `css-custom-props` is now 0.4.0.
- Suggest exact or nearest tokens on CSS and markup raw-value findings. Follow
  alias chains, preserve candidate ambiguity and prefer aliases over primitives.
  Configure rem assumptions and px tolerance under `suggestions`; colour proximity
  uses `clustering.deltaE`. Candidates do not authorize replacement.
- Add `taxonomy.upstreamPattern` and `token/upstream-bypass`. Upstream literals and
  internal references are accepted by project tier/fallback checks; project aliases
  retain fallback requirements. `fix` preserves upstream internals. Palette
  diagnostics still apply to imported tokens.
- Summarize guard findings on unchanged lines; line overlap does not establish
  whether an edit caused or cleared a finding.
- New config defaults change the config hash for every user upgrading from 0.2.1.
  With a previous scorecard row, the first row after upgrade reports
  “instrument moved”, not a delta. It becomes the next comparison baseline.
  Adapter-version changes also prevent comparison; a first-ever row is a baseline.
- Add the skill's nine-step `transform` journey and `foundations` procedure.
  Discovery asks about theming areas and scoped overrides. Preview review checks
  CSS parity with the app; deliverables distinguish observed, inferred, proposed
  and not-checked evidence.
