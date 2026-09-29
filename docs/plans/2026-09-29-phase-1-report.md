# Phase 1 implementation report

Implemented the consulting report, clear-words layer, and investigate → offer →
consult → report skill flow. No Git-writing commands were run in the working repository.

## What was built

- `ds-loop report [path] [--consult file.json] [--out file.html]`, defaulting to
  `ds-loop-report.html` in the current directory. It runs an unfiltered audit and
  workspace consumer analysis, then writes a self-contained HTML report with the
  seven requested sections in order. Missing consultation sections explicitly say
  they have not been written. A not-checked result appears in the first summary.
- A validated consultation schema with problem statements, named source systems,
  after-state and proposal architecture, ordered plan steps, assumptions and
  evidence references. Validation collects errors; malformed input does not write
  the output. Empty evidence arrays render unsupported. Citations are explicitly
  labelled agent-cited, not independently verified facts.
- Reused the audit HTML shell, evidence browser, token diagram and report assets.
  Reused the component diagram and proposal renderer in scoped, inline document
  fragments, so they remain in normal document flow for printing. Proposal logic
  now lives in `src/core/proposal.ts`; the skill script is a launcher and CLI wrapper
  using that implementation in development or its compiled build in an install.
- A responsive violet report with light/dark controls, section navigation, print
  page breaks, findings grouped by theme, local source links, and persistent
  coverage limits. Detailed engine evidence remains available under disclosure
  controls. The summary leads with scope and up to three severity-ordered finding
  groups; it does not equate severity with business priority.
- Plain titles and descriptions for every registered rule, all coverage fields and
  all three verdicts. Human summary rows use plain title, dimmed rule ID on a TTY,
  count and recorded locations. Detailed `--all`, rule summaries, IDs, JSON, fix
  text and existing report headers retain their engine vocabulary. The report
  handover is a terminal-view action, preserving structured audit `next` data.
- Updated agent instructions, the consultation playbook and schema reference,
  plus a complete synthetic consultation example. Updated README/guide excerpts
  by running their commands and capturing actual output; verification tests still
  execute those commands.

## Files touched

Engine and rendering:

- `src/cli.ts`
- `src/commands/report.ts` (new)
- `src/core/plain.ts` (new)
- `src/core/consult.ts` (new)
- `src/core/consult-html.ts` (new)
- `src/core/embedded-report.ts` (new)
- `src/core/proposal.ts` (moved implementation, with validation hardening)
- `src/core/audit-summary.ts`
- `src/core/next.ts`
- `src/core/report-html.ts`
- `src/core/token-architecture-html.ts`

Instructions, documentation and examples:

- `CLAUDE.md`
- `README.md`
- `docs/guide/reference.md`
- `docs/guide/output.md`
- `skill/SKILL.md`
- `skill/reference/discover.md`
- `skill/reference/consult.md` (new)
- `skill/tools/proposal.mjs`
- `skill/templates/consult.example.json` (new)
- `docs/plans/2026-09-29-phase-1-report.md` (this file)

Tests:

- `test/consult-report.test.ts` (new)
- `test/audit-summary.test.ts`
- `test/css-rule-bodies.test.ts`
- `test/next.test.ts`
- `test/readme.test.ts`

Local review artifacts (under ignored `scratch/phase-1/`): `consult.json`,
`example-workspace-report.html`, `css-report.html`, and `no-consult.html`.
The build also regenerates ignored `dist/`.

## Verification

Required gates:

```sh
npm run check
npm run type-check
npm test
```

All pass: 225 tests, zero failures. New coverage includes both requested fixtures
with and without consultation, section ordering, not-checked summary, validation
errors, unsupported and escaped claims, source links, inline-script syntax,
self-contained assets, CLI defaults and plain-rule completeness. Existing tests
continue to protect structured output, severity filtering and guard semantics.

Additional checks:

```sh
npm run build
node skill/tools/proposal.mjs check skill/templates/proposal.example.json
```

The build passes. The original proposal example validates with its expected one
unsupported-node warning. Both the source report command and the compiled package
entry point generate reports.

## Reproduce the review report

From the repository root:

```sh
mkdir -p scratch/phase-1
cp skill/templates/consult.example.json scratch/phase-1/consult.json
npm run ds-loop -- report fixtures/example-workspace --consult scratch/phase-1/consult.json --out scratch/phase-1/example-workspace-report.html
npm run ds-loop -- report fixtures/css-audit-example --out scratch/phase-1/css-report.html
```

Open `scratch/phase-1/example-workspace-report.html`. Start with the explicit
synthetic assumptions, the measured component-usage diagram and source links, and
the proposed architecture/plan. The sample intentionally includes unsupported
assumptions and a proposed box to demonstrate the evidence boundary. Its Primer
foundation citation was checked against the linked public documentation.

## Limits and work not performed

No requested implementation item was intentionally omitted. No dependency,
network call or model call was added to the engine. No rules or thresholds changed.

Visual browser verification could not be completed: the browser tool rejected the
local `file:` URL under its URL security policy. I did not bypass that restriction.
The HTML, inline scripts, schema and command behaviour were checked automatically;
mobile layout, theme appearance and PDF pagination still need the reviewer's visual
check. This report does not claim that source checks establish visual quality.

Local source links depend on the recipient's checkout paths and browser/editor line
fragment support. Citations are syntax-checked, not proof-checked. Static component
usage is not runtime usage. Expand evidence before printing; paginated interactive
browsers preserve the full recorded data in the HTML, not necessarily in the PDF.
