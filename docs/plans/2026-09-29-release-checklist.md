# Owner release checklist — ds-loop 0.4.0

The owner releases. These are instructions, not commands executed by the Phase 7
agent. Do not publish until you have reviewed the Phase 7 report and the open
precision/corpus gates from Phases 3b, 5, 5b and 6. A passing distribution test does
not close those gates or establish the half-hour consulting experience.

## Review and verify

- Review the full release diff, including any changes already present before
  Phase 7. `benchmarks/reference.json` was already modified and was not edited by
  Phase 7. Decide its release disposition explicitly; do not stage all blindly.
- Confirm package, lockfile, skill metadata and plugin manifest say `0.4.0`.
- Review the new landing copy in `docs/site/landing-copy.md` with the website
  owner. No existing `site/` page was changed.
- Complete or explicitly carry forward the public precision reviews and corpus
  recollection from the earlier phase reports. In particular, do not advertise
  reference ranges or calibrated quality grades absent qualifying measurements.
- In fresh Claude Code and Codex sessions, invoke the installed skill and run a
  representative consultation. Review the resulting `consult.json` and report.
  Deterministic launcher/hook checks do not verify model behavior or elapsed time.
- Open the first report in a browser and inspect findings and coverage. Verify
  the not-checked case too. Agent-written recommendations need their own review.
- Use a real private-name deny list (`.private-names` or `DS_LOOP_PRIVATE_NAMES`).
  Do not use the `none` opt-out for this release.

From the intended release checkout:

```sh
git identity
git status --short
git diff --check
npm ci
npm run check
npm run type-check
npm test
npm run build
npm run smoke
```

If the global npm cache is unavailable, use a writable scratch cache for these
commands, for example `npm_config_cache=/tmp/ds-loop-release-cache npm run smoke`.
Do not change Git identity, global configuration or hook settings to fix errors.
The expected Git identity here is personal (`owaizin`).

## Record the reviewed release

After reviewing every listed file (and separately resolving the pre-existing
benchmark change), the owner can stage this phase explicitly:

```sh
git add .claude-plugin/plugin.json hooks/hooks.json CHANGELOG.md README.md \
  docs/guide/install.md docs/site/landing-copy.md \
  docs/plans/2026-09-29-phase-7-report.md \
  docs/plans/2026-09-29-release-checklist.md \
  package.json package-lock.json scripts/smoke.mjs skill/SKILL.md \
  src/cli.ts src/commands/overview.ts src/commands/report.ts \
  src/core/audit-summary.ts src/core/files.ts src/core/plain.ts \
  test/next.test.ts test/readme.test.ts
git diff --cached --check
git diff --cached --stat
git identity
git commit -m "Prepare ds-loop 0.4.0 packaging and first run"
git status --short
```

The published commit must contain all intended release changes and the working
tree must be clean. Run the checks again if review changes any code or packaging.
No hooks should be bypassed.

## Inspect the actual release artifact

```sh
mkdir -p /tmp/ds-loop-release-0.4.0
npm pack --json --pack-destination /tmp/ds-loop-release-0.4.0 \
  > /tmp/ds-loop-release-0.4.0/pack.json
tar -tzf /tmp/ds-loop-release-0.4.0/ds-loop-0.4.0.tgz \
  > /tmp/ds-loop-release-0.4.0/contents.txt
cat /tmp/ds-loop-release-0.4.0/contents.txt
claude plugin validate .
```

Check the packed manifest, compiled `dist/`, plugin manifest and hook registration,
complete `skill/` including roles/practices/reference/templates/launcher, and
`benchmarks/reference.json`. `src/`, private files, fixtures and `site/` must be absent.
The smoke command scans every packed file; run it from exactly this release tree.
Retain `pack.json` integrity and the contents list with release evidence.

For a separate packed-install check, start at the release checkout:

```sh
release_source="$PWD"
release_probe=$(mktemp -d /tmp/ds-loop-release-probe.XXXXXX)
cp -R fixtures/css-audit-example "$release_probe/example-ds"
cd "$release_probe"
npm init -y
npm install --ignore-scripts --no-audit --no-fund \
  /tmp/ds-loop-release-0.4.0/ds-loop-0.4.0.tgz
cd example-ds
../node_modules/.bin/ds-loop
# Exit 1 is expected for this fixture's findings. Inspect the saved report.
../node_modules/.bin/ds-loop report .
../node_modules/.bin/ds-loop dashboard .
claude --plugin-dir ../node_modules/ds-loop
# Invoke /ds-loop:ds-loop in the new Claude session, then exit it.
cd "$release_source"
```

Verify Codex discovery using the documented project `.agents/skills/ds-loop`
symlink in `docs/guide/install.md`; ask `$ds-loop` to inspect a synthetic project.

## Publish, tag and announce — owner only

Verify registry identity is the package owner or authorized maintainer. Stop if it
is not; never print credentials. Publish the exact tarball reviewed above.

```sh
python3 -c 'from pathlib import Path; text=Path("CHANGELOG.md").read_text(); Path("/tmp/ds-loop-release-0.4.0/notes.md").write_text("## 0.4.0" + text.split("## 0.4.0", 1)[1].split("\n## ", 1)[0])'
npm whoami
npm owner ls ds-loop
npm view ds-loop@0.4.0 version
# Before release, the version lookup must say 0.4.0 is not published.
# A network/authentication error is not proof that the version is available.
npm publish /tmp/ds-loop-release-0.4.0/ds-loop-0.4.0.tgz --access public
npm view ds-loop@0.4.0 version dist.integrity
# Compare registry integrity with the saved pack.json.
git identity
git tag -a v0.4.0 -m "ds-loop 0.4.0"
git identity
git push origin HEAD
git identity
git push origin v0.4.0
git identity
git company-gh release create v0.4.0 --verify-tag \
  --title "ds-loop 0.4.0" --notes-file /tmp/ds-loop-release-0.4.0/notes.md
```

The first command extracts the 0.4.0 changelog section into `notes.md`; review it
before the release command.
Use `git company-gh` in the target repository for GitHub operations. Never switch
the shared GitHub CLI account. If publishing succeeds and a later step fails,
resume that step; do not republish or force-move an existing tag.

Finally, in a new temporary directory install `ds-loop@0.4.0` from the registry
and repeat the fixture checks. Coordinate the landing page release with its owner.
