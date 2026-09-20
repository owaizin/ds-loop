# Establish a design system

Agent implementation procedure for a request to set up or build a design system.
The result is a usable, editable foundation for the agreed product scope. A token
file, component gallery or successful pilot alone does not complete that request.
There is no `ds-loop establish` CLI or bundled component library.

## Define what the team will be able to do

Use discovery already gathered. Inspect the product's workflows, stack, existing
UI, dependencies, brand sources and contributor entry points. Recover the user's
scope before choosing a representative consumer. If the request is broad, recommend
the foundation and workflows it should cover; do not quietly reduce it to one
component because that is easier to verify. Reuse authorization to implement.
A proposal-only request still ends with a proposal.

Keep a short delivery map in the existing task or plan:

| Deliverable | Resolve before calling setup complete |
|---|---|
| Foundations | Canonical editable sources, visual direction, scales and roles used by the product, and how supported themes behave. |
| Primitives | The controls, surfaces and feedback needed by the agreed workflows; actual exports, states and extension points. |
| Composed patterns | Shared arrangements used in those workflows, with realistic content and relevant loading, empty, error and permission states. |
| Style and usage guide | The actual styles/components, working imports, selection guidance and customization instructions. |
| Maintenance | How to change a foundation, add a variant/pattern, check effects, and retain decisions. |

For each, name its intended consumer and what proves it works. Reuse existing
assets where they satisfy the need. Identify exclusions with reasons; an arbitrary
component count or installing every component from a catalog is not the target.
If only a pilot is authorized, call the result a pilot and show what remains for
system setup. A broader authorized assignment continues after that checkpoint.

## Choose and integrate the implementation base

Inspect before selecting. An existing adopted library is the first candidate.
Compare preserving/extending it with a compatible maintained foundation and a
custom implementation only where the product needs one. Explain the choice using
framework fit, behavior/accessibility support, customization, ownership and upkeep.
Use mature behavior primitives for complex focus, selection and overlay behavior
when compatible. A handwritten approximation needs stronger behavioral proof.

For a React project without an established library, consider shadcn/ui when its
editable-source approach and styling stack fit. It is an option, not a universal
requirement. Native controls may suit simple interactions; other stacks need an
appropriate foundation. Do not replace a functioning toolchain just to use one.

When adopting a foundation:

1. Read the official installation and theming instructions for the chosen version
   and the project's framework. Use the current package manager and workspace.
   Inspect installed config, aliases, style entry points and provider boundaries.
2. Integrate into the existing application. Run an initializer only after checking
   which files it will create or overwrite; merge required changes into existing
   configuration. Preserve routes, styles, tests, licenses and unrelated behavior.
3. Add the primitives needed by the delivery map. Record versions and provenance
   through the lockfile and the team's normal attribution files. Verify public
   imports, style loading and provider requirements in a real consumer.
4. Define how local customizations and upstream updates are maintained. A copied
   source component is locally owned code; a later generator run can overwrite it.

