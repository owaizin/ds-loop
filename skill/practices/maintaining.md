# Make the next update understandable

**our own opinion:** Your consumer should be able to tell what changed and what
they need to check before taking an update.

## The practice

Classify compatibility changes before release. Primer React publishes a versioning
table: adding a component is minor, removing one is major, and narrowing a prop
type is major. It also considers changes to landmark roles and prop forwarding;
compatibility goes beyond a renamed import.
[Source: Primer versioning](https://github.com/primer/react/blob/main/contributor-docs/versioning.md).

Publish release notes with the version. Primer React's releases list changes under
release entries, including fixes and breaking changes when applicable.
[Source: Primer React releases](https://github.com/primer/react/releases).

Put changes through maintainer review. Carbon describes issue triage, feedback,
and pull-request review by maintainers before merging code.
[Source: Carbon contribution process](https://carbondesignsystem.com/contributing/get-started/overview/).

## When it is missing

**our own opinion:** Investigate updates with no useful change note, unreviewed
shared behavior, or checks that pass while the documented example no longer builds.
Don't infer consumer safety from a green token audit.

## What to do

**our own opinion:** Apply this maintenance checklist through the governor and
[review](../reference/review.md):

1. Record the public API and behavior affected, the proposed version change, and
   the existing release owner. Honor the project's adopted release policy.
2. Draft a note naming the change, affected consumers, migration guidance and
   verification. Get the existing maintainer's review; don't create a new committee.
3. Run the project's build, examples and relevant behavior checks, plus an
   unfiltered audit. Keep coverage limits with the result.
4. Compare health measurements only with matching scope, adapters and config.
   Check broken docs and unresolved deprecations as well as rule findings.
5. Record who handles follow-up and the next review trigger. A document does not
   install CI, schedule maintenance or authorize publishing a release.
