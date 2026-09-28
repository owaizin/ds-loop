# Make the system readable and maintainable

Agent procedure for an authorized transformation of an existing system, including
making it usable by future coding agents. No `ds-loop transform` CLI exists.
For a fresh system, [establish](establish.md) defines the build deliverables; use
this journey for its relevant documentation and adoption work without pretending
there is existing code to migrate. A specific repair skips unrelated steps.

Read [routing](routing.md), recover the goal and apply [scope](scope.md). An audit
or inventory request does not authorize migration. Resolve foundation decisions
and the migration boundary before dependent edits; retain existing delegation,
so routine work within an agreed choice does not need another permission prompt.
Use [engagement](engagement.md) for the plan and evidence labels.

## Nine steps

Each step produces a named result. Engine facts inform choices; the agent owns
investigation and execution; the team or its delegated owner decides shared policy.

1. **Baseline.** Input: requested scope, source revision/dirty diff, installed engine,
   config and existing commitments. Run `<skill-base-dir>/bin/ds-loop audit . --json`
   unfiltered; retain its result and coverage. For an agreed measurement history,
   run `scorecard .` (`--dry-run` previews without recording). Inspect actual imports
   and exports for consumer evidence. Output: attributable baseline with unread and
   unjudged areas. Agent records facts; team confirms unresolved scope. No code means
   no code baseline, not a zero-defect system.
2. **Problem list.** Input: baseline, representative source and rendered behavior.
   Group by foundation using category counts, distinct values, top files and ratios;
   distinguish observed facts from inferred user/maintainer impact. State evidence,
   affected consumer, uncertainty and possible intervention for each problem. A
   literal's presence is not a prohibition, and frequency alone is not priority.
   Output: problem list in the existing task. Agent diagnoses; team sets priorities.
3. **Synthesis.** Input: problems plus component/consumer evidence. Use
   [census](census.md) to identify what is coherent, what is fragmented and the next
   decision. Output: a recommendation grounded in the actual system, including what
   to retain. Agent recommends; unresolved product tradeoffs go to the existing owner.
4. **Foundation decisions.** Input: product constraints and the next decision. Use
   [foundations](foundations.md) to compare two or three viable options, with a
   recommendation, from a kit, existing upstream or independent derivation. Output:
   choice, rationale, source, adaptations and migration consequences in the team's
   decision home (for example `decisions/NNNN-<foundation>.md`). Team or delegated
   owner decides; proposed choices remain proposed until resolved.
5. **Token layers.** Input: decided foundation and authorized scope. Follow
   [tokenize](tokenize.md): upstream/local primitives, project aliases with fallbacks,
   then component consumers; component tokens only where needed. Configure naming
   from actual commitments, including `upstreamPattern` when applicable. Output:
   working sources, mappings and required parity checks. Agent implements; shared
   deviations return to the decision owner.
6. **Specs.** Input: actual sources and decisions. Use [scaffold](scaffold.md) for
   foundation specs and a token reference, then [shape](shape.md)'s eight sections for
   existing components, ordered by observed consumer reach. Link stories where they
   exist. Output: source-backed contracts discoverable from the normal entry point.
   Agent drafts and checks; the existing maintainer owns the adopted contract.
7. **Bounded migration.** Input: a decided mapping and named consumer slice. Capture
   rendered behavior first. Inspect audit token suggestions; choose replacements by
   role, mode and compatibility, keeping ambiguity visible. Preview `fix <path>` for
   mechanical fallback edits only; `--write` remains scoped. Record intentional
   exceptions with reasons; verify config suppressions separately from prose. Run an
   unfiltered audit of the slice and relevant token context, project checks and the
   after render; also rerun the agreed baseline scope for comparisons. Output:
   adopted slice, remaining findings and regressions/limits. Agent executes within
   authority; broader scale or consumer changes need a scope decision.
8. **Maintenance path.** Input: verified contracts and actual project entry points.
   Use [guard](guard.md) to update the existing AI instruction file and configure
   edit feedback when requested. The team chooses CI policy independently; demonstrate
   its failure path before claiming enforcement. Output: instructions, checks and
   ownership that can be found and used. The hook cannot prevent an edit or replace
   the unfiltered audit.
9. **Completion record.** Input: the requested outcome and before/after evidence.
   Use [engagement](engagement.md): ratios only when comparable, remaining findings
   and reasons, decision links, slices done/not done, rendered states and reviewer,
   coverage gaps and next action or stop. Output: an honest account, not a green gate.
   Agent reports; team acceptance follows its existing process. For adoption pilots,
   test fresh-context retrieval before claiming the next session can use the record.

## Current capability limits

`audit` includes suggestions for supported style/markup literals; suggestions are
not replacements. Exact-token replacement is not implemented or authorized by this
playbook. `fix` only inserts mechanically provable fallbacks and preserves upstream
internals. `map` (A6) and `consumers` (A9) are **not yet available**: write alias
mappings and inspect imports manually, recording scope and uncertainty. A generated
token-reference command is also not shipped. The kit is optional throughout.

An inventory can finish at synthesis. An approved no-op can finish with its reason.
A system-wide assignment continues through its agreed deliverables; a working pilot
is a checkpoint, not permission to call the whole system complete. Resume from the
retained record instead of restarting the interview or silently expanding scope.
