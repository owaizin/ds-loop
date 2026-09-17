# shape

Design intent, settled before a single file of a new component is written. A
thin answer is a signal to look harder at the evidence — not to accept it and
build.

**Read before asking.** Existing components, the contribution guide, the
foundation docs and recent component PRs already answer several of these for
most repositories. Ask only the questions that are still open *and* whose answer
changes what gets built; carry the rest as findings with their source. A
numbered interrogation the author has to complete before anything proceeds is
not a quality gate — an unanswered question only blocks when proceeding would
commit the project to a decision it has not made.

## Questions

1. **Need & gap** — what problem does this solve that no existing component
   handles? Which existing components did you evaluate and rule out? Why are they
   insufficient?
2. **Usage context** — name 2–3 specific screens or features where this appears.
   Is the consumer a product engineer, or design-system internals only?
3. **API** — variants / sizes / tones on day one vs. deferred to v2. The minimal
   prop surface. Where does this sit against the project's own limits, or against
   the distribution of its existing components? [review.md](review.md) carries the
   caps and their resolution order; they are proposals to measure against, not a
   number this component has to clear.
4. **Composition** — what wraps this (Card, Table row, Drawer)? What does it wrap?
   Behaviour on a dark surface, inside a compact density?
5. **Edge cases** — empty / null content, long text (truncate, wrap, overflow?),
   loading, error, RTL. Who owns each?
6. **Accessibility** — which HTML element or ARIA role does it map to? Interactive?
   Then: keyboard contract (Tab, Enter/Space, Escape). Does colour convey state —
   if so, the non-colour signal? Form control — label association, `aria-describedby`,
   `aria-invalid` from day one? Touch target ≥ 44×44? Contrast for every token pair?
7. **Governance** — what can a product team override without design review
   (className? a token?). What needs a design-system PR + sign-off?

## Evaluating answers

| Signal | Action |
|---|---|
| "Nothing does X" but an existing component does X | Name the file and line. The overlap is the finding; the team decides whether to extend or add. |
| Surface over the project's stated limit | Quote the limit and the count. Over a *proposed* cap with no project limit: report the count and the existing outliers, and leave the call with the team. |
| No specific screens named, and none found in the repository | Say so. A component with no located consumer is built on a guess about its shape. |
| "It'll be used everywhere" | Ask for one concrete file. |
| Interactive, with no keyboard contract or accessible name | Blocks — the missing contract is observable in the code, not a matter of taste. |
| Touch target < 44×44 with no hit-area plan | Report the measured box. Pad it, or record the density exception where the project records exceptions. |
| Polymorphic (`as` prop) with no semantic reason given | Default to a fixed element. |

Every row above is either a located piece of evidence or a question for the
team. None of them is merge authority this playbook holds on its own.

Once the open questions are settled → hand off to `scaffold <component>` (or the
project's own new-component flow).

## NEVER

- Skip a question because the component "looks simple".
- Accept a vague answer silently.
- Start file creation before question 6 is answered.
