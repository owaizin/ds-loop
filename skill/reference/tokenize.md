# tokenize

Agent procedure; no token generator CLI is shipped. Implement a token decision
supported by discovery or an explicit design handoff. Preserve the project's
storage, naming, layers, units and theming unless changing them is the task.

1. Name the consumer and the value/role that needs reuse. Confirm that an existing
   token does not already serve it. A literal is not automatically a new token.
2. Implement the smallest agreed source change. Check aliases, references, theme
   overrides and affected consumers. Retain a deliberate exception when warranted.
3. Add another representation (for example design-token JSON alongside CSS) only
   when a named consumer requires it. If both must stay synchronized, implement
   and run a project-specific parity/reference checker and show it failing on a
   controlled mismatch. DS Loop does not ship one or read design-token JSON.
4. Verify rendered impact where values change, rerun the unfiltered audit, and
   retain the decision and coverage limits as described in the entry skill.

An adopted naming grammar or scale is a project commitment. Proposed names,
storage forms and tier models are design choices, not universal requirements.
Parity checks belong in deliberate CI wiring, never in a supposedly blocking
`PostToolUse` hook. A token rename needs its scoped consumer migration.
