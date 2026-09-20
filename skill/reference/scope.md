# scope

Apply before changes. Findings identify possible work; they do not expand the task.

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
  a supported `config.ignore` entry with a reason can exclude matching inputs for
  a rule. Verify its scope and reported suppressions; a broad wildcard can hide more
  than the intended exception. Severity overrides apply to whole rules.

Ask for a scope decision only when the required action exceeds existing
authorization. Do not ask again for work the user already authorized.
"Do what's best" or "continue" carries authorization through the agreed outcome
and scope; choose the next useful action and report material changes. It does not
authorize an unrelated dependency change, publication or a wider migration. When
the user stops or defers an action, respect that boundary while continuing any
independent work still authorized. If approval is genuinely required, explain the
specific decision and its consequence rather than asking "shall I continue?".
