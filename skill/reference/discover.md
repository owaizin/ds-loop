# discover

Agent procedure; no `ds-loop discover` CLI exists. Determine the next useful
system decision from repository evidence and the user's task, then retain it
where the next task can find it.

## Investigate before interviewing

Read the entry skill's setup and decision states. Inspect relevant instructions,
contribution/foundation docs, decisions, token sources, components, consumers,
and existing checks. Distinguish declared policy, observed behavior, and unknowns.
An absent canonical filename is not an absent system; a named utility resolving
successfully is not permission to use it.

Record only what affects the intervention: storage/naming, theme mechanism,
consumers, source of authority, available verification, and unread surfaces.
Do not generate a framework inventory unless the task needs one.

Ask only for consequential information the repository cannot supply. A human
policy and contradictory implementation may describe intended and current states;
do not automatically let either erase the other. Resolve the conflict explicitly.

## Choose the first deliverable

- No established convention in scope: propose one small foundation for a real
  repeated need, its consumer and acceptance check. Avoid inventing a four-tier
  model, JSON mirror or component registry without a use case.
- Partial system: choose one bounded adoption gap against a documented commitment.
- Existing system: preserve it, configure the scanner where faithful, or state the
  unsupported model. An intentional exception may need only a retained rationale.
- Insufficient evidence: state the missing evidence and the next observation;
  do not force a maturity label or a migration plan.

A component-level task does not require a whole-company discovery exercise.

## Retain the decision

Use the team's existing record format. Include the evidence/authority, chosen
scope, alternatives or no-op considered, actual checks and their limits, and a
condition for revisiting. Name its path and retrieval route in the handoff.
`DESIGN-SYSTEM.md` is an optional home if none exists, not a prerequisite for work.
Its frontmatter is documentation for agents; the engine does not read it as policy.
Engine configuration belongs in a supported ds-loop config file.

Done when the next bounded action is justified and its record is discoverable,
not when every possible context field is filled in.
