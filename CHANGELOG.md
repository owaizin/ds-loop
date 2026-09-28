# Changelog

## Unreleased

- Lead the README with a runnable first audit, supported formats, verified public
  fixture output and visual report examples. Separate CLI commands from agent
  playbooks in the skill. Document 0.3.0 installation and consumers HTML export.

- Consumers counts static JSX component elements by workspace package and shared
  subpath. Shared-component share is shared / (shared + local); external and
  unresolved elements stay outside the ratio, and stories/tests are separate.
  Relative imports, the package's tsconfig `paths` aliases and components
  declared in the same file count as local.
  JSON includes source locations; terminal and HTML show per-package shares.
- Workspace scorecards record per-package shared-component share ratios and the
  consumers analysis version. Changed analysis versions mark the instrument
  moved, including the first comparison with a row predating these metrics.

- Unreleased 0.3.0 JSON stores suggestion candidates and declaration provenance
  once in `suggestionIndex`; use-site `candidateRef` and candidate
  `declarationRefs` retain every ordered record. Matching and terminal output
  are unchanged. HTML embeds the complete indexed payload as offline gzip;
  evidence browsing requires native `DecompressionStream` support.
- Token architecture removes configurable trailing scale steps with
  `architecture.scaleStepPattern` before grouping namespaces. This changes the
  config hash; scorecard comparisons report instrument moved. Fix the use-sites
  lane label escaping.

- Add a generated Token architecture section to `audit --html`, backed by JSON
  declaration/reference evidence. Includes configured tiers, aggregated links,
  token lookup, cycles, mode redeclarations and `architecture.maxAliasDepth`
  (default 4). Cross-file cascade order remains unresolved. The new default
  changes config hashes; the next scorecard comparison reports instrument moved.

Changes planned for 0.3.0; not published.

- `ds-loop consumers [path] [--scope @org] [--json]`: workspace import map. For each
  package, the shared packages it imports with counts, named imports and file:line
  samples; stories and tests counted apart; exported subpaths no other package
  imports in production code.
  `--html <file>` draws it as a UI-architecture diagram: apps in platform lanes,
  the shared packages they import, lines weighted by import count, story-only
  imports dashed, plus an import matrix.

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
