# Choose and adapt foundations

Agent procedure for a foundation decision, with or without a kit. Use the goal and
constraints already gathered by [discover](discover.md). A kit is optional input,
not an npm dependency, required purchase or substitute for product judgment. The
open [ds-kit](https://github.com/owaizin/ds-kit) (MIT) is one such kit; clone it only
when the team agrees to consider its options.

## Compare the options

1. Recover product type, density, audience, brand constraints, supported platforms
   and modes. Inspect representative content and the existing upstream before
   asking for missing context. Focus on unknowns that change the recommendation.
2. Read a candidate's values, rationale, when to use / when not, source and licence.
   If a kit is available, inspect the option README, CSS, JSON and spec; verify its
   actual files and recorded checks rather than assuming every folder has content.
   Preserve required attribution. A licence register or numerical check alone does
   not establish suitability for this product.
3. Present two or three viable choices for the decision, including keeping the
   current foundation where appropriate. Compare fit, tradeoffs, migration reach
   and maintenance; recommend one. Use the same representative composition/content
   for comparisons. A specific authorized choice needs validation, not a forced
   alternatives exercise. Resolve consequential shared choices with the existing
   decision owner; honor authority already delegated to the agent.
4. Adapt the chosen option while retaining its logic. A hue change preserves step
   roles, then rechecks foreground/background and on-fill contrast in every mode.
   A type change rechecks role hierarchy, leading and real font metrics; a spacing
   change preserves scale ordering and density mappings. Also check native units,
   reduced motion and focus on the actual surfaces when applicable. Re-run available
   self-checks and inspect rendered consumers. Record unchecked platforms explicitly.
5. Retain the decision before dependent migration. Use the team's record format;
   if none exists, `decisions/NNNN-<foundation>.md` is a possible home. Link it from
   the contributor entry point and the affected spec. Then use [tokenize](tokenize.md)
   and [scaffold](scaffold.md) to implement and document the authorized scope.

## Decision fields

Keep these fields in the existing record; no new registry is required:

- **Status / owner:** proposed or decided, who decided and when; delegated authority
  counts. An agent recommendation is not a client decision.
- **Problem and evidence:** consumer impact, relevant source/rendered evidence and
  coverage limits; distinguish observed facts from inferred impact.
- **Options / choice / why:** chosen source revision and licence, adopted values or
  derivation, rejected alternatives and the reason for adapting anything.
- **Consequences:** affected aliases/consumers, preserved behavior, migration boundary,
  exceptions, and checks required before claiming adoption.
- **Revisit / continuation:** trigger, unresolved work and where the next task finds it.

## Without the kit

Start with a suitable existing upstream and its documented roles. If none fits,
group extracted values from `audit . --json` by category, inspect representative
uses and derive a small coherent candidate scale. `scan` / `sweep` can inform
palette analysis; they do not name roles or decide which values to keep. Alias
mapping (`map`, A6) is **not yet available**. Use source inspection for relationships
and unsupported categories; frequency alone is not evidence of the right scale.

Mark independent derivation as such; do not attribute it to a system merely used
as inspiration. Record retained upstream terms or independent rationale and apply
the same checks as a kit choice. Where no reusable self-check exists, implement
one only for the agreed invariant and show a controlled failure. A missing kit
never blocks a recommendation or an authorized implementation.
