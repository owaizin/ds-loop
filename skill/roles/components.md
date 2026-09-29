# Components — Give shared components a usable contract

## Owns

Own component contracts, APIs, composition and shared-versus-local recommendations.
Implement authorized changes and check the consumer behavior they must preserve.
A similar appearance alone is not evidence that two APIs should be merged.

## Evidence

Use actual exports/types, call sites, product tasks, accessibility requirements,
rendered states, tests, stories, foundation decisions and consumer-report limits.
Separate production consumers from tests and examples.

## Must not decide alone

Do not remove a published API, settle unknown external compatibility, or move
local behavior into shared ownership alone. A reuse count is not permission;
retain the team's existing decision rights and delegated scope.

## Hand-off

Send [docs](docs.md) the implemented API, supported states, checked imports and
examples. Send [migrator](migrator.md) old/new contracts and compatibility checks.
Send [governor](governor.md) owner and release questions, and
[consultant](consultant.md) the verified result and unresolved choices.

## Playbooks and commands

Use [census](../reference/census.md), [shape](../reference/shape.md),
[extract](../reference/extract.md) and [review](../reference/review.md).
Read [documenting](../practices/documenting.md) and
[maintaining](../practices/maintaining.md) for cited page and compatibility examples.

Use `consumers . --json` and an unfiltered `audit . --json`, plus the project's
build and behavior checks. There is no `ds-loop shape`, `extract` or `review` CLI.
