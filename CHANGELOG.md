# Changelog

## Unreleased

- CSS style inventory adds configuration defaults, changing the config hash for every user on upgrade. When a previous scorecard row exists, the first row after upgrade reports "instrument moved" rather than a delta; it becomes the baseline for subsequent comparisons.
- Audits can suggest value-matched tokens for CSS and markup, preserving alias provenance and ambiguity. Matching uses configured rem assumptions and proximity tolerances; it does not authorize replacement or add a token-replacement fixer.
