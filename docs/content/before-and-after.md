# Design System Loop: before and after

Website copy and scenario reference · 15 October 2026

## How to use this document

Use the short comparison on the homepage. Use the detailed scenarios on use-case pages or in an expandable section. The FAQ answers the questions that follow those examples.

**Editorial note:** These are illustrative scenarios, not customer case studies or measured results. “After” describes the outcome of completing the agreed work with an agent following the skill. Installing the package or running an audit does not produce every outcome below. Keep that distinction when adapting this copy. Do not present the invented company as a customer.

## Homepage copy

### Make your design system easier to use, improve and maintain

Your product already contains design decisions. Some live in shared components. Others live in copied code, old documents or someone's memory.

Design System Loop helps your coding agent understand those decisions, work on the gaps and leave guidance the next developer can use. Its engine supplies source evidence. Its skill guides the investigation, implementation and verification.

**Already have a design system? Start with what works.** Make its components, tokens and usage rules easier for developers and AI agents to find and follow.

| Before | After the agreed work |
|---|---|
| Developers search old screens for something to copy. | They have a clear path to the relevant component, its API and a checked example. |
| An agent invents another button because it cannot find yours. | Agent instructions point to the existing library and its usage guidance. A representative task checks that this path works. |
| Similar colors and spacing appear across the product without a clear reason. | The team knows which differences to preserve, which to change and which still need investigation. |
| A report lists problems without a useful next step. | A scoped plan connects evidence to a concrete change and a finish line. |
| Design decisions disappear in chat. | Decisions live in the repository or the team's existing documentation, with a path back to the evidence. |
| A change looks correct in isolation. | The team checks the affected product context and records what remains unverified. |

**Primary action:** Get started

**Secondary action:** See an example report

Supporting line: Use the CLI for source checks. Load the companion skill in your coding agent for guided work.

## Choose your starting point

These situations can coexist in one company. A mature component library may still need guidance for a new product area. An audit verdict does not decide which situation you are in.

| Your situation | Start here | First useful outcome |
|---|---|---|
| No agreed design system | Establish foundations around a real product need. | Usable foundations and components for the agreed scope, with examples and an extension path. |
| A system exists, but teams work around it | Investigate a recurring problem and its consumers. | A verified improvement, a justified exception or a clear decision about the missing capability. |
| A maintained system is hard for agents to use | Make existing APIs, guidance and decisions discoverable. | A fresh agent can complete a representative task using the actual system. |

## Scenario 1: a startup has no agreed system

### Before

An illustrative startup, Example DS, has a working dashboard. Developers built its settings, account and billing areas at different times. Each area has its own buttons, field spacing and error messages.

The team wants a shared starting point. It does not want to stop product work for a complete redesign.

### What the team asks

> Help us establish a design system for our dashboard. Start with the account settings flow. Reuse what works, explain the choices and leave components we can extend.

### What happens

1. **Understand the problem.** The agent reads the repository and asks about the relevant users, product constraints and recurring pain. It separates observed code from assumptions.
2. **Inspect what exists.** The engine checks supported source formats. The agent inspects existing components, dependencies and the product flow. Missing scanner coverage stays visible.
3. **Choose foundations.** The agent proposes suitable color, type, spacing and other foundations for this scope. Existing libraries or foundation options may be reused. Shared choices follow the team's authority and existing delegation.
4. **Build a usable first slice.** The agent implements the agreed components and patterns in the real flow. It documents supported states and usage. A token file alone is not the finish line.
5. **Check use and extension.** Run the relevant build and behavior checks, inspect the rendered flow, and try importing, customizing and extending the system.
6. **Leave a continuation path.** Record what was delivered, what was checked, remaining gaps and how the next contributor should work.

### After

The agreed product area has reusable foundations and components, working examples and guidance for adding the next piece. Developers can see where a shared decision belongs and where a local choice is appropriate.

Other screens may still use older patterns. Their migration is visible work, not an implied result of establishing the first slice. If the agreed scope includes more areas, the agent continues through them.

### What the team can inspect

- Foundation definitions and the reasons for the selected choices.
- Components used by a real product flow.
- Usage examples and supported states.
- Results of the checks that actually ran.
- A list of remaining work and a documented extension path.

**Short website card**

**Start a system your team can use.** Turn repeated product decisions into foundations, components and guidance. Build them around a real flow, then check that another contributor can use and extend them.

## Scenario 2: the system exists, but the product drifts

### Before

Example DS now has shared tokens and components. Some screens use them. Others copy styles or create local variants. The team sees inconsistent forms but does not know whether the cause is missing capability, poor documentation or intentional product differences.

### What the team asks

