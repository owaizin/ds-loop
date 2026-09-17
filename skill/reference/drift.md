# drift

Agent procedure; no `ds-loop drift` command, watch mode or baseline suppressor
is shipped. Compare two retained unfiltered `audit --json` reports manually.

Establish source scope, revisions/dirty diffs, adapter versions, configuration
hash and coverage for both runs. If the instrument changed, rerun the original
source with the new instrument before attributing a difference to a product edit.

Classify new, resolved and unchanged occurrences. Findings may aggregate many
occurrences; five finding records before and after can still contain one fewer
raw value. Inspect the underlying evidence. Keep unchanged findings visible in
the retained reports; this procedure does not suppress them in `guard`.

Report a regression only against an applicable commitment or preserved behavior.
A newly visible coverage limitation is not itself a product regression.
