# Website release handoff

The website now lives at https://github.com/owaizin/ds-loop-site. Its local checkout is a sibling directory named `ds-loop-site`. The Vercel project and public domain are unchanged.

## When changing behavior

1. Update the relevant files in `docs/guide/` with the implementation. Keep commands, config, coverage limits and release notes accurate.
2. Run `npm run docs:check` and the normal package tests. The existing verified-output tests still exercise README and guide claims.
3. Publish a stable npm release. `package.json` must keep `docs/guide` in the package file list. Documentation-only fixes need a patch release.
4. Within the next scheduled run (hourly, subject to GitHub scheduling delays), the website's sync workflow pins the new package, renders its Markdown, runs executable examples, and opens an update PR. To run immediately, open the website repo's Actions → Sync published DS Loop release → Run workflow.
5. Review and merge the website PR. Vercel runs validation and deploys main to the existing public URL.

No second handwritten technical guide, npm credential, or cross-repository access token is needed. Marketing claims and illustrations are editorial: review them when a release changes what the product promises. Sync failures stop the update; inspect the failed Actions run rather than manually copying partial docs.

The PR documentation check requires a docs/guide update for public implementation changes. A maintainer can use the `docs-not-required` label for internal changes with no documented behavior impact. This is a review guard, not proof that prose is correct.

Historical website code remains in this repository's Git history. Handwritten source-preview pages and migration provenance were preserved in the website repository. Local untracked design experiments were not deleted.
