# Reconcile guidance and tooling

Check what changed since your contract was measured:

```sh
ds-loop doctor .
ds-loop doctor . --json
```

The command reads the target's config, re-measures supported source, and reports:

- Contract drift from the dated measurements in `DESIGN-SYSTEM.md`. Adapter or
  config changes suppress all deltas. Older generated contracts compare their
  recorded counts; new ones also retain sample-qualified ordinary CSS ratios.
  Handwritten or incomplete measurement records are not checked.
- Naming patterns and semantic namespace hints with no matching extracted token
  declaration. CSS name checks include declarations whose values the audit
  cannot classify. This is an observation, not proof that a pattern is wrong. An
  upstream may be external or in a format the adapters cannot read.
- Whether a PostToolUse guard entry is installed and whether its recorded
  project coverage signature matches today's unread formats and token files.
  A matching signature does not prove the hook runs or every rule could judge.
- Cited document/code pairs for a deliberately narrow convention: a standalone
  “All CSS color values must use tokens.” (also “colour”) in root `AGENTS.md`,
  `CLAUDE.md`, `DESIGN-SYSTEM.md`, `STYLEGUIDE.md` or `CONTRIBUTING.md`, paired
  with ordinary CSS color literal findings. Quotes, code fences and comments
  are skipped. Each pair needs a real file and line on both sides.

Doctor writes nothing and always exits 0, including when measurement fails.
It has no repair or build-failure flag. Use `audit --require-coverage` for the
coverage gate. “No pair established” is not a pass on your documentation.

## Agent procedure for the rest

- Read the actual naming/storage contract, even if there is no `DESIGN-SYSTEM.md`.
  Interpret nested guidance, ADR status, scope, exceptions and aspirations;
  the command cannot infer these from arbitrary prose.
- Compare supported config keys with the installed engine's schema/defaults.
  The loader merges defaults; it is not a strict unknown-key validator.
- Use `guard status` to inspect the installed hook and path. Verify execution
  separately; an entry in settings is not proof that its command works.
- Check whether retained reports still describe the source, adapters and config.
  Doctor compares recorded extraction measurements, not every source change or
  every package section in the contract.
- Run `ds-loop audit . --json` unfiltered to inspect coverage and findings.

## Report the differences

Report evidence, discrepancies, and bounded proposed repairs. Pair what a
source says with what code does, citing both. The document may be stale, an
aspiration, or right about a case the audit cannot see. Do not turn the pair
into a verdict about which side is wrong.

Perform only repairs authorized by the task. Never invent a schema migration
or claim a repair command exists. Retain the result where the next task can
retrieve it.
