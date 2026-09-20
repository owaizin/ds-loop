# Set up a usable reference

Agent procedure; no `ds-loop scaffold` CLI or bundled component generator exists.
Use after a concrete setup or component task is established. Inspect the target
framework/version, scripts, existing examples and contribution requirements first.
For a whole-system setup, use [establish](establish.md); this procedure covers its
reference environment, not the full implementation.

## Minimal Storybook setup

Storybook is optional. Preserve a useful existing component documentation/test
environment. If Storybook is appropriate and setup is authorized:

1. Identify the component library and its actual framework/build configuration.
   Use official instructions for that installed version; explain required dependency
   changes before making them. Avoid scaffolding another application or replacing
   the existing toolchain just to host examples.
2. Connect only the providers, styles and theme controls the representative component
   requires. Use the project's actual theme mechanism; do not assume a `.dark` class
   or a `data-theme` attribute.
3. Add one useful component example with representative content, supported states,
   import guidance, usage constraints and relevant behavior checks. Preserve existing
   stories and tests. A static preview is not a production consumer test.
4. Run the actual start/build path and applicable checks. Verify the example renders
   and interacts as intended when browser access exists; otherwise state that gap.
5. Link the entry point from the existing contributor documentation. Name what is
   ready to use, what was checked, and who maintains the reference.

For deeper organization, lifecycle conventions, documentation maintenance or agent
retrieval, follow the optional `storybook-architect` handoff in
[engagement](engagement.md). Check availability; no automatic installation or repeated
intake. DS Loop remains responsible for integrating the result.

## Component setup

Use [shape](shape.md) for a new or substantially changed contract. Follow the local
file layout, framework's ref conventions, exports and story format. Add the
implementation, necessary exports, focused examples/tests, and usage guidance
where they belong; a fixed file count is not an acceptance criterion.

Foundations, components and composed patterns can be useful browsing categories.
Keep an existing organization unless a demonstrated consumer problem justifies
changing it. Generate token documentation from the canonical source where practical
rather than introducing a second hand-maintained table. Documentation visibility,
release status and test selection are separate decisions.

## Project checks

If a project needs file-contract, token-format parity, or MDX/reference validation,
reuse its checker or implement one for the agreed requirement. DS Loop does not
supply these validators. Demonstrate a controlled violation failing before claiming
that a new checker enforces the contract; CI wiring is a separate authorized step.

Done when the requested reference or component can be used through the documented
entry point, the applicable checks have run, and any unverified behavior is named.
Do not call the entire library documented because one example works.
