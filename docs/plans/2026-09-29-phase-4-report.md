# Phase 4 report — roles and published practices

Implemented the Phase 4 brief. The skill now routes user outcomes to eight named
roles and six practice guides. This is an instruction workflow; one agent can
switch roles with an explicit hand-off. No orchestration code or dependency was added.

## Delivered

- `skill/roles/`: auditor, consultant, architect, foundations, components, docs,
  migrator and governor. Each states ownership, evidence, decision limits,
  receiving roles/artifacts, playbooks and commands. Each is under 150 lines.
- `skill/practices/`: starting, maintaining, migrating, documenting, Storybook and
  governing. Each follows hook → practice → missing signs → action. Published
  examples carry direct URLs; our prescriptions carry the literal label below.
- `skill/SKILL.md` selects roles from outcomes. `reference/routing.md` adds a role
  column and hand-off guidance. `reference/consult.md` loads the consultant, whose
  “What good looks like” section links all six practices and carries citations
  into `consult.json` recommendations. The existing schema supports opinion labels.
- `test/skill-practices.test.ts` checks required files, a URL citation in every
  practice, a named hand-off in every role, the role length limit, local links,
  role routing and the consultant's practice links. New files are already covered
  by the package's existing `skill` inclusion.
- Formatted `benchmarks/reference.json` to resolve an existing `npm run check`
  failure. Parsed JSON was compared before/after with deep equality: data unchanged.

## Verification

- `npm run check`: passed (143 files checked).
- `npm run type-check`: passed.
- `npm test`: passed all 250 tests, with no failures or skips. The three new
  document checks also passed after the final type/lint-compatible assertion edit.
- The checks caught formatting, optional-string narrowing and the optional-chain
  lint rule in the new test. All were resolved; final check and type-check passed.
- No Git write command was run inside this repository. Existing tests create their
  Git fixtures in temporary directories outside it.

The tests check document structure and links, not whether a claim follows from a
source. Source support was reviewed manually against the public pages listed below.
No network check was added to tests or the deterministic engine. No fresh-agent
fixture trial was performed; routing/link checks do not establish independent agent
retrieval or human usability. No runtime engine behavior was changed.

## Published source register

These are all URLs cited by the new practice guides, inspected on 2026-09-29.
The Carbon fragment points to the same inspected page's Labs section. These are
published examples, not a survey, ranking, benchmark or endorsement. No claim is
based on an inaccessible MCP snapshot. Recheck living docs for version-specific work.

