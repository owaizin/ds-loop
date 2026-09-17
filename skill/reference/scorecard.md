# scorecard

Implemented CLI. Appends one measurement row to `.ds-scorecard/history.jsonl`
in the current working directory; it does not install a CI schedule.

```bash
<skill-base-dir>/bin/ds-loop scorecard . --dry-run --json
<skill-base-dir>/bin/ds-loop scorecard . --json
```

Use the dry run to inspect the row before starting a history. Rows include source
identity, adapters, config hash, ratios, finding counts and coverage completeness.
Compare the actual reported ratios, not invented maturity or component scores.
The CLI checks adapter/config compatibility between rows for the same label;
changes in source scope or dirty working trees still need a retained manifest/diff.

Run from the same project directory for subsequent observations. If the team wants
CI history, arrange its storage/commit policy explicitly. The command is a recorder,
not a findings gate: run `audit` for findings, coverage and CI exit semantics.
Use the full audit to interpret limitations; lower counts do not prove better UX.
