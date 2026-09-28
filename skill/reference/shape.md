# Shape a component contract

Agent procedure for a new component or a material change to an existing contract.
Read existing components, consumers, contribution rules and decisions first. Reuse
answers already supplied; investigate before asking the user technical questions.

Resolve the questions that change what gets built:

- **Need:** what user/contributor task is difficult, and why do existing components
  or compositions not serve it? A local pattern can stay local until sharing helps.
- **Consumers:** which concrete flow will demonstrate the contract? Distinguish
  located consumers from hypothetical future uses; one pilot can be enough to
  validate a new need without proving broad reuse.
- **API and compatibility:** what must vary, what can remain internal, and what
  existing callers must continue to do? Resolve external-consumer uncertainty before
  removing published behavior. Complexity is a design question, not a universal cap.
- **Composition and state:** how does this behave with realistic content, loading,
  error, permissions, responsive layout, themes and surrounding components? Select
  the states that apply; explain unsupported combinations.
- **Accessibility:** define semantic element/role, accessible name, relevant keyboard
  and focus behavior, non-color state signals and applicable target/contrast/motion
  requirements. Use the adopted standard and actual context; [review](review.md)
  explains verification limits.
- **Ownership:** who owns shared decisions and future maintenance? What can consumers
  configure safely, and what requires an extension or a contribution?

If evidence disproves the requested new abstraction, explain the existing path or
propose an extension with reasons. Respect an explicit user choice after clarifying
material tradeoffs. Do not invent unrelated requirements to block progress.

Done when the pilot contract, preserved behavior, consequential choices and
acceptance checks are sufficient to build responsibly. Unresolved questions block
only dependent work. State assumptions and deferred decisions explicitly, then use
the project's component workflow or [scaffold](scaffold.md); review the result with
[review](review.md). No mandatory interview length or fixed number of consumers.

## Record the existing component's spec

For documentation work, cover components that actually exist. Order by observed
consumer reach, then compatibility risk and relevance to the task; use
[census](census.md) for source/import evidence. `consumers` (A9) is **not yet
available**. A local zero-use search cannot clear external consumers of a published
API. A newly proposed component stays a proposal until implemented; do not invent
components to fill documentation categories.

Use the existing spec format, or these eight sections under the layout in
[scaffold](scaffold.md):

| Section | Record |
|---|---|
| 1. Metadata | Status, owner, actual source/export, revision and review date. |
| 2. Overview | Task served; when to use and when not to use. |
| 3. Anatomy | Parts and composition relationships; distinguish implementation from proposal. |
| 4. Tokens used | Actual aliases, upstream mapping and use-site evidence; proposed changes separately. |
| 5. Props/API | Actual imports, props, defaults, events/ref behavior and compatibility obligations. |
| 6. States | Default, hover, active, focus, disabled, error; loading/empty where relevant. Explain not-applicable states; label unsupported or unchecked behavior. |
| 7. Code example | A usage example checked against the current implementation. |
| 8. Cross-references | Foundation/decision specs, known consumers, tests and existing stories or reference. |

Check tokens against source and the unfiltered audit, never memory. Findings can
corroborate a use site but are not a complete list of references; a clean audit
cannot prove a spec complete. Trace imports, theme overrides and unsupported
formats manually when needed, and name the limit. Link the actual Storybook story
when one exists; do not invent a story URL or install Storybook just to fill a cell.
