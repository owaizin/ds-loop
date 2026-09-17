# doctor

Agent procedure; no `ds-loop doctor` or `doctor --fix` command is shipped.
Manually reconcile the project's intent records with token sources, config,
retained audit evidence and installed hook.

- Read the actual naming/storage contract, even if there is no `DESIGN-SYSTEM.md`.
- Compare supported config keys with the installed engine's schema/defaults.
  The loader merges defaults; it is not a strict unknown-key validator.
- Use `guard status` to inspect the installed hook and path.
- Check whether retained reports still describe the source, adapters and config.

Report evidence, discrepancies, and bounded proposed repairs. Perform only the
repairs authorized by the task. Never invent a schema migration or claim a
repair command exists. Retain the result where the next task can retrieve it.
