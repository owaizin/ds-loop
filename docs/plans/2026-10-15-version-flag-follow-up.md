# Next patch: expose the installed CLI version

Status: pending. Found during the owner's fresh-registry verification of
`ds-loop@0.4.0` on 15 October 2026. This does not reopen the 0.4.0 release.

## Miss

`ds-loop --version` returns “unknown command.” The help banner identifies the
version, but there is no direct version flag for installation checks or scripts.
The release checks verified the help banner and missed this common CLI entry point.

## Next change

Support `ds-loop --version` and `ds-loop -v`. Read the version from the same
package metadata as the help banner; do not hardcode another release number.

Acceptance:

- Both flags print only the package version followed by a newline and exit 0.
- Neither flag starts an audit, creates a report, or requires a project/config.
- They work outside a Git repository and from an installed npm package.
- Help documents the flags; its existing version banner remains intact.
- CLI regression tests cover both flags and absence of generated files.
- Packed-install smoke checks compare both outputs with the installed package's
  version, alongside the existing plugin/skill/help version checks.

Run check, type-check, test and smoke. Include the change in the next patch's
release notes. No implementation or release-version bump is part of this record.
