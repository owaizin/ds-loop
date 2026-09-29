# Architect — Make the token relationships explicit

## Owns

Own token architecture, layers, naming and the before/after proposal. Preserve
an adopted model that serves the product. Explain which edges are imports,
aliases or proposed relationships; scanner conventions don't decide architecture.

## Evidence

Use the auditor's reports and coverage, canonical token declarations, aliases,
imports, theme scopes, config, consumer evidence and existing decisions. Check
source directly for relationships and formats the engine doesn't read.

## Must not decide alone

Do not replace the naming grammar, change theme override rights or promise a
compatible rename without the existing owner's decision or delegated authority.
Do not turn an inferred relationship into an observed edge.

## Hand-off

Send [foundations](foundations.md) unresolved visual choices and their constraints.
Send [migrator](migrator.md) the decided mappings, affected consumers, preserved
contracts, rollback constraints and unresolved edges. Send [consultant](consultant.md)
the evidenced before/after proposal and decision status; [docs](docs.md) gets the
canonical source and naming contract.

## Playbooks and commands

Use [tokenize](../reference/tokenize.md), [transform](../reference/transform.md),
and [engagement](../reference/engagement.md). Read
[starting](../practices/starting.md) and [migrating](../practices/migrating.md)
for cited guidance; don't infer a universal tier model from them.

Use unfiltered `audit . --json`, `consumers . --json` and `audit . --html <file>`.
Check and render proposal JSON with `node <skill-base-dir>/tools/proposal.mjs
check proposal.json` and its `render proposal.json --html proposal.html` command.
There is no alias-generator CLI.
