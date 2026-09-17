# DS Loop

**Your design decisions shouldn't disappear in the next code change.** A component bypasses a shared token. A theme change misses it. Your next task starts by reconstructing why.

Try the public fixture from a checkout with Node 22.6 or later:

```sh
npm ci
npm run ds-loop -- audit fixtures/radix-colors
```

DS Loop helps you turn conventions into checks and decisions your next task can read. A deterministic engine reports supported token and styling issues with source locations. The companion agent skill helps establish missing conventions, investigate differences, and verify a bounded change against your project's intent.

> “Never hardcode colors, spacing, or typography values.”
> — [Fluent UI's agent instructions, rule 1](https://github.com/microsoft/fluentui/blob/master/AGENTS.md#critical-rules-never-violate)

A written rule tells your agent what to do. A check shows where supported code disagrees. DS Loop checks parts of that commitment in CSS custom properties and Tailwind arbitrary values; your team decides whether a difference is a defect or an intentional exception. The [State of AI in Design Systems survey](https://github.com/kaelig/state-of-ai-in-design-systems) provides broader field context.

No model, API key, runtime network, or runtime dependencies in the engine.

[Set up DS Loop](docs/guide/install.md) · [Choose a workflow](docs/guide/workflow.md) · [Commands and coverage](docs/guide/reference.md) · [Example reports](docs/guide/output.md)

## Use it on your project

From this repository, run `npm pack` to create `ds-loop-0.1.0.tgz`. In an isolated copy of the project you want to inspect:

```sh
npm install --save-dev /absolute/path/to/ds-loop-0.1.0.tgz
./node_modules/.bin/ds-loop context .
./node_modules/.bin/ds-loop audit . --json
```

An audit exits 1 on findings. A `not-checked` result can exit 0 without `--require-coverage`; inspect `verdict` and `coverage`. The [installation guide](docs/guide/install.md) covers the skill, edit feedback and CI.

For agent-guided work, load `node_modules/ds-loop/skill/SKILL.md` and ask:

> Use DS Loop to investigate the inconsistent button styles in our settings screen. Read the shared component and previous decisions. Fix unintended differences within this screen and verify its states and themes. Keep any difference that serves a real need and record why. Link the checks and saved decision.

Keep the whole package installed. The skill's launcher needs the adjacent `bin/` and `dist/` directories.

## Choose your first task

| Your situation | What you provide | What your agent returns |
| --- | --- | --- |
| Start a design system | A real screen, product constraints, and visual direction | A proposed foundation and rendered example, with decisions for your team |
| Improve a partial system | One inconsistency and the intended behavior | A checked change or a reason to preserve the difference |
| Maintain an existing system | A diff, component contracts, and previous decisions | A review with checks, source locations, and unresolved questions |

The [task guide](docs/guide/workflow.md) includes prompts and explains what to review. The [complete worked example](docs/guide/example.md) follows a synthetic theme bug through the request, change, browser checks, and saved decision. Preview the website to use the rendered example.

The skill guides investigation and decisions; the engine measures supported code. Agent playbooks such as `discover` and `review` are not CLI commands. Find commands for auditing, edit feedback, and CI in the [technical reference](docs/guide/reference.md).

## See what it finds

A synthetic component repeats a declared color and uses two arbitrary lengths. The audit reports:

<!-- verified: audit-markup -->
```
  [HIGH] token/raw-value-in-markup
    3 hardcoded value(s) at use sites bypass the token layer
    (1 colour, 2 length; 3 distinct, 1 already declared as a token)
    where: bg-[#1da1f2] at Card.tsx:2; p-[13px] at Card.tsx:2; text-[14px] at Card.tsx:3
    fix:   #1da1f2 is already --palette-blue-500. Swap those first.
```

The matching token is evidence for investigating a replacement. Check its role, theme behavior and consumers before changing the component.

## Know the coverage

The CSS adapter reads custom-property declarations, not ordinary rule bodies or at-rules. The Tailwind adapter reads arbitrary-value strings in JS/TS, not resolved named utilities, inline styles or CSS-in-JS. Sass maps and token JSON are unsupported. A supported extension does not mean the whole file was checked.

The engine cannot decide design intent or verify a rendered experience. Visible changes need browser and behavior checks. The default taxonomy and clustering thresholds are configurable starting points, not universal design policy.

**Status: supervised alpha.** Begin with a bounded task in an isolated checkout and review its result before broader use. [Coverage and limitations](docs/guide/reference.md#coverage) describes the boundaries.

## Develop and contribute

```sh
npm test
npm run check
npm run type-check
npm run smoke
npm run site:serve
```

The last command serves the static website at `http://127.0.0.1:4187`. See [website maintenance](https://github.com/owaizin/ds-loop/blob/main/site/README.md), [engine contribution notes](https://github.com/owaizin/ds-loop/blob/main/CLAUDE.md), and the [methodology](https://github.com/owaizin/ds-loop/blob/main/docs/METHODOLOGY.md). Public examples use open-source or synthetic inputs. Client material stays outside this repository.

The engine is MIT licensed. The self-hosted website font has its own [OFL license](site/assets/OFL.txt).
