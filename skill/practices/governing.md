# Let contributors find the person who can decide

**our own opinion:** A rule without an owner leaves the next contributor guessing
whether to follow it, challenge it or work around it.

## The practice

Make the contribution path visible. Carbon asks contributors to check existing
issues, submit a proposal for triage, iterate with feedback and submit code for
maintainer review. Larger contributions have phased requirements.
[Source: Carbon contribution process](https://carbondesignsystem.com/contributing/get-started/overview/).

Separate experimental work from supported assets. Carbon describes Labs as a
separate home for explorations that have not met its completion criteria.
[Source: Carbon Labs](https://carbondesignsystem.com/contributing/get-started/overview/#carbon-labs).

## When it is missing

**our own opinion:** Look for conflicting instructions, an exception with no reason,
or a rule that nobody can explain. These warrant a decision review, not an
automatic rewrite of every consumer.

## What to do

**our own opinion:** Use the governor with [engagement](../reference/engagement.md)
and [guard](../reference/guard.md) for this decision workflow:

1. Name the existing owner for shared tokens, component APIs, releases and docs.
   Preserve delegated authority. A role file doesn't create a new approval body.
2. Link the contribution route from the developer entry point. Keep small fixes
   small; route shared behavior changes to the appropriate maintainer.
3. Keep a decision record in the team's existing home: problem, evidence, options,
   choice, owner, date, consequences and a trigger to reconsider. Mark proposals
   separately from decisions. This field set is our own opinion.
4. Record exceptions with the affected scope, reason, owner and review trigger.
   Configure any scanner suppression separately, then verify its exact scope.
5. Before adding a rule, record the behavior it protects, a published URL or
   “our own opinion”, known limits, and examples that should pass and fail.
   Have the existing owner choose its enforcement channel. To retire one, record
   why it no longer applies, affected checks/docs, and any replacement or migration.
6. Verify the actual feedback or CI failure path. Keep unjudged behavior visible.
   Retain the decision and tell the consultant what changed and what remains open.

Engine boundary: a `PostToolUse` hook reports after an edit; it cannot prevent it.
A decision record alone neither configures a rule nor suppresses a finding.


When the team uses this repository for decisions, record the authorized choice with:

```sh
ds-loop decide . --decision 'Use shared buttons' --alternatives 'Keep local buttons' --evidence 'packages/ui/Button.tsx:1' --owner 'UI maintainers'
```

Add `--status proposed` for an unapproved option. Include `--problem`,
`--consequences` and `--reconsider` when recording the complete review context.
The command creates a new Markdown file in `docs/decisions/`, with date and owner;
`context` locates that intent source. Read the record before the next shared change.
Keep an existing decision home when the team already has one. Recording a choice
neither grants authority nor configures a rule.
