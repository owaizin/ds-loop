# DS Loop: social launch handoff

Prepared October 15, 2026 for continuation in a separate Codex chat.

## Request and status

The user wants to promote DS Loop on LinkedIn and X using the positioning and website work already agreed. They asked for this document so the social work can continue elsewhere without extending the website discussion.

The plan below is a proposed starting experiment, not a committed publishing calendar. No social posts have been published or scheduled. No outreach has been sent. The user has not supplied account handles, a launch date, or a confirmed public destination URL. Prepare drafts and assets first; publishing, scheduling, and contacting people require explicit authorization.

The user said “BSU” in the initial social question; the conversation interpreted this as DS Loop. Use **DS Loop / Design System Loop** in drafts.

## Decisions to carry forward

- Product baseline is **0.4.0**. The user corrected an accidental mention of 0.4.1. Do not make the campaign about older versions or release history.
- Apply April Dunford’s Obviously Awesome positioning framework. This is our application of her method, not a personal audit or endorsement by April.
- Write plainly, concretely, and in the founder’s voice. Use the `no-ai-slop` skill and 37signals’ writing principles. Do not imply 37signals wrote or endorsed the copy.
- The user approved the original hero headline with the edited body copy. Do not reopen headline exploration without a reason.
- Preserve the established visual identity when creating social assets: violet-black/lilac, moderate-weight Manrope, spectral graphics, glass controls, ruled sections, and careful spacing. The user explicitly rejected a wholesale redesign.
- Keep the website’s graphics and demos on the homepage. Social promotion does not require another SaaS example page or a website redesign.

## Approved message

**Headline:**

> Build and improve your design system with your coding agent.

**Current homepage supporting copy:**

> DS Loop helps your coding agent build shared components, use them in your screens, and write down how they work. For teams doing design-system work without enough time or people.

**Plain category:** an open-source design-system toolkit for coding agents.

The meaningful promise is a workflow from repository evidence to a decision, an authorized implementation, verification, and a useful handoff. A report is one output of that work.

## Positioning behind the campaign

| Element | Working position |
| --- | --- |
| Best-fit audience | Product teams already shipping with coding agents, with repeated UI patterns and too little time or design-system capacity. |
| Recognizable problem | Shared components exist, but the next screen still introduces its own inputs, spacing, and button styles. Shared-system work keeps getting postponed. |
| Likely alternatives | Direct a general coding agent through isolated UI tasks, manually review consistency, and postpone work on shared patterns. These alternatives are hypotheses, not customer research findings. |
| Relevant capabilities | Local repository checks plus a companion skill that helps the agent investigate, recommend, preserve legitimate decisions, implement agreed work, verify, and document. |
| Value | Know which system work matters, get shared foundations into product screens, and leave guidance the next contributor can use. |

Audience fit and competitive differentiation still need testing with users. Do not claim “only,” “best,” or that other agents cannot perform this work. Component libraries can be foundations DS Loop uses.

## Evidence and claim boundaries

The engine performs local deterministic checks on supported source formats. The companion skill guides a separate coding agent. The team chooses what changes.

Current README coverage: CSS custom properties and ordinary CSS rules; Tailwind classes in JavaScript/TypeScript; DTCG/Style Dictionary token JSON; bounded SCSS/Sass extraction. Vue/Svelte and CSS-in-JS are not currently supported. Do not describe these checks as complete visual, runtime, or accessibility certification.

The local engine does not need a model or API key. The external coding agent has its own costs and data boundaries. Avoid blanket “everything stays private” claims.

### Strongest completed public example

The website contains a small theme-delivery demo with before/after source, token-only audits, a consulting report, browser observations, and a handoff:

- A dark-mode action button used the wrong color.
- Two CSS declarations changed to use theme action aliases.
- The light-theme color and button geometry were preserved.
- The dark-theme action color became `#9ab8ff`.
- The relevant token-only finding groups went from two to zero.

Label this **a demo project**. It demonstrates one completed change and the reasoning/checks around it. It does not prove customer ROI, a whole design-system migration, broad accessibility compliance, or autonomous operation. Read the actual evidence files before quoting precise results.

The SaaS comparison, spectral loop, and screen assembly are authored illustrations. Do not present them as recordings of automated implementation. The consulting report’s “The big picture” graphic informs the diagnosis → proposed outcome → delivery → verification story; an authored proposal is not completed delivery.

The theme fix is enough to explain the workflow. The next stronger proof should show a shared component used in an actual product screen, with source changes and checks, to support the broader promise.

## Proposed two-week experiment

Start from the founder’s personal LinkedIn and X accounts. Working target: **five relevant teams attempt a real task**. This is a planning target, not a forecast.

Use three core stories per week, adapted to each platform. This is a manageable starting cadence to test, not a claim about either platform’s algorithm. Choose dates when the assets and setup path are ready.

| Post | Story | Evidence or asset | Desired next step |
| --- | --- | --- | --- |
| Week 1 / 1 | The next screen keeps recreating UI that should be shared. Introduce DS Loop through that problem. | Short demo clip and approved product explanation. | Recognize the problem and visit the start page. |
| Week 1 / 2 | Walk through the completed dark-mode fix. | Problem → finding → decision → source diff → browser check. | Inspect the worked example. |
| Week 1 / 3 | Explain why we preserved the existing palette and changed only the relevant declarations. | Annotated before/after source with the decision explained. | Discuss how teams make similar decisions. |
| Week 2 / 1 | Show one supported setup and one useful first task. | Fresh-environment installation and agent prompt. | Try it on one screen or component. |
| Week 2 / 2 | Share an actual trial lesson: what helped, failed, or needed clarification. | Real observations, with permission if someone else’s work is shown. | Improve the workflow and invite useful feedback. |
| Week 2 / 3 | Invite the next small group of relevant teams. | Clear project fit, task examples, and what help is available. | Attempt a scoped task and report the outcome. |

