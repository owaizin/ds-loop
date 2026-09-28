# Tokenize an agreed foundation

Agent procedure; no token generator CLI is shipped. Implement a decision supported
by discovery or an explicit handoff. Preserve existing names, storage, units and
modes unless changing them is the task. For whole-system setup, [establish](establish.md)
defines the broader deliverables; a token edit does not complete that assignment.

## Map the layers before editing

The three-layer delivery pattern fits the existing Palette → Semantic → Component
→ State model; it does not replace it:

| Delivery layer | Four-layer model | Responsibility |
|---|---|---|
| 1. Upstream values | Supplies palette/primitive values; an adopted upstream may also expose its own roles | Retain the chosen source's values, licence, version and internal relationships. Independently derived primitives need a recorded derivation. |
| 2. Project aliases with fallbacks | Semantic | Name the project's roles; reference upstream values or local primitives, with a fallback appropriate to the supported mode. |
| 3. Components consume project aliases | Component and State | Reference project roles. Add component tokens only for a real local contract; state variants use the project's existing structure. |

State is a design-model layer, not a separately checked engine tier. Local
primitives can remain local; calling every declaration upstream would hide project
policy errors. Configure `taxonomy.upstreamPattern` only for the adopted source's
namespace, and `semanticNamespaces` / `componentPattern` for actual project naming.
Upstream matching takes precedence. Never include aliases in that pattern.

For example, when only `--ds-*` belongs to an adopted source:

```json
{"taxonomy":{"upstreamPattern":"^--ds-"}}
```

```css
:root {
  --ds-blue-9: #2457c5; /* invented upstream value */
  --color-action-background: var(--ds-blue-9, #2457c5);
  --app-button-background: var(--color-action-background, #2457c5);
}
.button { background: var(--app-button-background, #2457c5); }
```

These are illustrative names and values, not a required grammar. Upstream literals
and internal references without fallbacks are exempt. A project alias referencing
upstream without a fallback is still reported; components/use sites referencing
upstream directly get `token/upstream-bypass`. Verify configuration on representative
references; do not change naming merely to obtain a clean audit.

## Implement and verify

1. Name the consumer and role that needs reuse; check existing tokens first. For a
   full foundation, account for color (text, backgrounds, links, borders, interactive
   states, status), spacing (an initial scale of at least eight steps), typography
   (families, sizes, weights, line heights, tracking), radius, elevation, z-index,
   motion (durations and easing), breakpoints, opacity and border width. Retain a
   smaller adopted scale when it serves the product; state that decision rather than
   padding it. A scoped change need not introduce unrelated categories.
2. Implement the agreed source and alias mappings, including theme/density overrides
   and reduced-motion behavior where relevant. Fallbacks are part of that decision:
   a light-only fallback is not automatically safe in dark mode. Do not copy literals
   into project role tokens where a reference preserves the relationship.
3. Use `audit . --json` suggestions to inspect exact/nearest candidates and ambiguity.
   Check role, mode and consumers before replacing a literal; equal values do not
   imply equal purpose. Preview `fix .` for mechanically provable fallback edits;
   use `--write` only within authorized scope. It does not replace literals with
   tokens. Alias generation (`map`, A6) is **not yet available**; write mappings
   explicitly and check their references.
4. Add another format only for a named consumer. When CSS and JSON both ship, reuse
   or implement a project parity/reference checker and demonstrate a controlled
   mismatch failing. The engine does not read design-token JSON or provide parity
   checks. Preserve native units and text scaling where relevant.
5. Verify changed consumers in their supported modes; rerun the unfiltered audit.
   Record intentional exceptions, source/config/coverage, rendered checks and the
   decision home using [engagement](engagement.md). A rename includes its authorized
   consumer migration. Separate deliberate CI checks from post-edit hook feedback.
