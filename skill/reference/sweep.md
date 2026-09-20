# Interpret a palette sweep

Implemented CLI. Use when the task needs to understand how extracted color
clusters change with the configured CIEDE2000 cutoff. It is not required for every
design-system engagement and does not decide which colors the product needs.

```bash
<skill-base-dir>/bin/ds-loop sweep <source> --out <directory>
```

The output directory receives the source-label `.sweep.json` and `.sweep.md`.
Inspect the command's supported options in the installed version. Keep the source,
configuration and extraction limitations attributable.

## Interpret the measurement

The cutoff determines which colors count as separate clusters. Increasing it can
merge clusters without changing a single source color; lowering it can separate
them. Compare the curve before interpreting a count as a property of the palette.

- The curve shows cluster counts across the configured cutoff range. Clusters can
  merge as the cutoff increases; a rising curve warrants investigation of the
  measurement implementation/input, not a product redesign.
- A plateau means a stable cluster count over that range. The current engine's
  `intentPlateau` field selects a plateau near a supplied primitive count when that
  fixture metadata exists. The name does not prove a designer's intent, perceptual
  interchangeability, or that the palette was hand-tuned.
- With no reference count, explain what the curve shows without inventing a target.
  Absence of a plateau does not prove a palette is defective or how it was produced.
- Cutoffs are configuration choices. Do not transfer a number from another system
  as a recommended standard. Similar distance does not establish equal contrast,
  semantic role, theme behavior or safe substitution.

## Recommend only what the evidence supports

If a merge is being considered, inspect the candidate colors in their actual
roles and themes, check relevant rendered contrast/state distinctions, and locate
consumers. Preserve intentional distinctions. Publish a measurement with its
curve, scope and limitations; label any product recommendation as judgment with
its own evidence. The engine does not perform palette redesign or consumer review.

Done when the requested measurement is explained and the next decision is clear.
A sweep with no actionable consolidation is a valid outcome.
