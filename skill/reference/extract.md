# extract

Move a pattern that consumer code has re-implemented into the system, then
migrate the call sites.

**This document is the whole implementation** — a playbook you execute. There is
no `extract` command; anything you report from it is your reasoning, not engine
output. It is written against the evidence this engine actually produces, and it
is deliberately narrow: the engine reads token values, not component structure,
so most of the judgement here is yours and has to be stated as such.

## What the engine can and cannot tell you

`audit <path> --json` unfiltered gives you, per occurrence, `file · line ·
selector · property · tokenName · classification · reason`. Two things in that
record matter here:

- **`tokenName: null` means a use site, not a declaration.** A cluster of use
  sites re-typing the same literal in the same shape is the only extraction
  signal the engine produces. `token/raw-value-in-markup` is where it lands.
- **Occurrences are not the work.** One calibration source reported [redacted]
  use-site literals over **[redacted] distinct values** — the same `text-[11px]`
  recurring across dozens of pages. Group by distinct value and by the shape
  around it before you count anything. Lead with the distinct count; an
  occurrence count reads as hopeless and measures the codebase's size, not the
  decision in front of you.

What it cannot tell you: that a pattern is a component. The adapters read CSS
custom-property declarations and Tailwind **arbitrary values in string
literals**. Resolved named utilities (`rounded-md`, `p-4`), CSS rule bodies, and
anything computed at runtime are invisible to them. **No findings in a directory
is not evidence that nothing is duplicated there** — say which of the two you
have. Structural duplication is `census`'s territory, and `census` is also a
playbook, not a clusterer.

## Sequence

1. **Establish the target's contract first.** `context .` names the intent
   sources it found; read them, and read the ones it does not search for —
   `AGENTS.md`, the contribution guide, foundation docs, component contracts,
   recent component PRs. A pilot in this project spent three paragraphs arguing a
   radius choice was "genuinely open" while the repository it was auditing said
   *never use these utilities* in `AGENTS.md`. Absence of a `DESIGN-SYSTEM.md` is
   not absence of policy.
2. **Locate the pattern in evidence.** Name the call sites: path and line for
   each. A pattern with fewer than three located consumers, or three consumers
   with different intents, does not earn a shared component — report the
   duplication and stop. Two lookalikes serving different purposes stay separate.
3. **Decide the lane, and label it.** Is there an existing commitment this code
   drifted from (**adopt** it), an intentional exception (**maintain** it), or no
   decision yet for this scope (**establish** the smallest one that covers the
   located consumers)? A new foundation presented as a repaired violation is the
   failure mode; say which one this is.
4. **Derive the API from the call sites, not from a target shape.** What varies
   across them is the prop surface; what is constant is the default. `shape
   <component>` carries the open questions worth asking — ask only the ones whose
   answer changes what you build.
5. **Build it the way this project builds components.** Read existing components,
   stories and tests before creating anything. `scaffold.md`'s five-file contract
   is one project's adopted contract, not a requirement; match what is there.
   Never overwrite an existing story file — a harness goes in its own file.
6. **Capture a rendered baseline before the first edit** for anything visible or
   interactive, then verify the same views after. Record pre-existing defects
   separately from regressions; a defect you did not introduce is not yours to
   fix inside this task, and hiding it behind a passing change is worse than
   leaving it visible.
7. **Migrate the located call sites, then delete the old implementations.**
   Leaving both live converts one duplication into a fork. If you cannot migrate
   all of them within the task's permitted scope, migrate none and say what the
   remainder needs — a half-migration is the state this playbook exists to end.
8. **Close the loop.** Re-run the unfiltered audit and whatever observes the
   changed behaviour. Record source revision *and dirty diff*, config hash,
   coverage limits, and what changed. If you changed config, you changed the
   instrument: `scorecard` refuses to call that a delta, and so should you.
   Put the decision where this team already records decisions, and name the path.

## Report separately

Measured results (occurrence and distinct counts, before and after, with the
coverage the audit stated), design judgement (the lane, the API, what you
declined), and unresolved questions. A justified no-op is a valid result of this
playbook.

## Scope

[scope.md](scope.md) applies before editing. Findings do not grant scope: an
audit that surfaces [redacted] distinct values does not authorise touching [redacted] of them.