For shadcn/ui, resolve `components.json` paths and aliases against the actual
project, verify the theme variables are loaded, and reconcile inherited defaults
with product choices. Installing components does not establish the product's
typography, density, layout conventions or composed patterns. Consult
[installation](https://ui.shadcn.com/docs/installation),
[configuration](https://ui.shadcn.com/docs/components-json) and
[theming](https://ui.shadcn.com/docs/theming); do not copy version-sensitive commands
from memory or rewrite existing CSS wholesale from a starter example.

## Implement foundations in the product

Turn the agreed visual direction into actual values and usage rules. With no
provided brand, recommend a coherent provisional direction suited to the product
and make it easy to revise. Explain choices through real screens rather than a
list of palette adjectives. Respect existing visual assets and font licenses.

Cover the foundations the workflows use:

- **Type:** loaded font families/fallbacks, size/weight/line-height roles, numeric
  alignment and long-content behavior. The guide uses the same fonts as the app.
- **Color:** surfaces, readable foreground pairs, borders, actions, focus and
  semantic feedback. Implement the supported modes and provider behavior; do not
  advertise dark mode or theme switching that has not been built and checked.
- **Space and layout:** spacing and control-size conventions, density, containers,
  alignment, content widths and responsive behavior for the real layouts.
- **Shape and layering:** borders, radii, elevation and overlay order where used.
- **Interaction:** icon sizing/alignment, hover/focus/disabled/pending states and
  useful motion with reduced-motion behavior where applicable.

Preserve a compatible naming grammar and canonical source. Prefer role-based
consumption where values vary by theme. Wire framework mappings and derived values
so changing the source affects components and product screens. Avoid a parallel
documentation palette or a second scale disconnected from the implementation.
Use [tokenize](tokenize.md) for source changes and additional formats required by
named consumers. Scanner naming assumptions must not dictate the design system.

## Build the primitives and product patterns

Derive the set from workflow actions and states: navigation, entering/selecting
data, reviewing records, feedback and confirming changes. Implement shared APIs
and styles, then replace corresponding local implementations within the authorized
scope. Use [shape](shape.md) for substantive contracts and [review](review.md) for
behavior. Avoid parallel copies that merely look alike.

Compose realistic product patterns from those primitives. A record workflow may
need a filter bar, results list/table, detail view and edit form; another product
will need a different set. Preserve data/service contracts and explain simulated
states. Show enough different consumers to expose reuse problems in this scope.
A renamed duplicate of the same demo does not demonstrate composition.

Review the rendered system as a whole: hierarchy, typography, spacing rhythm,
density, alignment, state distinction and responsive behavior must work together.
Inspect long labels, dense content and feedback in context. Fix visual defects
before presenting the setup as ready; compilation and an audit cannot judge craft.

## Make use and maintenance discoverable

Use the team's existing documentation environment or a suitable reference site;
[scaffold](scaffold.md) covers basic setup and the optional Storybook specialist.
Import real components and shared styles into live examples. Keep examples close
enough to their source that they can be checked when APIs change.

The developer entry point must explain:

- How to start/build the app and reference, and where foundations/components live.
- Working imports and examples, supported variants/states, and when to choose them.
- Where to edit a visual foundation, what should change, and how to check it.
- How to extend an existing component or add a pattern using current conventions.
- How to run behavior checks and engine checks, what each covers, and how to
  record a justified exception. Name the existing decision owner or unresolved
  ownership; do not invent one.

A gallery without these paths is reference material, not a completed setup.
Keep guidance proportional, but do not omit the steps needed to use the result.

## Prove the system can be used and changed

Check the delivery map against actual files and behavior before declaring done:

1. Build and run the application and reference. Exercise the agreed workflows and
   relevant states at their target viewports, with keyboard/focus checks. Verify
   visible styles use the real fonts and theme. State any unrun accessibility checks.
2. Use the documented import in another relevant consumer or isolated verification
   fixture. It must compose the shared implementation without copying its styles.
3. In an isolated fixture or reversible local patch, change a representative
   foundation at its documented source. Verify the intended components and product
   consumers change, including supported modes. Restore the probe; do not leave
   an unrequested rebrand in the deliverable.
4. Follow the documented extension path for a real need or a temporary variant.
   Verify it is discoverable and does not require bypassing shared conventions.
   Remove demonstration-only extensions afterward unless they belong in scope.
5. Run the unfiltered engine audit and applicable project checks. Explain unsupported
   storage/naming and retained exceptions. A smaller finding count is not evidence
   that the system is easier to use.

For a broad setup, a fresh contributor or agent should attempt a follow-on task
from the normal entry point, without being handed internal paths or the answer.
Record who performed it; an agent trial does not prove human usability. If that
trial or a necessary runtime check cannot run, say setup is awaiting that check.

Finish with what developers can now build and change, evidence for the agreed
deliverables, and remaining limits. Identify any unfinished delivery-map item
instead of declaring the whole system done because its first consumer works.
