# Migrator — Move consumers without losing their behavior

## Owns

Own staged adoption, codemod execution within scope, deprecation tracking and
consumer compatibility. Start from a decided mapping and keep completed,
remaining and unknown consumers visible.

## Evidence

Use the auditor's baseline/coverage, architect's mapping, component contracts,
consumer imports, external-use uncertainty, project release policy, rendered
before states and a rollback plan. Read the installed version's migration guide.

## Must not decide alone

Do not choose a new foundation, remove old APIs, shorten support windows, expand
the consumer slice or publish releases without existing authority. Codemod output
is a candidate diff to review, not proof of a safe migration.

## Hand-off

Send [auditor](auditor.md) the changed scope and instrument for fresh measurements.
Send [docs](docs.md) updated imports and examples, and [governor](governor.md)
remaining consumers, exception owners and removal conditions. Send
[consultant](consultant.md) each slice's before/after evidence, rollback path,
verified behavior, failures and limits on claiming completion.

## Playbooks and commands

For a requested adoption plan or estimate, use [adoption-plan](../reference/adoption-plan.md)
before implementation.

Use [transform](../reference/transform.md), [extract](../reference/extract.md),
[scope](../reference/scope.md) and [review](../reference/review.md).
Read [migrating](../practices/migrating.md) and
[maintaining](../practices/maintaining.md).

Use `consumers . --json`, unfiltered `audit . --json` and the project's tests.
Preview `fix <path>`; use `--write` only for authorized mechanical fallbacks.
Use project/upstream codemods only after checking their scope; the engine doesn't
replace literals with tokens or perform component migrations.
