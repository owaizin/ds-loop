# scaffold

Generate the structural skeleton: the Storybook spine, the foundations pages, the
5-file component contract, the validators.

Status: **agent procedure; no generator CLI is shipped**. The structure below is
an example for a React/Storybook project that has adopted this contract. Inspect
existing stories, framework and contributor requirements first. Preserve another
valid structure; do not add five files or Storybook merely to satisfy this example.

## `scaffold storybook`

- The sidebar spine, pinned in `storySort`: Overview → Foundations → Content
  Guidelines → Primitives → Components (by category) → Patterns → Pages.
- Foundations pages generated *from the tokens*, not hand-maintained tables.
- The three migration lanes with their coloured banners (canonical / preview / legacy).
- Theme toggle in the toolbar; `.dark` class + `data-theme` hoisted to `<html>`.

## `scaffold component <Name> <category>`

The 5 files, in order, with the accessibility baseline and token-only styling
already wired:

1. `lib/<name>.tsx` — typed `forwardRef`, `displayName`, tokens only.
2. `lib/index.ts` — export component + props type + every public union type.
3. `stories/<Name>.stories.tsx` — `Default`, `Playground`, `UsageMap`; JSDoc on meta; no `autodocs`.
4. `stories/<Name>.features.stories.tsx` — `VariantMatrix`, `States`, `play()`; `tags: ['!autodocs']`.
5. `stories/components/<category>/<Name>-guidelines.mdx` — the tiered section set.

Run `shape <Name>` first. Then `review <Name>` before the PR.

## `scaffold validators`

If the project adopts these contracts, implement its own validators for the
chosen file structure, MDX syntax/story references or token parity. Run each
checker against a known violation before calling it enforced, then wire it into
CI if requested. None of these validators is supplied by DS Loop. Reuse suitability
remains review judgment.
