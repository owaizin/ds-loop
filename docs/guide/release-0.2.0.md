# 0.2.0 release notes

This release gives the companion skill a guided engagement: understand the team's
problem, recommend a bounded delivery, carry out authorized work, verify it, and
leave a retrievable decision. The CLI supplies measurements and narrow mechanical
fixes. Installing the package does not start an agent.

## Skill experience

- Start from the user's problem, including a fresh investigation when requested.
  A request to “guide me” starts discovery rather than a severity-ranked backlog.
- Follow establishment, improvement/adoption, or maintenance according to evidence
  and existing commitments. Scanner coverage cannot determine company maturity.
- Keep existing authorization through the task; ask again when the next action
  changes scope or shared commitments.
- Show compact text views for progress, consequential decisions, and completion.
  Report unrun checks explicitly. Richer visuals and specialist skills are optional.
- Link exception handling to the shipped configuration recipe. Preserve decisions
  in the team's existing documentation and verify retrieval for adoption pilots.

## Engine changes

- Correct tier classification for names whose final segment resembles a semantic
  namespace. Semantic namespaces can open an unprefixed name or follow a brand
  prefix. Primitive-name recognition is shared by color and tier rules.
- Add `token/stock-palette-utility` and Tailwind adapter 0.4.0. This detects selected
  named palette utilities when applicable token context exists; it does not resolve
  Tailwind themes or prove a contrast failure.
- Add `tokenContexts` for explicit associations between use sites and CSS token
  declarations. Missing context is reported as unjudged. These declarations are
  read as context for the palette rule, not added to the files being judged.
- Add `ignore` entries with a required reason. Reports retain suppression counts,
  and exceptions contribute to the configuration hash.
- Add a `risk:` explanation to findings and required `Rule.impact` to the typed API.
- Add `context --write-contract` to draft measured facts and unresolved questions in
  `DESIGN-SYSTEM.md`. It never overwrites an existing file or establishes policy.
- Explain why `fix` proposes no edits. `fix --help` works without a path or valid
  project configuration; unsupported fix options are rejected. Fixing remains
  limited to eligible `var()` fallbacks, with a preview unless `--write` is passed.
- Report hook execution failures as not checked instead of treating them as silence.
- Keep matched exceptions and coverage limits visible in the default overview.
  Show the installed skill's location for guided work and how to run commands from
  a local npm installation.

## Upgrading

Use a distinct 0.2.0 package for this feature set. Local tarballs previously rebuilt
under 0.1.2 may differ from the registry's 0.1.2; a version string alone cannot
identify those builds. Inspect the dependency's resolved artifact and integrity.

Review [configuration and coverage](reference.md) before carrying over local
experiments. Once `tokenContexts` is configured, all palette use sites in the audit
scope need an applicable mapping; partial mappings can leave checks unjudged and
fail `--require-coverage`. An exception's `files: []` matches no files. Invalid
exception scopes fail configuration loading.

Re-run an unfiltered audit after upgrading. Adapter versions and configuration
hashes can change, so scorecard measurements may not be directly comparable.
Typed API consumers implementing rules must supply `impact`.

See [installation](install.md) for loading the complete package and activating the
skill. The engine has no new runtime dependencies.
