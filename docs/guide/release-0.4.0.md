# 0.4.0 release notes

See where your system is used, then save the evidence for the next change.

```sh
npm install --save-dev ds-loop@0.4.0
npx ds-loop install --agent codex
npx ds-loop audit .
```

## What changed since 0.2.1

- Read ordinary CSS properties, token JSON and bounded SCSS/Sass alongside CSS
  custom properties and Tailwind strings. Reports keep unsupported expressions
  and unresolved references visible. See [coverage](reference.md#coverage).
- Inspect tokenization across seven style categories and review exact or nearby
  token candidates. Suggestions retain ambiguity and provenance; they don't
  authorize replacement. See [real output](output.md).
- Use `consumers` for workspace imports and production shared-component share,
  `impact` for direct static import locations, and `audit --target docs` for
  detected shared-component documentation. See [the reference](reference.md).
- Save an offline consulting report with `report` and an agent-written assessment
  with `--consult`. Open `dashboard` for today and comparable saved trends.
  Public reference comparisons retain coverage and instrument limits.
- Record owner, alternatives and evidence with `decide`. Use `doctor` to inspect
  contract drift, configuration, intent evidence and guard state without writing.
- Use `install` to add agent instructions. It appends to existing files and
  replaces only its own marked block on reruns. The settings-writing guard
  remains opt-in through `--guard`. See [installation](install.md).
- Route agent work through twelve commands, eight roles and six practice guides.
  Start with `/ds-loop:start`. See [workflows](workflow.md#agent-commands).
- Keep translucent and opaque palette colours apart with
  `clustering.alphaTolerance`. CIEDE2000 alone has no alpha term, so their colour
  distance could be zero. See [configuration](reference.md#configuration).

These capabilities are defined by the [CLI](../../src/cli.ts),
[adapter registry](../../src/adapters/registry.ts) and
[configuration defaults](../../src/config/defaults.ts).

The release also includes evidence-backed assessment plans, a shared delivery
overview, component-registry guidance, and an optional Storybook Architect handoff.
Claude Code users can install through the repository marketplace; see
[installation](install.md#claude-code-plugin). Reports include font license notices
and CSS-only decorative artwork.

## Upgrade and verify

Rerun an unfiltered audit after installing. Check adapter versions, the config
hash and source scope before comparing history. Changed instruments prevent a
delta; an old baseline doesn't become comparable by relabelling it. Review your
naming patterns and exceptions against the actual project contract.

## Limits

`clean`, `issues` and `not-checked` remain distinct outcomes. A clean result covers
only the stated scope; unread code hasn't passed. Sass evaluation, CSS-in-JS,
Vue/Svelte templates, runtime composition and visual behavior still need other
checks. The engine runs locally with no model or runtime dependencies; the agent
supplies judgment within the scope your team authorizes.
