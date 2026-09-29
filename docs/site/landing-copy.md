# Your design system, connected to your code

Your tokens live in one place. Your product styles drift somewhere else.
See where they diverge, then give your team a plan to bring them together.

```sh
npx ds-loop@0.4.0
```

Run it in your project with Node 22.6 or later. Your first run reads supported
code, prints a short summary and saves `ds-loop-report.html`. Open the file in
your browser. Start with the findings and their source locations, then read the
coverage limits beside them.

## See what it finds

This unedited excerpt comes from the independently written Example DS fixture.
Reproduce it in the source checkout with
`npm run ds-loop -- start fixtures/css-audit-example`:

<!-- verified: landing-css-showcase -->
```text
  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:7
  [HIGH] Hard-coded styles · token/raw-value-in-style · 1 hits · styles.css:9
  [LOW] Missing backup values · token/var-missing-fallback · 2 hits · styles.css:8, styles.css:10
```

Look at the color and spacing literals at `styles.css:7` and `styles.css:9`.
The backup-value finding points to a different task: keeping token references
usable when a definition is missing. The report shows the evidence and limits.

## Bring in your agent

```sh
npm install --save-dev ds-loop@0.4.0
```

Ask your coding agent:

> Read node_modules/ds-loop/skill/SKILL.md. Investigate why our product bypasses
> shared styles. Write an assessment and plan backed by evidence. Start read-only.

The skill guides investigation, consultation and authorized delivery. After your
agent writes `consult.json`, add its assessment to the report:

```sh
npx --no-install ds-loop report . --consult consult.json
```

Use the [Claude Code plugin or Codex skill](../guide/install.md#claude-code-plugin)
for discovery in your agent. Your team decides what changes. Installation alone
doesn't start an agent.

## Keep a record

```sh
npx --no-install ds-loop scorecard .
npx --no-install ds-loop dashboard .
```

Save another scorecard after a change. The offline dashboard shows today's state
and comparable saved measurements. One run is a baseline, not a trend.

## Limits

- Reads selected CSS properties, CSS custom properties, Tailwind strings,
  DTCG/Style Dictionary JSON and bounded SCSS/Sass. It doesn't evaluate Sass,
  resolve every token composite or read Vue/Svelte and CSS-in-JS.
- “Not checked” is never a clean result. Read findings and coverage together.
  Default report creation preserves an existing report and skips projects with
  `.ds-scorecard/`. Run `report` explicitly to refresh it.
- Static imports and JSX aren't runtime usage. Documentation presence isn't
  documentation quality. Layout, interaction and accessibility need rendered review.
- The engine provides evidence. The agent supplies the assessment and plan;
  missing advice stays labelled as unwritten. Benchmark data isn't a quality grade,
  and insufficient or incompatible reference samples produce no comparison.
- The engine runs locally without an API key, network calls or runtime dependencies.
  Your coding agent's data handling and costs depend on its provider and settings.

## How it works

Format readers preserve source locations. Deterministic rules produce findings
and coverage. The skill helps your agent reason from that evidence, implement
agreed changes and verify them. Reports and dashboards are standalone HTML files.

[Install and use](../guide/install.md) · [Command reference](../guide/reference.md)
