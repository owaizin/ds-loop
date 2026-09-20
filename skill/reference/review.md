# Review a component or shared change

Agent procedure, not an engine command. Review against the project's actual
contracts and the requested outcome. State scope, evidence, and unverified areas.
The npm engine checks supported token values; it does not check component API,
Storybook structure, accessibility, or product behavior.

## Establish the review

Recover the requested component/diff, base revision where relevant, affected
consumers, intended behavior, and compatibility commitments. Read applicable
instructions, contribution guidance, decisions, tests and examples. Conflicting
requirements need a reasoned resolution; one filename has no automatic precedence.

Scale work to the change. A narrow review checks the touched contract and relevant
consumers. A new or substantially changed API may need [shape](shape.md), including
on an existing component. An explicit source-only review is valid but cannot claim
rendered or behavioral verification. A “full review” still has a named scope.

## Inspect relevant obligations

| Area | What to establish | Useful evidence |
|---|---|---|
| Consumer API | Props, defaults, events, refs and exports match supported usage and framework conventions. Breaking changes have a compatible path. | Component/types, public docs, consumer builds, focused tests. |
| Reuse and complexity | The contract serves a demonstrated need; variants and extension points have clear behavior. | Real consumers, stated limits, relevant usage patterns. |
| Styling and themes | Effective values and state combinations honor the applicable design decisions. Intentional geometry, chart colors or exceptions stay distinguishable. | Token sources, computed styles, rendered themes and supported contexts. |
| Behavior | Loading, empty, error, disabled and other relevant states preserve data, permissions and interaction semantics. | Reproductions, interaction tests, representative consumer. |
| Accessibility | Accessible name/semantics, keyboard behavior, focus, contrast, target sizing and motion meet applicable requirements. | Actual rendered checks, accessibility runner, manual checks where needed. |
| Examples and guidance | A consumer can find, import and use the component; docs match its API and important states. | Source, documentation build, example use, discovery path. |
| Packaging and ownership | Library dependencies and exports fit its boundary; ownership and adoption guidance exist for shared changes. | Package metadata, consumer integration, contribution/release process. |

Apply local thresholds only when adopted and relevant. If no API cap is agreed,
report complexity with specific evidence; do not fail an arbitrary prop count.
A repository search with no hits does not establish that external consumers do not
use a public prop. Required/optional props and event names follow the contract, not
a generic house style. Ref handling follows the installed framework, not a mandatory
`forwardRef` pattern across all projects.

Stories should demonstrate meaningful supported states and combinations. A full
Cartesian matrix or prescribed `Default`/`Playground` filenames is not universally
necessary. Test keyboard behavior in the existing appropriate harness. Story tags,
MDX structure and autodocs follow the project's working documentation setup; preserve
valid arrangements. Run its build rather than inventing syntax rules.

For accessibility, state the actual criterion and test conditions. All overlays do
not share a modal focus trap; use the interaction's semantic contract. Do not equate
44px with every target-size requirement: WCAG 2.2 AA's target-size criterion has a
24 CSS pixel minimum and exceptions, while teams can adopt stronger requirements.
See [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Automated accessibility checks alone do not establish conformance. Resolve contrast
from rendered foreground/background pairs and relevant states, not token names.

## Report actionable results

Each finding names the location, observed behavior, violated obligation or affected
user task, evidence/confidence, and a feasible repair or next diagnostic step.
Separate **confirmed defect**, **proposal**, and **not checked**. Severity describes
impact within scope; it does not grant this agent merge authority or change engine
rule severities.

Lead with the requested review outcome and the most consequential results. Link
supporting detail rather than fabricating a pass count for unrun checks. Preserve
pre-existing issues separately from introduced regressions. Repair only within
existing authorization, then repeat checks that could detect the failure.

Done when the requested review has been delivered with evidence and limitations,
or the authorized repair meets its acceptance criteria. Use
[engagement](engagement.md)'s receipt for decisions and continuation. A finding can
remain open at the end of a review; a failed required check cannot be labeled a
verified implementation.
