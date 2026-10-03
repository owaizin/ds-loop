# Turn evidence into a consulting report

Run `<skill-base-dir>/bin/ds-loop report . --consult consult.json` after writing the
assessment. This is an agent procedure; the engine does not interview the team or
invent a plan.

1. Read the repository instructions and recover the user's goal. Run `context`,
   then an unfiltered `audit --json`, then `consumers --json` if a workspace exists.
   Inspect the relevant sources and product flow. Keep scope and coverage with the
   evidence; the high-severity guard does not replace this audit.
2. Offer: “I've looked through your code. Want me to ask you a few quick questions,
   or go ahead with what I found?” Ask at most five questions, one at a time, with
   a short example answer and plain words. Do not ask what the repository answers.
   Never assume an answer. Reuse the user's previous choice and authorization.
3. Load the [consultant role](../roles/consultant.md) and its
   [practice guides](../roles/consultant.md#what-good-looks-like). Carry the specific
   published source URL into every supported recommendation. Where no public source
   states it, write **our own opinion**; never attribute our recipe to another system.
   Use [system-review](system-review.md) for a broad assessment and
   [adoption-plan](adoption-plan.md) for replacement planning and estimates.
   Write `consult.json` using the schema in
   [the command reference](../../docs/guide/reference.md#consultjson-schema).
   Describe the problem, cite practices and name the systems they come from,
   propose an after-state and architecture, and order steps by dependency. Every
   step says what changes, why, and how to check it worked. Include relevant
   file:line, registered rule ID or URL references in every claim's `evidence`.
   A citation must support the specific claim. Counts are not grades, proof of
   business harm, or promised savings. Distinguish observations and inferences.
4. When proceeding without an interview, record assumptions in `assumptions`.
   An empty `evidence` array is allowed but renders as **unsupported**, never fact.
   Use that for unknown intent, not fabricated evidence. Proposal boxes and links
   use observed / inferred / proposed / not-checked statuses. Reuse the existing
   proposal schema; mark changes proposed and cite the facts behind them.
5. Run the command. Fix every listed validation error. Open the generated HTML and
   check its coverage, source links and before/after distinction. No consult file
   is required for a measured report; its assessment sections will say not written.
6. Tell the user the report's file path and the three most useful places to look:
   the problem and assumptions, current evidence and coverage, and the proposed
   plan with verification. Name specific observations from this run. Reuse existing
   authority for delivery; a report does not itself authorize shared-policy changes.

Before calling a subsequent implementation complete, rerun the unfiltered audit
and relevant behaviour checks. Retain the team's decisions in their existing home.
