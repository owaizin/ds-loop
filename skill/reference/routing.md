# routing

Shown when `/ds-loop` is invoked with no command. After read-only setup, present the menu; do not auto-run a build or migration.

## Menu

**Starting from nothing / new to this system**
- `discover` — inspect existing commitments and identify the next bounded decision.
- `census` — inventory the components, find the duplicates.
- `audit` — measure the token layer against the deterministic rules.

**Building**
- `tokenize` — implement the agreed token source and required consumer formats.
- `scaffold` — Storybook spine, foundations pages, the 5-file component contract.
- `extract` — pull a repeated pattern into the system properly.
- `shape` → `review` — interrogate a new component's design, then audit its build.

**Keeping the system's commitments in view**
- `guard on` — install the edit-time hook (Claude Code `PostToolUse`). It reports
  after a write lands and **cannot block**; it is one integration surface, not every
  editor or a shell-written change. CI gating is separate and deliberate: put
  `ds-loop audit --min-severity high` in the pipeline, where exit 1 does the work.
- `drift` — what regressed since the baseline.
- `scorecard` — appends the audit's ratios to `.ds-scorecard/history.jsonl`, so two runs can be
  compared. It records measurements and refuses to call a comparison a delta when the adapters or the
  config moved. It is not a health score and not an entropy measurement.

**Something feels stale**
- `doctor` — manually reconcile intent records, token files, config, and the hook.

## Picking for the user

- Request mentions a single component → `shape` (new) or `review` (existing).
- Request is "audit our tokens" / "is our colour system a mess" → `audit`.
- Request is "we have no design system" → `discover`, then the smallest foundation the evidence supports.
- Request is "stop people breaking the tokens" → `guard on`.
- Request is per-screen visual quality → out of scope here. This engine measures the token layer and
  component structure; it has nothing to say about whether one screen looks good. Say so, and use whatever
  the project already has for that (if [impeccable](https://github.com/pbakaus/impeccable) is installed, it
  covers this ground). Do not hand work to a tool without checking it is there.
