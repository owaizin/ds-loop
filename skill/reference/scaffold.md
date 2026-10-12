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
   or a `data-theme` attribute. Verify [preview rendering parity](review.md#verify-preview-rendering-parity)
   before treating the reference as evidence of app rendering.
3. Add one useful component example with representative content, supported states,
   import guidance, usage constraints and relevant behavior checks. Preserve existing
   stories and tests. A static preview is not a production consumer test.
4. Run the actual start/build path and applicable checks. Verify the example renders
   and interacts as intended when browser access exists; otherwise state that gap.
5. Link the entry point from the existing contributor documentation. Name what is
   ready to use, what was checked, and who maintains the reference.

## Optional Storybook specialist

For Storybook organization, meaningful component or product-context stories,
documentation maintenance, lifecycle conventions or component discovery, use
[storybook-architect](https://github.com/owaizin/skills/blob/main/storybook-architect/SKILL.md)
when the task needs that specialist. Load the installed skill and only the references
relevant to the work. Basic setup can continue through the steps above without it.

If unavailable, offer installation from [its source repository](https://github.com/owaizin/skills)
using the host's supported installation path. Keep the complete `storybook-architect/`
folder, including its references and scripts; record the chosen revision. Do not
silently install it. A source link alone does not install or activate the skill.

Carry forward the goal, relevant component and configuration paths, existing
decisions, authorized scope, deferred work and expected result with its checks.
Continue the current task without repeating onboarding. Follow the
[handoff procedure](engagement.md#optional-specialist-handoff); loading a specialist
does not require a separate agent or chat.

DS Loop retains responsibility for the overall outcome. Inspect the specialist's
changes and verification evidence against the agreed result, include remaining
limits in the completion record, and continue any remaining authorized work.

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

For an AI-readable component catalog or automatic metadata refresh, follow
[registry](registry.md). It covers snapshots and project-local generators; neither
is supplied by the CLI. Reuse the same sources as the human-facing docs.

## Specs and discovery

Preserve a useful existing documentation home. If there is none, use this layout
for the agreed scope; create files only when there is content to maintain:

```text
specs/
  foundations/
  tokens/
  components/
    atoms/
    molecules/
    organisms/
  patterns/
```

Foundations hold adopted values, roles, source and decisions; `tokens/` holds the
reference and usage guidance. The engine does not yet generate a token-reference
file: assemble it from canonical declarations with name, value, file:line and
configured tier, marking unresolved aliases/modes and unread formats. Avoid a
second editable token source. Link refresh instructions when a derived table ships.

Use [shape](shape.md)'s eight-section template for existing components, prioritized
by observed consumer reach. Run `ds-loop consumers <path>` for that reach, then
inspect public exports, label sampled coverage, and separate real consumers from
reference stories. Imports and JSX occurrences are not runtime usage. Keep a better existing categorization instead of moving code
to match atoms/molecules/organisms. `patterns/` describes compositions that exist.

Link the relevant foundation, token and component specs from the normal contributor
entry point. Where stories exist, link them from specs and link back from their
usage docs. Verify paths and examples actually resolve. Use [engagement](engagement.md)
for evidence labels and retrieval checks; generated files alone do not prove that
a later developer or agent finds and applies the contract.

## Project checks

If a project needs file-contract, token-format parity, or MDX/reference validation,
reuse its checker or implement one for the agreed requirement. DS Loop does not
supply these validators. Demonstrate a controlled violation failing before claiming
that a new checker enforces the contract; CI wiring is a separate authorized step.

Done when the requested reference or component can be used through the documented
entry point, the applicable checks have run, and any unverified behavior is named.
Do not call the entire library documented because one example works.
