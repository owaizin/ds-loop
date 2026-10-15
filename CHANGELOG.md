# Changelog

## 0.4.0 — 2026-10-15

- Guided delivery: evidence-scoped system reviews, adoption mappings with separate
  design/code estimates, and explicit route completion criteria.
- Consulting report: a big-picture view connects the diagnosis, proposed outcome,
  first delivery and planned verification without treating a plan as completed work.

- Assessment delivery: validated evidence, proposed work packages and an integrated
  delivery overview; component-registry guidance and an optional Storybook Architect handoff.
- Distribution: Claude Code marketplace installation and update instructions;
  package, plugin, skill and CLI release versions are checked together.
- Reports: embedded Inter and Manrope fonts now carry OFL notices in the package
  and exported HTML. Unverified decorative images are replaced with CSS gradients.
- Public precision snapshots and static-import reachability retain source scope
  and limitations. Website maintenance now lives in the separate website repository.

This is the first npm release since 0.2.1. The 0.3.0 section below records an
intermediate development milestone, not a previously published npm release.

### Engine, reports and agent workflow

- First run: bare `ds-loop` and `start` save `ds-loop-report.html` when no report
  or `.ds-scorecard/` exists. The compact reading points to findings, coverage and
  the agent's consulting work. Existing reports are preserved; findings still
  exit 1 and not-checked sources remain explicitly not checked.
- Packaging: Claude Code plugin manifest and post-edit hook, shared Codex skill
  entry, bundled roles, practice guides and benchmark data. Packed smoke checks
  exercise the first report, explicit report, dashboard and plugin hook.
- Phase 1: offline consulting reports combine measured findings and architecture
  with optional validated `consult.json`: problems, cited practices, proposed
  state and ordered plan. Missing advice stays visibly unwritten. Plain-language
  summaries preserve precise rule IDs, JSON and detailed output.
- Phases 1b–2: report cover, print layout, side-by-side architecture proposals and
  shared visual styling; offline dashboard with current state and saved scorecard
  trends. Missing baselines and instrument changes prevent misleading comparisons.
  The guard refreshes existing dashboards without adding history rows.
- Phases 3–3b: team-shape evidence and product/system benchmark selection, with
  explicit overrides. Reference dimensions retain denominators and coverage;
  minimum sample and contributor policies suppress unsupported ranges. Corpus
  collection and public precision gates remain incomplete; this release does not
  claim calibration or industry grades.
- Phase 4: eight specialist roles and six cited practice guides for starting,
  maintaining, migrating, documenting, Storybook and governance. Handoffs retain
  scope and authority; uncited recommendations are labelled “our own opinion.”
- Phase 5: DTCG/Style Dictionary JSON and bounded SCSS/Sass adapters, with aliases,
  provenance and unsupported expressions surfaced. These are not Sass evaluation
  or full DTCG composite support; Vue/Svelte and CSS-in-JS remain unsupported.
- Phase 5b: shared keyword and generic-font exclusions across all five adapters,
  including mixed values. Keyword components stay visible without inflating
  tokenization denominators. CSS custom properties 0.6.0, CSS rule bodies 0.3.0,
  Tailwind JSX 0.5.0, token JSON 0.2.0 and SCSS/Sass 0.2.0 change attribution;
  comparisons with earlier adapters report instrument moved.
- Phase 6: bounded shared-component documentation coverage, direct static import
  impact lookup, owner-attributed decision records discovered by `context`, and
  adoption reports from comparable saved runs. Presence is not documentation
  quality; zero imports is not permission to delete. Consumers analysis 0.3.0
  and documentation instrumentation also break incompatible comparisons.


## 0.3.0 — 2026-09-28

Highlights: plain-CSS auditing, token suggestions, a visual HTML report (audit and
token architecture), `ds-loop consumers` with a UI-architecture diagram and
shared-component share per app, a proposal renderer in the skill, summary-first
terminal output, much faster audits, and a README that leads with a runnable first
audit and real output.

- `audit --html <file>` writes a self-contained visual report of the same audit:
  verdict beside coverage, severity bar, category comparison, top files, finding
  cards and token-suggestion tables. Generated from the audit data; no network.
- Token suggestions only offer tokens of the property's category (a font size is
  never offered a shadow offset). Unitless values (font-weight, line-height,
  z-index) match within their own role. Human output shows the best three
  candidates; --json keeps all. `css-custom-props` is now 0.5.0.
- Audits are about 20x faster on large repositories; results are unchanged.
- The skill ships `tools/proposal.mjs`: proposals and architecture changes are
  written as JSON and rendered to one offline page where every box and link is
  labelled observed, inferred, proposed or not checked. `check` rejects
  unsupported observed claims and links without a stated meaning.
- The README and foundations playbook link the open ds-kit (MIT).

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

- JSON stores suggestion candidates and declaration provenance
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
