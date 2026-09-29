# Give every old consumer a route forward

**our own opinion:** A new library is only part of a migration. Keep the old
consumer working until its replacement has been checked.

## The practice

Stage the prerequisites. Atlassian's token guide sets up theming, updates system
components, then replaces raw values. It calls for testing an experience before
releasing new themes and manual review of codemod suggestions.
[Source: Atlassian token migration](https://atlassian.design/foundations/tokens/migrate-to-tokens/).

Publish the replacement and removal policy. Atlassian says deprecated features
have a replacement and migration guidance, and promises an announced deprecation
period before removing a General Availability feature. It does not prescribe a
universal number of days.
[Source: Atlassian release phases](https://atlassian.design/release-phases).

Document changes that automation can't handle. Primer publishes migration guides
for breaking changes and deprecations that cannot be auto-corrected.
[Source: Primer migration guides](https://primer.style/product/getting-started/react/migration-guides/).

## When it is missing

**our own opinion:** Look for two APIs with no removal owner, a codemod accepted
without review, or “done” based only on a search inside one checkout. External
consumers may still need a supported path.

## What to do

**our own opinion:** Use [transform](../reference/transform.md) and this staged plan:

1. Inventory named consumers and unknown external users. Record the old/new
   mapping, preserved behavior, release owner and rollback route.
2. Prove one bounded slice. Preview a version-appropriate codemod in that slice;
   review its diff and unresolved cases, then test the actual consumer.
3. If both versions must run, keep explicit import or package boundaries. Check
   styles, providers and supported themes together. Dual-running is a temporary
   project choice, not a requirement attributed to Atlassian or Primer.
4. Agree and announce a deprecation window through the authorized owner. Name the
   replacement, affected versions, removal conditions and remaining consumers.
   Choose the window from this project's commitments; don't invent an industry norm.
5. Call the agreed migration complete only when each in-scope consumer is verified,
   docs/examples use the supported path, exceptions have owners, and old code can
   be removed under the release policy. Unresolved external usage limits the claim.
   Record remaining work and rerun the unfiltered audit with its coverage.

Engine boundary: `fix` inserts provable CSS fallbacks. It is not a token-replacement
codemod. `consumers` measures workspace imports and static JSX, not runtime use.
