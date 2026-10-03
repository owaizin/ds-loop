# Consulting delivery improvements

## Git boundary

Worktree: `~/.codex/worktrees/consulting-delivery/ds-loop`
Branch: `codex/consulting-delivery`, based on `cacd072`.
The primary checkout has independent uncommitted assessment, website and component
registry work. This branch excludes that work. Merge only after reviewing overlaps
in routing, transform and consult-html; never replace those files wholesale.

## Delivered so far

- System-review procedure: scoped evidence across eight relevant areas; no aggregate score.
- Adoption procedure and mapping template: verified target API, disposition,
  design/code effort, dependency, acceptance and continuation.
- Discovery asks about the design workflow when relevant; code-only work stays valid.
- Report overview: diagnosis → proposed outcome → first delivery → acceptance.
  Text is supplied by the consultant; the renderer does not infer intent from counts.

## Verification and integration record

- Three scenario walkthroughs are recorded in
  `docs/evaluations/consulting-delivery-2026-10-03.md`. They are author walkthroughs,
  not independent agent or human usability trials.
- Existing routes have explicit artifact, proof and continuation contracts in
  `skill/reference/delivery-contract.md`.
- Normal consulting report integrates the overview directly. Public fixture HTML
  and desktop/mobile/dark screenshots are in `docs/assets/consulting-delivery/`.
- The separate uncommitted assessment renderer is supported through the tested
  patch in `docs/integration/`. It was exercised in a temporary copy against the
  primary checkout's assessment snapshot; six targeted tests pass. Apply the patch
  when merging that package; this branch does not take ownership of its source.
- Chrome checks: 1440px light/dark and 375px, resolved overview links, four cards,
  no horizontal overflow or page errors. Mobile navigation overlap fixed. The
  normal report's printed overview page was visually checked and remains readable.
- Final checks: lint and type-check pass; 374 tests pass; 31 packed smoke checks
  pass with the private-name deny list. No rule output or extraction changes.
- Work is committed on the isolated branch. No push, release or primary-checkout
  merge is part of this delivery. Reconcile the documented overlaps on integration.

## Limits

The overview summarizes the first authored problem and first authored work item;
full evidence and work remain in their linked sections. It is not a new assessment
or an automatic adoption decision. The adoption mapping is an agent artifact in
the team's document home, not an engine-generated inventory. Newcomer usability
and repeatability across independent agent runs remain unproven.

## Guardrails

Original implementation and prose. No imported third-party text or private data.
Preserve rule strings, deterministic engine behavior, coverage and project-specific
architecture choices. Evidence access is not a health grade. Estimates disclose
assumptions; token proximity does not establish interchangeable intent.