| Source | Used in |
|---|---|
| [Carbon documentation requirements](https://carbondesignsystem.com/contributing/get-started/overview/) | documenting.md, governing.md, maintaining.md |
| [Button usage](https://carbondesignsystem.com/components/button/usage/) | documenting.md |
| [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) | documenting.md |
| [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/) | documenting.md, starting.md |
| [Carbon Labs](https://carbondesignsystem.com/contributing/get-started/overview/#carbon-labs) | governing.md |
| [Primer versioning](https://github.com/primer/react/blob/main/contributor-docs/versioning.md) | maintaining.md |
| [Primer React releases](https://github.com/primer/react/releases) | maintaining.md |
| [Atlassian token migration](https://atlassian.design/foundations/tokens/migrate-to-tokens/) | migrating.md |
| [Atlassian release phases](https://atlassian.design/release-phases) | migrating.md, starting.md |
| [Primer migration guides](https://primer.style/product/getting-started/react/migration-guides/) | migrating.md |
| [Primer foundations](https://primer.style/product/getting-started/foundations/) | starting.md |
| [Storybook writing stories](https://storybook.js.org/docs/writing-stories) | storybook.md |
| [Storybook controls](https://storybook.js.org/docs/essentials/controls) | storybook.md |
| [Storybook Autodocs](https://storybook.js.org/docs/writing-docs/autodocs) | storybook.md |
| [Storybook visual tests](https://storybook.js.org/docs/writing-tests/visual-testing) | storybook.md |

## Opinion register

The exact label is **our own opinion**, as requested. No reviewed public source
states our complete pilot recipe, maintenance checklist, coexistence/removal
checklist, documentation retrieval trial, Storybook selection checklist, decision
record/exception/rule workflow, or role/report hand-off model. Those are explicitly
our recommendations. The missing-practice signs and opening judgments are likewise
marked, rather than presented as measured failures or claims from a named system.

Every occurrence introduced by this phase is listed below, including instructions
to preserve the label and the consultant's schema example. Locations refer to the
completed files; some labels scope the following numbered list or paragraph.

| Location | Label or instruction |
|---|---|
| [skill/SKILL.md:40](../../skill/SKILL.md#L40) | our own opinion: These roles and their hand-offs are the kit's working model, |
| [skill/SKILL.md:57](../../skill/SKILL.md#L57) | our own opinion: At each hand-off, name the sending and receiving role, goal, |
| [skill/SKILL.md:66](../../skill/SKILL.md#L66) | recommendations. Where no public source states a practice, say our own opinion |
| [skill/reference/routing.md:32](../../skill/reference/routing.md#L32) | our own opinion: Arrows name hand-offs, not required extra agents or mandatory |
| [skill/reference/consult.md:18](../../skill/reference/consult.md#L18) | states it, write our own opinion; never attribute our recipe to another system. |
| [skill/roles/consultant.md:33](../../skill/roles/consultant.md#L33) | When no public source states the recommendation, write our own opinion in its |
| [skill/roles/consultant.md:35](../../skill/roles/consultant.md#L35) | `system: "Design System Loop (our own opinion)"`. Cite local evidence for the need |
| [skill/roles/consultant.md:39](../../skill/roles/consultant.md#L39) | These citation and hand-off procedures are our own opinion, the kit's workflow. |
| [skill/practices/documenting.md:3](../../skill/practices/documenting.md#L3) | our own opinion: A props table isn't enough if your reader still cannot tell |
| [skill/practices/documenting.md:25](../../skill/practices/documenting.md#L25) | our own opinion: Look for a copyable example with a dead import, a token table |
| [skill/practices/documenting.md:31](../../skill/practices/documenting.md#L31) | our own opinion: Use [shape](../reference/shape.md) and |
| [skill/practices/documenting.md:41](../../skill/practices/documenting.md#L41) | our own opinion: Write one contract for people and agents. Use direct headings, |
| [skill/practices/governing.md:3](../../skill/practices/governing.md#L3) | our own opinion: A rule without an owner leaves the next contributor guessing |
| [skill/practices/governing.md:19](../../skill/practices/governing.md#L19) | our own opinion: Look for conflicting instructions, an exception with no reason, |
| [skill/practices/governing.md:25](../../skill/practices/governing.md#L25) | our own opinion: Use the governor with [engagement](../reference/engagement.md) |
| [skill/practices/governing.md:34](../../skill/practices/governing.md#L34) | separately from decisions. This field set is our own opinion. |
| [skill/practices/governing.md:38](../../skill/practices/governing.md#L38) | “our own opinion”, known limits, and examples that should pass and fail. |
| [skill/practices/maintaining.md:3](../../skill/practices/maintaining.md#L3) | our own opinion: Your consumer should be able to tell what changed and what |
| [skill/practices/maintaining.md:24](../../skill/practices/maintaining.md#L24) | our own opinion: Investigate updates with no useful change note, unreviewed |
| [skill/practices/maintaining.md:30](../../skill/practices/maintaining.md#L30) | our own opinion: Apply this maintenance checklist through the governor and |
| [skill/practices/migrating.md:3](../../skill/practices/migrating.md#L3) | our own opinion: A new library is only part of a migration. Keep the old |
| [skill/practices/migrating.md:25](../../skill/practices/migrating.md#L25) | our own opinion: Look for two APIs with no removal owner, a codemod accepted |
| [skill/practices/migrating.md:31](../../skill/practices/migrating.md#L31) | our own opinion: Use [transform](../reference/transform.md) and this staged plan: |
| [skill/practices/starting.md:3](../../skill/practices/starting.md#L3) | our own opinion: Start with a real flow. A shelf of unused components isn't |
| [skill/practices/starting.md:24](../../skill/practices/starting.md#L24) | our own opinion: Look for a demo that has no product consumer, unclear support |
| [skill/practices/starting.md:30](../../skill/practices/starting.md#L30) | our own opinion: Use this pilot recipe with [establish](../reference/establish.md): |
| [skill/practices/storybook.md:3](../../skill/practices/storybook.md#L3) | our own opinion: A gallery is useful when you can find the state you need to |
| [skill/practices/storybook.md:27](../../skill/practices/storybook.md#L27) | our own opinion: Investigate a gallery with only happy states, controls that |
| [skill/practices/storybook.md:33](../../skill/practices/storybook.md#L33) | our own opinion: Use [scaffold](../reference/scaffold.md) for setup and |

## Boundaries retained

The auditor establishes facts and never proposes. The consultant owns diagnosis
and `consult.json`. Team authority and existing delegation persist across roles;
hand-offs don't grant release, migration or policy authority. Engine coverage
travels with evidence. Opinion labels don't count as supporting evidence, and
empty evidence still renders as unsupported. Storybook remains optional; source
inspection, rendered verification and static consumer counts stay distinguishable.
