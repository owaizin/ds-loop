# Inventory components and consumers

Agent procedure; no component scanner/clusterer CLI is shipped. Use when a scoped
inventory will answer the user's question, not as mandatory onboarding overhead.

1. Define the relevant packages and consumer area. Identify component entry points,
   re-exports, local wrappers and generated/vendor code. Explain exclusions.
2. Record component source, intended job, known consumers, owner if known, and useful
   docs/tests. Distinguish source files, exports and component concepts; import counts
   are not runtime usage. Mark incomplete or sampled coverage.
3. Group possible overlap by behavior and intent, then verify representative uses.
   Similar appearance, names or props do not establish interchangeability. Check
   accessibility, data, permissions and platform-specific obligations before sharing.
4. Recommend preserve, improve discovery, extend, share, or investigate. Prioritize
   demonstrated user/contributor pain and consumer reach alongside effort, compatibility
   risk and uncertainty. Do not multiply proxy counts into an invented value score.

Use an adopted team reuse threshold if applicable. Otherwise judge the maintenance
tradeoff and real consumer needs; a fixed occurrence count neither requires nor
forbids abstraction. A candidate list is not a migration authorization.

Done when the requested scope has a traceable inventory and actionable dispositions,
with uninspected areas stated. Put it in the team's existing task/reference. Use
[extract](extract.md) only for a justified and authorized shared change.