If there are no external trials by the fifth post, show an honestly labeled internal trial or setup obstacle. Do not invent users, quotes, or results to fill the calendar.

### LinkedIn treatment

Use a recognizable team problem, a point of view grounded in the work, one example, and one next step. Prefer a narrated clip or a few annotated images. Explain why the decision matters to a product team. Ask about a concrete experience rather than adding an empty engagement question.

### X treatment

Lead with one concrete observation or result. Use the clip, a source diff, or a before/after image. Use a short thread only when the sequence needs it. Adapt the story to a technical conversation rather than pasting the entire LinkedIn post.

### Consistent call to action

> Try DS Loop on one screen or component you want to improve.

Link to the verified public homepage/setup path. Offer hands-on help when someone expresses interest. Avoid making every post ask for a different action.

## Prepare before publishing

1. Verify the public homepage → installation → companion skill → first useful task in a fresh supported project. The local source uses the selected copy; public deployment and package availability have not been verified for this campaign.
2. Produce a 45–60 second captioned demo of the completed theme fix. Show the problem, evidence, preserved decision, two-declaration change, and checks. Use the established graphics briefly for recognition; allow enough time to read the actual result.
3. Prepare the first LinkedIn draft and an X adaptation, plus a clear thumbnail or annotated still.
4. Confirm the public destination and use separate campaign links for LinkedIn and X. Do not share localhost links in public posts.
5. Keep a simple trial log: source, project fit, installation attempted, task attempted, reviewed improvement completed, and where the person got stuck.

Record qualified conversations and completed work alongside clicks and impressions. Ask trial participants what they would have done without DS Loop; this tests the assumed alternatives. Use the answers to improve the message and onboarding.

## Starting LinkedIn draft

This is a draft for refinement, not approved or published copy:

> Your team has shared components. The next screen still gets its own inputs, spacing, and button styles.
>
> I’m building DS Loop to help your coding agent work on the design system as it changes the product.
>
> This demo follows a small dark-mode fix: what the checks found, what we chose to preserve, what changed in the code, and what we tested.
>
> If you’re using a coding agent and shared-system work keeps getting postponed, try it on one screen. I’d like to hear where it helps and where it gets stuck.

Add the verified public link when preparing the final draft. The accompanying clip must exist and match the claims.

## Source map for the next chat

Local repositories:

- Product: `/Users/owais/Documents/GitHub/ds-loop`
- Website: `/Users/owais/Documents/GitHub/ds-loop-site`

Read these before developing final assets or making new product claims:

- Product `README.md`: current capabilities, setup, supported formats, and limits.
- Product `VISION.md`, `CLAUDE.md`, and `skill/SKILL.md`: ambition and the agent workflow. Distinguish vision from demonstrated behavior.
- Product `docs/assets/consulting-delivery/overview-desktop.png`: the user-confirmed “The big picture” graphic.
- Website `POSITIONING-REFRESH.md`: positioning rationale. Later approved copy in `COPY-COMPARISON.md` and `site/index.html` supersedes earlier copy proposals.
- Website `COPY-COMPARISON.md`, `site/index.html`, `site/home.js`, and `site/report-stage.js`: selected copy, including dynamic content. As of October 15, the chosen edited body copy is applied to the main homepage.
- Website `site/worked-example.html` and `site/samples/theme-delivery/`: performed demo and evidence. Read `handoff.md`, `browser-checks.json`, the audit JSON, and before/after CSS.
- Website `AGENTS.md`: instructions for any website changes. Generated `site/guide/` content must not be hand-edited.
- Writing skill: `/Users/owais/.codex/skills/no-ai-slop/SKILL.md`.
- Positioning skill: `/Users/owais/.agents/skills/obviously-awesome/SKILL.md`.

The local copy comparison at `http://127.0.0.1:4187/copy-preview.html?copy=edited` is a review artifact, not a public campaign destination. Its snapshots do not automatically follow homepage changes.

Primary guidance used in the discussion:

- [April Dunford: A Quickstart Guide to Positioning](https://www.aprildunford.com/post/a-quickstart-guide-to-positioning)
- [37signals: Copywriting is Interface Design](https://basecamp.com/gettingreal/09.7-copywriting-is-interface-design)
- [37signals: Sound Like You](https://37signals.com/podcast/sound-like-you/)
- [LinkedIn: Creating videos for the feed](https://www.linkedin.com/business/talent/blog/talent-acquisition/how-create-videos-for-linkedin-feed)
- [X: Guide for businesses and professionals](https://business.x.com/content/dam/business-twitter/en/resources/downloadables/guide-for-businesses-and-professionals.pdf)

These sources inform the approach; they do not validate audience fit or guarantee campaign performance.

## Suggested opening request for the next chat

> Read `/Users/owais/Documents/GitHub/ds-loop/docs/SOCIAL-LAUNCH-HANDOFF.md` and the relevant local sources. Continue the DS Loop LinkedIn and X launch preparation. Start with the first demo storyboard and platform-specific post drafts, grounded in the completed theme example. Preserve the approved positioning, founder voice, and visual style. Identify any missing evidence or setup issue before we publish. Prepare the work for review; do not publish, schedule posts, or contact anyone yet.
