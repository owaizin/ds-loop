# Phase 7 brief for Codex — packaging and the first run

Read first: `VISION.md`, `CLAUDE.md` (the distribution and naming sections), `README.md`,
`package.json`, `skill/SKILL.md`. No git writes, **no `npm publish`, no `git push`** — the owner
releases.

Everything built so far is worthless if a stranger cannot get to it. The vision's success test is:
someone installs it, types one command, and within half an hour is reading an agency-grade report
of their design system and a plan they'd have paid a consultant for. This phase makes that true.

## 1. One command

`npx ds-loop` must carry a first-time user all the way to the report, not just print an audit.

- On a repo with no `.ds-scorecard/` and no prior run, the bare command should: read the code, print
  the plain-words summary, write the report, and tell the person the two things worth looking at
  and how to bring in the agent for the consulting half. One screen, no flag manual.
- Every exit still names the next command, per `src/core/next.ts` and `test/next.test.ts`.
- Nothing about this may make a not-checked source look checked.

## 2. Plugin and skill packaging

- A Claude Code plugin manifest so the skill, its playbooks, roles, practices and the guard hook
  install together. Follow the current plugin format; do not invent one. Verify by installing it
  into a scratch directory and running it.
- A Codex-compatible skill entry point, since the kit should not assume one vendor.
- `package.json` `files` must ship everything the skill now needs (`skill/roles`, `skill/practices`,
  `benchmarks/`). Verify with `npm pack` and by listing the tarball, not by reading the manifest.
- `npm run smoke` must still pass, including the private-name scan over **every packed file**.

## 3. The landing page

`site/` is owned by the website task, so **do not edit existing site pages**. Add a new page under
`site/` only if nothing conflicts, otherwise write the copy to `docs/site/landing-copy.md` and stop.

The copy follows the repo's writing standard: hook, problem, a runnable command in the first ten
lines, real output pasted unedited, install and use before architecture, limits in their own
section, no comparative claims about other tools, no invented numbers or endorsements. Every
example is synthetic or open source: "Example DS", `--ds-*`. Nothing from any engagement.

## 4. Version and changelog

- Bump to the next minor, update `CHANGELOG.md` with everything from phases 1–6, and pin the
  install commands in `README.md` to that version.
- Do not tag, publish or push. Write the exact release commands into
  `docs/plans/2026-09-29-release-checklist.md` for the owner to run.

## Acceptance

- `check`, `type-check`, `test`, `npm run build` and `npm run smoke` all pass.
- A packed install in a temp directory runs `ds-loop`, `report` and `dashboard` successfully on a
  fixture — the published artifact, not the source checkout.
- `docs/plans/2026-09-29-phase-7-report.md` records the tarball contents, the smoke results, and
  anything the owner must do by hand.
