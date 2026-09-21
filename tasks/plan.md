# Customer presentation

Deliver a working static site, concise README and task-based documentation for DS Loop. Preserve the engine and existing alpha work.

1. Establish product truth and an editorial visual direction; separate public material from private evidence.
2. Build the landing page around a reproducible finding, then document installation, the adoption workflow, commands and coverage.
3. Replace the long README with a runnable entry and clear routes into the documentation. Keep output verification.
4. Verify snippets, local links, packaging and browser behavior. Inspect desktop and mobile. Obtain independent finish review and record the visual system.

Done means working local previews, verified examples, no broken local navigation, no client disclosures, and an honest report of remaining release limitations. Publishing and npm release are not implied.

## Reference decisions

- [design-system-ops](https://github.com/murphytrueman/design-system-ops): organize the entry around the reader's situation and separate install from the capability catalog.
- [Design System Ops website](https://designsystemops.com/): put the product's purpose and next action in the first viewport. DS Loop adds inspectable engine evidence beside that introduction.
- [Impeccable documentation](https://impeccable.style/docs/): distinguish getting started, workflows and reference in navigation.
- [Matt Pocock's setup skill](https://www.aihero.dev/skills-setup-matt-pocock-skills): explain when to use a skill, what it leaves behind and how to tell it worked.

These references inform information architecture and clarity. No reference artwork, adoption numbers or claims are copied.

## Delivered

Static site and docs in `site/`; local preview via `npm run site:serve` on port 4187. README reduced to 84 lines, with installation/workflow/reference/output under `docs/guide/`. Three real website audit specimens and local-link checks run in CI. The package includes the guide and workflow graphic.

Validation: 50 tests, 17 package smoke checks, type check, lint, three output reproductions and 58 local links. Desktop/mobile browser checks passed within the recorded scope. Independent website finish review: ship, no material fixes. Visual decisions are recorded in `DESIGN.md` and `.impeccable/design.json`.

No deployment or git commit was made. Product System remains outside this delivery. Existing alpha changes remain local alongside this presentation work.

## UX-writing revision — 2026-09-17

User rejected the scanner-led presentation and authorized applying the critique. The earlier finish review matched the old brief; it did not test whether a new reader understood the product.

Completed: homepage now covers Start / Improve / Maintain; guide states user inputs, agent work, outputs, and review criteria; setup links name installation accurately; technical commands and coverage moved to reference.html; example.html shows an authored synthetic job with real CSS, browser measurements, audit findings, and a saved decision. README, Markdown guide, and PRODUCT.md align with that purpose. No engine or Product System changes in this revision.

Verified: 50 tests, 17 package smoke checks, lint, typecheck, three engine output reproductions, and 105 local links/anchors. Browser: desktop/mobile layouts, setup destination, partial-system path, prompt copied exactly, expandable unsupported-source output, and theme example colors/dimensions. After-audit tier limitation remains explicit. Reader comprehension and independent-session retrieval of this new synthetic example have not been tested. Changes remain local and uncommitted; no deployment.

## Connected workflows — 2026-09-17

The user approved restoring the original diagram's explanation: the adoption loop sets direction, audits support scoped changes, and the optional guard supplies feedback during edits. This is a local extension of the existing visual identity, built directly in HTML/CSS. Homepage: a readable three-loop overview between starting paths and the example. Guide: expandable loops and Start / Improve / Maintain choices that change the proposed intervention and deliverable. Ownership remains explicit in text; decisions are retained in existing project records.

Reference interpretation: Impeccable's Designing page is a model for organizing around the reader's starting task and showing concrete outputs. Into Design Systems' article about Romina Kavcic's loop motivates making retained knowledge and feedback visible. No central knowledge service, autonomous repair, trust-level system, or automatic shipping is claimed for DS Loop. Existing warm paper/forest typography and palette remain authoritative.

Sources: https://impeccable.style/designing/#start and https://www.intodesignsystems.com/blog/agentic-design-systems-self-healing-loop (read 2026-09-17).

## Homepage visual correction — 2026-09-17

User rejected the functional workflow revision as visually boring and poor, lacking graphics and icons. A fresh review identified seven material visual shortcomings. Replaced the text-only hero with an actual before/after theme specimen; moved starting paths into an icon-led strip; replaced the twelve-box workflow with a compact cycle and subordinate audit/guard explanations on a forest surface; enlarged before/after proof; condensed coverage; added a concrete task-prompt close. Removed homepage eyebrows, arbitrary path numbers, and Unicode action arrows. This retains the existing palette/type rather than introducing a new identity.

Files: site/index.html, site/home.css, site/home.js. Detailed guide and engine unchanged. Browser checks at 1280, 1106, and 390 pixels: no horizontal overflow, Before switches to the original sample, keyboard Enter selects After and restores the corrected rendered state. Captures show all example frames loaded. Formatting and site checks pass: three engine excerpts, 122 local links. Detector warnings concern the existing paper palette and intentional edge-to-edge frames; reviewed rather than automatically restyled.

Fresh visual reviewer scored all seven listed issues resolved and returned ship for the correction. This is not user acceptance or a full accessibility audit. Changes are local and uncommitted.

## StoryBrand and setup delivery — 2026-09-17

Website ownership moved to the StoryBrand task. Re-read the visual revision before editing; the prior twelve-box workflow critique and missing before/after finding were stale. Preserved the interactive theme specimen, SVG path icons, compact forest workflow diagram, and existing design identity.

Completed: homepage now leads with consistent UI, names repeated decisions and visible inconsistencies, and gives a three-step route to a first task. Primary CTAs lead to a dedicated `site/setup.html`: source build, project installation, a scoped agent prompt, expected results, and native help disclosures. Existing guide install/skill anchors remain usable. Worked example links into setup and the Improve prompt. Installation commands retain the existing Markdown contract. No README, engine, skill, or Product System changes in this task.

Validation: Biome, site examples, local links, and diff whitespace pass. Three saved examples reproduce engine output; 148 local links/assets/anchors resolve. Browser: primary setup route, Before pointer control, After keyboard control, native help disclosure by keyboard, exact command/prompt clipboard contents, and mobile copy-label wrapping. Homepage/setup have no page-level horizontal overflow at 320, 390, and 1106 CSS pixels; setup also checked at 640 and desktop at 1280. Reviewed rendered desktop/mobile composition. Commands retain horizontal scrolling where needed; task prompts wrap. Engine tests were not repeated for this website-only change.

Scope limits: no user comprehension study, independent-session retrieval evaluation, full assistive-technology audit, deployment, push, or commit. In-app automation logged MutationObserver errors without source URLs; shipped scripts do not use MutationObserver and tested interactions passed. Attribution remains unresolved, so this record does not claim an entirely clean browser console. Global visual tokens unchanged; the existing sidecar staleness notification was not repaired as a side effect.

## Product scope, public name, and copy — 2026-09-17

The user corrected the audience to teams maintaining design systems across large or growing codebases. Replaced the isolated button hero with an authored two-screen SaaS comparison: independent Projects/Requests implementations become shared controls, spacing, table patterns, and status language while retaining team/priority differences. Added a dedicated explanation page, broader starting workflows, system scope, adoption guidance, FAQs, and a useful setup close. The original reproducible theme repair remains supporting technical evidence.

Applied the user-selected public name Design System Loops to website text, accessible labels, titles, metadata, and the workflow graphic. Technical `ds-loop` identifiers and generated audit output are unchanged. Ran the explicitly invoked no-ai-slop editing workflow across all six public content pages and supporting copy; changed vague slogans and task language to concrete references to screens, components, conventions, and contributors. Reviewed the final prose against the skill evaluation checklist.

Verification: Biome passes; all three synthetic audits match actual engine output; 173 internal links/assets/anchors resolve. Desktop and mobile browser checks cover the comparison, native disclosure, setup navigation, and exact clipboard text. At 1106 and 390 pixels the final name/copy does not create horizontal page overflow. The fresh finish reviewer identified mobile table scrolling discovery/keyboard access, then scored that fix ship after visible hints, named regions, focus styling, and keyboard access to the final columns. The copy/name follow-up review also returned ship: readable wrapping, no clipping or overlap, and no changed capability claims. Setup was additionally checked at 320px without page overflow. Global paper/forest/Manrope primitives were retained; surface documentation now reflects the current composition. Existing global documentation/sidecar staleness remains recorded without unrelated edits.

Changes are local: no core, root README, skill, Product System, deployment, push, or commit changes. Website package scripts were restored after a concurrent core commit removed them. No full accessibility audit, customer comprehension testing, product-scale performance benchmark, or independent-session memory proof is claimed.

## Canonical singular name correction — 2026-09-17

The earlier plural naming handoff above is historical and superseded. Commit `d26a3cd`, `CLAUDE.md`, and `test/naming.test.ts` establish **Design System Loop**, singular, as the public name. Corrected public website pages, metadata, accessible labels, authored workflow SVG, site README, product brief, surface brief, and current checklist. Technical identifiers, generated evidence, design, and positioning remain unchanged. Historical review captures and records retain the wording they actually reviewed.

## Four-screen reveal and loop redesign — 2026-09-17

The user rejected the earlier two specimens as too alike and too clean, supplying screenshots, and requested four visibly different poor designs, a 2×2 grid, a draggable before/after comparison, and a stronger loop graphic. Rebuilt the illustration with Projects (dense legacy sidebar/table), Requests (top navigation and competing cards), Billing (separate portal), and Members (another admin sidebar and invitation actions). The after version uses a shared shell, controls, type, spacing, and semantic state colors while retaining feature-specific data. This is authored synthetic material, not automated engine output.

The comparison is one registered two-layer scene with pointer capture and a native range control. Home and End reveal complete states; full before/after pages remain linked. Mobile stacks the four screens. The surrounding identity and other page content remain intact. Replaced the square loop with a continuous selectable track around an illustrative project record. Selecting a stage changes its highlighted segment, owner, explanation, and guide link. Reduced-motion preferences remove the transition.

Browser evidence lives in `.impeccable/review/four-screen/`: 1440px desktop, 390px mobile, 1163px user-width full-page views plus before/after and loop closeups. Pointer drag moved the divider from 50 to 80; native Home/End returned 0/100 and 100/0; loop pointer and keyboard selection changed the detail and link. No page-level horizontal overflow at inspected widths. Card footer bounds were checked after correcting clipped rows. An endpoint scrollbar caused by the handle was fixed with local clipping.

Fresh review accepted the four different before structures, common after layout, reveal behavior, loop composition, mobile adaptation, preserved identity, and evidence truthfulness. It requested semantic badge colors, moving a role label below its heading, and updating the surface brief. The follow-up scored all three fixes resolved and returned ship for those scored fixes, with no regressions attributable to them. Surface documentation now matches the four-screen reveal and selectable loop. Formatting and site checks pass (three actual engine-output examples, 176 local links). No core, root README, skills, commits, publishing, or deployment changes.


## Website completion and PR/FAQ alignment — 21 September 2026

The user authorized this task to finish and commit the separately owned website work. The Website manager task was idle. Its visual identity and existing interactive demonstrations were retained. This entry supersedes earlier current-state claims; preceding entries are historical observations.

Updated README, install guide, homepage, setup and workflow guide around usable foundations, components and product patterns, product adoption, a shared reference, and maintenance guidance. Setup now follows install → explicitly load the skill → agree on delivery. Direct engine checks are optional. The FAQ covers deliverables, existing libraries, Storybook, ownership, completion, coverage, background operation, cost and code access. The engine-stage illustration now shows a token bypass rather than implying the engine detects table densities.

As verified today, npm serves 0.2.0 and the source checkout is 0.2.1. The expanded setup procedure is explicitly labeled as source work, with available registry commands and a separate source path. Publication must be verified before switching those notes. No deployment or npm publication is part of this delivery.

Added the static site checks to CI. The checker discovers all public HTML files and checks copy targets as well as links and anchors. Asset provenance is retained in site/assets/README.md; review-only routes and internal README files are excluded from Vercel deployment. The site remains outside the npm package allowlist.

Verification: 230 local links/assets and unique anchors; four reproduced engine excerpts; ten README/naming tests; TypeScript and Biome. Browser review covered desktop and 390/320px layouts, exact install and prompt copying, keyboard prompt copying, workflow selection, native FAQ disclosure, loop pause/selection, comparison range endpoints and workbench selection. No page-level overflow in the inspected homepage and guide widths; setup checked at 390px. Reduced-motion and no-JavaScript implementations were preserved, not newly exercised by changing browser settings. Two source-less MutationObserver console errors appeared in the browser automation session, also recorded by the prior task; the homepage has a guarded MutationObserver attached to the existing playback element, so source absence cannot explain them. A temporary page error listener did not capture the source-less errors; it was removed after inspection. Their origin remains unresolved. No clean-console or full accessibility claim is made.

The full source suite had an independently observed Git-fixture identity conflict earlier today (109/110). It is not changed or hidden by this documentation/site work. Tests specific to the changed documentation pass. The final packed-install smoke passed all 24 checks, including its private-data scan; all 70 staged files also passed the private deny-list scan. Internal PR/FAQ drafts, evaluation archives and unrelated local records remain outside this commit.
