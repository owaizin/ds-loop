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
2. if it is not a `.css` / `.scss` file — exits silently
3. runs `ds-loop audit <cwd> --files <that file> --min-severity high --quiet --json`
4. if there are `high`+ findings — prints them to stderr and exits 2, so the
   agent gets them as feedback; otherwise exits 0 silently

**Coverage notification policy.** The hook runs at `--min-severity high`, which
legitimately hides low findings — it must not also hide the fact that part of the
source could not be read or judged. Three channels, three jobs:

| Channel | Job | Frequency |
|---|---|---|
| `ds-loop context` | State the scope limits before work starts | once per session |
| this hook | Report a coverage **change** | first sight, then only when it changes |
| `audit --require-coverage` | Make a green pipeline mean "checked and clean" | every CI run, opt-in |

The hook keeps a signature at `node_modules/.cache/ds-loop/guard-coverage.json`.
Repeating a limitation after every save would train the agent to ignore this
channel, which is worse than saying it once.

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

## Not yet

The blocking half — token CSS/JSON parity, the 5-file component contract, the
MDX validators — and the `scorecard` timeseries. Those ride in when `tokenize` /
`scaffold` exist. For now `guard` is the live-edit nag only.
