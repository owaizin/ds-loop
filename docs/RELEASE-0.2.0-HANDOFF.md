# 0.2.0 release candidate handoff

Publication update, 2026-09-20: npm now reports `latest: 0.2.0`. The registry's
shasum and SHA-512 integrity match candidate-2 below. Website manager is updating
public release wording and verifying its examples against the downloaded package.
The preparation record and original release checklist below are retained for
traceability; publication is no longer outstanding.

Prepared locally on 2026-09-20. Claude and the user own final publication.
No release commit, tag, push, registry publication or client installation change
was made by this task.

## What is ready

The skill now leads discovery, respects a fresh start, carries existing
authorization forward, and links directly to the exception recipe. It uses compact
text views when progress, a decision or completion needs explanation. The engine
does not run the interview or generate those views. Its default overview now
retains applied exceptions and coverage gaps and points to the exact skill entry
and local npm command syntax.

`fix` now explains its scope and skipped references. Help works before project
configuration loads, unsupported fix flags are rejected, and `fix --write .`
accepts the path after the boolean flag. Its editing algorithm remains limited
to eligible CSS `var()` fallbacks.

Package, lockfile root, skill metadata and installation instructions now say
0.2.0. [Release notes](guide/release-0.2.0.md) describe the complete change from
the previous release, including the engine work already committed before this task.

## Verification

- 110 tests pass; type-check passes.
- 24 packed-install smoke checks pass with the private-data deny list active.
- All 56 files checked under source, tests, the smoke script and package manifests
  pass Biome. Skill validation and `git diff --check` pass.
- 87 local Markdown links and heading anchors resolve in the installed candidate.
- The refreshed candidate was installed in an isolated consumer, scanned against
  the private deny list, and exercised through its CLI. Its skill files are byte-
  identical to the first candidate used in the independent behavior trial.

The website owner repaired formatting in `site/restored-loop.css` and
`site/variants/loop-lab/lab.css`. Full `npm run check` now passes (147 files).
Captured fixture source and CLI JSON output are archived with `.txt` suffixes to
preserve their original bytes; no formatter exclusion or quality gate was relaxed.

Evidence: [release verification directory](../../ds-loop-calibration/evaluations/consulting-2026-09-20/verification/release-0.2.0/).
The first smoke attempt failed because a new test left its fixture in the directory
used by later empty-project checks. The test now removes its fixture; the failing
and passing logs are both retained.

## Candidate identity

Tarball: `../ds-loop-calibration/evaluations/consulting-2026-09-20/verification/release-0.2.0/candidate-2/ds-loop-0.2.0.tgz`

```text
Version: 0.2.0
Files: 104
SHA-256: 929e03673b5dd52a46b47b202414735011534ff3c30282655f33e6d325b21b34
npm shasum: 2290a9a867be32eb5d7941ef07057bedcaa64d8e
```

The superseded first candidate remains in the parent directory. Use candidate-2.
Its `pack.json` contains npm integrity and the file inventory;
`candidate-files-sha256.json` identifies the installed files;
`release-source-sha256.json` identifies the source inputs and base commit.
The tarball is gitignored. Repacking changed files produces a new candidate that
needs verification; do not reuse these hashes for it.

## Claude's final steps

1. Review the bounded diff and release notes. Preserve the pre-existing lockfile
   bin-path correction and keep unrelated website/design/task files out of the
   release commit. This task changed only the lockfile's two version fields.
2. Verify the selected release commit in a clean checkout. The combined working
   tree passes formatting now; preserve the website owner’s correction separately
   if the website remains outside the release commit.
3. Verify that the reviewed source matches the chosen tarball. Commit the release
   files, then publish the reviewed artifact and tag its corresponding commit
   under the user's release authorization.
4. Download the registry artifact and verify its identity, install, CLI, typed
   API and skill entry. Only then treat registry installation as verified.
5. Change a client installation only within that client's authorized scope.
   Earlier local 0.1.2 tarballs and registry 0.1.2 must remain distinguishable by
   their resolved artifacts and integrity.

The synthetic evaluations support the implementation and agent behavior. They do
not establish human usability, long-term adoption or a failure-free consultant.
The next product check is a real developer completing one bounded task using the
published package, with attention to where they need prompting or lose their place.