> Our settings forms keep drifting. Find out why, preserve intentional differences and improve one component group before proposing a wider migration.

### What happens

1. **Locate the actual sources.** Inspect imports, token declarations, shared APIs and existing guidance. A file named “tokens” is not automatically the source used by production.
2. **Collect evidence.** Use the audit for supported token and styling checks. Use source inspection and the consumer tools where applicable to understand affected code.
3. **Explain the cause.** The agent distinguishes a missing variant from a bypass, stale guidance or a legitimate exception. Counts alone do not select the repair.
4. **Choose the smallest useful intervention.** That may be a component change, better guidance, a recorded exception or no code change at all.
5. **Apply and verify the authorized slice.** Check affected states and themes in the product. Compare preview setup with the app before trusting preview results.
6. **Record the outcome.** Retain the decision, compatibility consequences, remaining consumers and next action.

### After

The team has an explanation for the inconsistency and an evidenced response. The chosen component group follows the agreed approach, or the reason for preserving a difference is recorded. The next developer can find that decision.

A smaller finding count is useful evidence only when scope and configuration remain comparable. It does not, on its own, prove a better product.

### What the team can inspect

- Source locations behind the reported problem.
- The selected disposition: change, retain, investigate or defer.
- The implementation diff, when a change was needed.
- Rendered and behavioral checks for the affected scope.
- Remaining consumers and migration consequences.

**Short website card**

**Improve the system you already have.** Find why teams work around it. Repair a missing capability, clarify guidance or preserve a valid exception—with evidence for the choice.

## Scenario 3: a good system is hard for AI agents to use

### Before

Example DS has a maintained component library and documentation. Experienced developers know which component to use. A new coding agent does not.

The agent imports from a private file, guesses a prop or creates a new control that duplicates an existing component. The team keeps repeating the same instructions.

### What the team asks

> Make our existing design system easier for coding agents to use. Keep its design and public APIs. Help agents find the right components, use them correctly and verify their work.

### What happens

1. **Find the public entry points.** Inspect actual package exports, types, stories and documentation. Preserve existing useful references.
2. **Identify missing context.** Determine what an agent needs to choose a component: purpose, import path, API, supported states, examples and limits.
3. **Create or improve a component catalog when needed.** The skill guides the agent to assemble metadata from source. It labels unknown or unsupported fields instead of inventing them.
4. **Connect tokens and decisions.** Explain the project's actual token model, theme boundaries, exceptions and contribution rules. Keep the existing source of truth.
5. **Add discovery instructions.** Link the catalog and relevant guidance from the repository's normal agent and contributor entry points. Avoid loading the entire library into every task.
6. **Choose a refresh method.** A snapshot needs explicit refresh instructions. Automatic updates require a working project-local generator and build integration, created and tested within the agreed scope.
7. **Test a fresh agent task.** Ask a fresh session to make a representative change using the system. Check what it actually finds, imports, builds and verifies.

### After

An agent has a discoverable path to real components, correct import paths, checked examples and the project's decisions. The team can assess whether that path works through a concrete task rather than an “AI-ready” label.

The catalog does not replace the implementation. Generated metadata should follow the source; authored usage advice should explain it.

### A practical definition of AI-ready

For the scoped task, a fresh agent can:

- Find the relevant component without the owner pasting its location.
- Import it through a supported entry point.
- Use its actual API rather than inventing props.
- Follow applicable token and theme rules.
- Run the appropriate checks and report what it could not verify.
- Find how the guidance is refreshed after a source change.

Passing one task demonstrates that path for that task. It does not certify every component or every agent.

### What the team can inspect

- Agent instructions linked to the existing system.
- A scoped catalog, if needed, with source locations and coverage limits.
- Checked example imports and props.
- A working refresh command if automatic refresh was requested.
- A fresh-session task record showing success, failures and unresolved gaps.

**Short website card**

**Help AI agents use your existing system.** Make real components, APIs and decisions easy to find. Verify the setup with a fresh agent completing a real task.

## Scenario 4: keep the system usable as the product grows

### Before

A shared component changes. Developers are unsure which apps import it. Documentation may lag behind the implementation. The team has no consistent way to compare source measurements over time.

### What happens

The team uses supported static import and component-usage analysis to inspect known consumers. An agent reviews compatibility and the affected product behavior. Recorded decisions explain the change. Saved scorecard rows provide comparable trends when the measurement configuration has stayed consistent.

Optional Claude Code edit feedback reports supported high-severity findings after edits. Teams can separately configure CI policy. Neither replaces product review.

### After

The team has better evidence for planning a change and a repeatable way to revisit the system. Unknown consumers, unchecked behavior and changed measurement settings remain visible.

**Short website card**

