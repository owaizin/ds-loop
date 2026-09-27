# Changelog

## Unreleased

- CSS style inventory adds configuration defaults, changing the config hash for every user on upgrade. When a previous scorecard row exists, the first row after upgrade reports "instrument moved" rather than a delta; it becomes the baseline for subsequent comparisons.
- Audits can suggest value-matched tokens for CSS and markup, preserving alias provenance and ambiguity. Matching uses configured rem assumptions and proximity tolerances; it does not authorize replacement or add a token-replacement fixer.

### Unreleased — upstream layer (A13)

- Optional `taxonomy.upstreamPattern` declares imported tokens before project tier matching. Upstream literal declarations and internal references are accepted; project aliases retain fallback checks. New `token/upstream-bypass` reports components and supported style/markup use sites referencing upstream directly. Palette diagnostics still describe the imported palette; this is not a blanket ignore.
- The default config hash changes even when upstream classification is disabled. The first scorecard row after upgrading reports “instrument moved”, not a comparable delta.
