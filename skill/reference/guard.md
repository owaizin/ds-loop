# guard

Install a hook so ds-loop audits a style file the moment it is edited, and
surfaces high-severity findings back to the agent.

```bash
<skill-base-dir>/bin/ds-loop guard on      # install the PostToolUse hook in ./.claude/settings.json
<skill-base-dir>/bin/ds-loop guard status  # is it installed, and where does it point
<skill-base-dir>/bin/ds-loop guard off     # remove it, leaving every other hook in place
```

## What `guard on` installs

A `PostToolUse` entry matching `Edit|Write|MultiEdit`. After any such edit the
hook (`skill/hooks/ds-loop-guard.mjs`):

1. reads the payload, pulls the file path
2. if it is not a `.css`, `.scss`, `.sass`, `.jsx`, or `.tsx` file — exits silently
3. runs `ds-loop audit <cwd> --files <that file> --min-severity high --json`
4. if the audit fails, times out or returns no usable report — states that the edit
   was not checked, reports the error and exits 2; it does not update the coverage cache
5. if there are `high`+ findings — prints them to stderr and exits 2, so the
   agent gets them as feedback; a new project extraction gap also exits 2;
   otherwise exits 0 silently

**Coverage notification policy.** The hook runs at `--min-severity high`, which
legitimately hides low findings — it must not also hide the fact that part of the
source could not be read or judged. The delivery channels are:

| Channel | What it actually delivers | Frequency |
|---|---|---|
| `ds-loop context` | Project shape: config, declared intent, **extraction** limits | once per session |
| **`ds-loop audit .` unfiltered** | **The only channel for rule-judgement limits** — which checks could not judge this source | at session setup, and again before calling a change complete |
| this hook | Project **format** changes, **high-severity** findings on the edited file, or an audit execution failure | per edit; the format notice only on change |
| `audit --require-coverage` | Fails on reported coverage gaps and findings at the chosen severity; pass applies only to the stated scope | every CI run, opt-in |

**The hook does not deliver judgement limits, and neither does `context`.**
`token/tier-model-undetectable` is low severity, so the hook's `--min-severity high`
filter removes it; `context` runs no rules, so it cannot know. An earlier version of
this document claimed those limits "reach the agent through the findings list" —
false while the hook filters that list. The unfiltered audit is the channel, and it
has to be run deliberately.

The hook keeps a signature at `node_modules/.cache/ds-loop/guard-coverage.json`,
keyed on **project-scoped** facts only. Repeating a limitation after every save would
train the agent to ignore this channel, which is worse than saying it once.

The hook runs after the write has landed. It provides feedback and cannot block
the edit.

## Rules that surface

The default policy delivers only `high` and `blocking`. Medium and low findings
remain available in an unfiltered audit. This policy does not establish that a
lower-severity finding is unimportant to this product. For example, this supported
mapping in `.ds-loop-config.yml` promotes the tier-leakage rule to blocking:

```yaml
severity:
  tier_leakage: critical
```

`token/stock-palette-utility` needs an explicit `tokenContexts` association for the
edited consumer. It remains medium by default, so the hook filters it even with
context available. If the project deliberately promotes this rule, configure both
the mapping and `severityOverrides` in `ds-loop.config.json`. Run a known failing
example through the actual hook before relying on the feedback. See
[audit](audit.md) for context and scope limits.

The hook reports findings in the edited file; without a before-edit comparison it
cannot establish that the edit introduced them.

## Merging

`guard on` appends to `PostToolUse`; it does not replace the array. `guard off`
removes only the ds-loop entry (matched by the `ds-loop-guard.mjs` path) and drops
the `PostToolUse` key only if nothing else is left. Other hooks, permissions, and
settings are untouched. `guard on` twice is a no-op.

## Separate checks

Token CSS/JSON parity, component file contracts, and MDX validation require
project-specific checkers and CI wiring. The hook does not run them or agent
review judgments. `scorecard` exists as a separate CLI and is not installed by
`guard on`.