**Keep decisions useful after delivery.** Leave discoverable guidance, inspect known consumers and compare supported measurements as the code changes.

## What the engine, skill and team each do

| Part | Contribution | What it does not establish |
|---|---|---|
| Deterministic engine | Reads supported source, reports findings and coverage, suggests token candidates, provides static relationship views and saved measurements. | Product intent, design quality, computed appearance or complete runtime behavior. |
| Agent following the skill | Investigates context, recommends a plan, implements authorized work, verifies outcomes and retains decisions. | Guaranteed correctness or authority to change shared policy outside the task. |
| Team | Sets priorities, supplies missing intent and retains policy and release authority under its normal working agreements. | The team does not have to manually choose every playbook or approve every routine step. |

## FAQ copy

### Do we need to replace our design system?

No. Start with the system you have. The agent investigates the problem and preserves useful foundations, components and conventions. A replacement needs its own justification and scope.

### Does installing Design System Loop make our system AI-ready?

Installation provides the engine and skill files. Your coding agent must load the skill and complete the relevant work. The useful test is whether a fresh agent can find and correctly use your system for a representative task.

### Can it build a design system if we have none?

The skill guides a coding agent through establishing foundations, components, patterns and guidance for an agreed product scope. The engine supplies supported source checks. Delivery still needs implementation and verification in your project.

### Does it generate a component catalog automatically?

The registry playbook guides an agent to create or improve a catalog. There is no bundled universal component extractor. For automatic refresh, the agent must build or reuse a project-local extraction pipeline and verify it against your library.

### Do we need Storybook?

No. Use the documentation and examples that serve your project. The skill can guide a minimal Storybook setup when useful and refer deeper organization or management work to the optional Storybook Architect skill. Storybook is not installed or managed automatically.

### Will it fix everything the audit finds?

No. The CLI's mechanical fixer handles a narrow set of provable fallback edits. Token suggestions are candidates, not replacements. Other changes require the agent or team to consider intent, themes, compatibility and product behavior.

### Is a clean audit the finish line?

A clean audit describes only the checks and scope it covered. Completion depends on the task: working implementation and relevant verification, a completed investigation, or a documented reason to leave something unchanged.

### Does it run in the background?

Installation does not schedule ongoing work. The optional Claude Code guard provides feedback after supported edits. Scheduled checks, CI and documentation refresh need explicit setup.

### Does the engine send our code to an AI provider?

The engine runs locally without model calls or network access. If you use the companion skill through a coding agent, that agent's provider and host settings govern its data handling and usage costs.

## Suggested website layout

1. **Promise:** the homepage headline and short explanation.
2. **Before and after:** select four rows from the homepage comparison.
3. **Your starting point:** three cards for establish, improve and agent use.
4. **One concrete journey:** show a real, publishable example from problem through delivery and verification. Until available, label the Example DS scenario illustrative.
5. **How it works:** engine, agent and team responsibilities.
6. **Get started:** link to the current installation guide and a simple skill prompt.
7. **Questions:** installation versus activation, existing systems, Storybook and limits.

Suggested starting prompt:

> Use Design System Loop to understand our existing system and help us improve it. Start with our main problem, preserve what works and show me the first useful outcome and how you'll verify it.

## Editorial guardrails

Keep these notes out of the public page, but retain them for future edits.

- Use “Design System Loop” in prose and `ds-loop` for commands and identifiers.
- Describe outcomes as the result of completed work, not automatic installation effects.
- Do not claim time savings, fewer bugs, increased adoption or customer results without evidence.
- Do not promise universal framework coverage, cascade resolution or runtime consumer analysis.
- Do not describe an existing system as broken because it differs from default naming assumptions.
- Do not turn “AI-ready” into a certification or score. Name the task the agent successfully completed.
- Distinguish source findings, agent recommendations, implemented changes and rendered verification.
- Keep the guard's post-edit feedback separate from CI blocking policy.
- Do not present a snapshot catalog as self-updating.
- Keep optional specialists optional. A link is not an installation or an automatic invocation.
- These scenarios contain invented examples only. Replace them with customer evidence only when publication is authorized.

## Maintainer references

These repository sources support the capability boundaries above. They are implementation references, not customer outcome evidence.

- [Product overview and limits](../../README.md)
- [Skill responsibilities and routing](../../skill/SKILL.md)
- [Delivery and verification requirements](../../skill/reference/delivery-contract.md)
- [Establishing a system](../../skill/reference/establish.md)
- [Component catalog and refresh requirements](../../skill/reference/registry.md)
- [Documentation and optional Storybook specialist](../../skill/reference/scaffold.md)
- [Command reference and coverage](../guide/reference.md)
