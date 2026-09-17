# scope

The branch-scope policy. Born from a real incident: a design-system-scoped branch
accumulated 26 production file changes because an agent read a legitimate
accessibility audit, saw "P0", and implemented the recommendations across
production without recognising the branch's scope.

## Bound the intervention

Use the user's task and applicable repository instructions to identify writable
paths and preserved behavior. A branch prefix can signal a local convention; it
does not itself grant permission or impose a universal directory layout.

- An audit request authorizes investigation, not a migration of every finding.
- An explicitly scoped component repair may change that production component;
  it does not authorize changing its consumers or the shared scale broadly.
- A system-only or stories-only task stays within that boundary. If a finding
  requires broader work, record it and explain the needed scope separately.
- Preserve existing stories and tests. Add a focused harness when needed rather
  than replacing the existing evidence.
- Record intentional exceptions. Documentation alone does not silence `guard`;
  current severity configuration applies to whole rules, not per-finding waivers.

Ask for a scope decision only when the required action exceeds existing
authorization. Do not ask again for work the user already authorized.
