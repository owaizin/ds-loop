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
4. if there are `high`+ findings — prints them to stderr and exits 2, so the
   agent gets them as feedback; a new project extraction gap also exits 2;
   otherwise exits 0 silently

**Coverage notification policy.** The hook runs at `--min-severity high`, which
legitimately hides low findings — it must not also hide the fact that part of the
source could not be read or judged. The delivery channels are:

| Channel | What it actually delivers | Frequency |
|---|---|---|
| `ds-loop context` | Project shape: config, declared intent, **extraction** limits | once per session |
| **`ds-loop audit .` unfiltered** | **The only channel for rule-judgement limits** — which checks could not judge this source | at session setup, and again before calling a change complete |
| this hook | Project **format** changes, and **high-severity** findings on the edited file | per edit; the format notice only on change |
| `audit --require-coverage` | A CI gate: green means checked *and* clean | every CI run, opt-in |

**The hook does not deliver judgement limits, and neither does `context`.**
`token/tier-model-undetectable` is low severity, so the hook's `--min-severity high`
filter removes it; `context` runs no rules, so it cannot know. An earlier version of
this document claimed those limits "reach the agent through the findings list" —
false while the hook filters that list. The unfiltered audit is the channel, and it
has to be run deliberately.

The hook keeps a signature at `node_modules/.cache/ds-loop/guard-coverage.json`,
keyed on **project-scoped** facts only. Repeating a limitation after every save would
train the agent to ignore this channel, which is worse than saying it once.

It **never blocks** the edit — a PostToolUse hook fires after the write already
landed. It nags; it does not stop.

## Rules that surface

Only `high` and `blocking`. `medium` / `low` on every save is noise. To see
everything, run `ds-loop audit` by hand. To promote a rule for a project, set its
severity in `.ds-loop-config.yml` (`tier_leakage: critical`).

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
