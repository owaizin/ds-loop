# extract

Pull a repeated pattern out of consumer code into the system as a component that
matches the project's own component contract, then migrate the call sites.

**This document is the whole implementation** — a playbook you execute, with no
engine command behind it. Anything reported from it is your reasoning, not a
deterministic finding.

Component extraction is well-trodden ground; this playbook's only contribution is
sequencing it against the evidence `audit` and `census` produce. Where the project
already has an extraction process, follow that one.

## Steps

1. **Discover the system.** Component organisation, naming conventions, token
   structure, import/export conventions. If no system exists, stop — run
   `discover` and `tokenize` first.
2. **Confirm the pattern earns extraction** — used 3+ times with the *same intent*.
   Two lookalikes with different purposes stay separate.
3. **`shape`** the component API from the real call sites. What varies across them
   is the variant/prop surface; what is constant is the default.
4. **`scaffold component`** — the files the project's contract requires. The
   five-file contract in [scaffold.md](scaffold.md) is one such contract, adopted
   by projects that want it; read the target's existing components before assuming
   its shape.
5. **Migrate** every call site to the shared version. Test visual + functional parity.
6. **Delete** the old implementations. Update the registry `usedIn`.

## NEVER

- Extract a one-off without generalising it.
- Make a component so generic it is useless.
- Create a token for every value — tokens carry semantic meaning.
- Skip the migration and leave two implementations live.
