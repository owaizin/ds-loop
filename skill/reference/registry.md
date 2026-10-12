# Make components discoverable to agents

Ask your agent: “Generate a component registry from our shared library and wire
up its refresh command.”

Agent procedure; no `ds-loop registry` CLI or bundled component extractor exists.
Use for a requested AI-readable catalog or automated component documentation.
This is a metadata catalog, not a component installation/distribution registry.

## Choose the source and delivery

Inspect the library's public exports, types, stories, existing docs/registries and
build scripts. Scope the packages and entry points; exclude private helpers and
record unsupported exports. Reuse a useful existing registry and its schema.
For a new registry, use [the shared schema](../templates/component-registry.schema.json).
The schema is ds-loop's starting contract, not a claim of Kumo compatibility.

Choose the smallest delivery that meets the request:

- **Snapshot:** the agent assembles and checks `component-registry.json`. Record
  its source fingerprint and refresh instructions. It does not update itself.
- **Generated:** the agent creates a project-local generator using the project's
  tooling, or reuses an existing extractor. Add a repeatable package script and
  connect it to the existing library/docs build within scope. Automatic refresh
  requires a working script and build integration; instructions alone don't do it.

Prefer generated mode when automatic updates were requested. If extraction cannot
cover the library, expose the gaps and explain the remaining work; do not silently
substitute a snapshot and call it automatic. A website, HTTP API, hosted service
or new documentation stack is not required to make local JSON useful.

## Build from evidence

Use [shape](shape.md)'s component contract for content and [census](census.md) for
public entry points. Keep one entry per public component identity; distinguish
same-named exports from different package subpaths.

Record real import specifiers and export names, source locations, descriptions,
props/types/defaults, supported variants, compound parts, token references, and
checked examples or story links. Use a type-aware extractor for typed APIs when
available; do not infer a complete API from regex matches. Explicitly report
inherited props, generics, wrappers, dynamic defaults, indirect tokens and stories
that the chosen extractor cannot resolve.

Keep authored usage guidance in the existing source docs/JSDoc or a separate
metadata file keyed by component identity. Merge it during generation. Generated
fields come from code; authored guidance must not override extracted types or
defaults. Report contradictions for correction at their source.

The shared schema uses repo-relative source paths with one-based lines. `null`
means unknown, including a prop's requiredness or default expression. An empty
array means no entries recorded, not proof there are none: explain incomplete
fields in each component's `limitations` and aggregate scope gaps in `coverage`.
Defaults are source expressions stored as strings, not evaluated code. Examples
carry a check status; never label copied or generated code checked without running
the relevant type/build check. Static token references do not prove effective
values across themes. Do not invent descriptions, owners or supported states.

## Keep it current

Record a fingerprint of all inputs, including export barrels, types, stories,
authored metadata and extractor/configuration inputs. Include dirty file contents;
a Git revision alone cannot identify an uncommitted snapshot. Include the scoped
file list so additions and deletions change the fingerprint. Document the hash
algorithm and input selection in the project-local generator or refresh guide.

For generated mode, sort entries deterministically, avoid changing timestamps on
unchanged input, and replace output only after extraction and validation succeed.
Remove entries for deleted exports on regeneration. Fail visibly on extraction
errors instead of publishing an empty catalog as success.

Use the project's output convention: regenerate ignored artifacts before their
consumer runs, or compare regenerated output with committed artifacts in a
non-mutating check. Wire CI when included in the task's scope. Schema validation
checks structure; it cannot prove freshness or truth of component metadata.

## Verify and expose

1. Validate the JSON against the shared schema (or the reused project's schema)
   using a compatible validator. Check unique component IDs and prop/variant names,
   real source paths, public imports, compound-part links, and docs/story targets.
2. Compare representative entries with code, including a wrapper or compound
   component if present. Type-check example imports and props in the target project;
   preserve unsupported and unchecked cases in the output.
3. For generated mode, run twice without source changes and compare output. In a
   temporary fixture/copy, change a prop/default and add or remove an export. Show
   regeneration updates the catalog and the freshness check detects stale output.
   Confirm a failed extraction preserves the last valid artifact and fails the build.
4. Link the catalog and refresh/lookup instructions from the existing contributor
   and agent entry points. Keep a concise index or component lookup script when the
   full catalog is too large to load; verify lookup by an actual exported component.

Done when the scoped catalog can be found and used, its checked coverage and
maintenance mode are explicit, and the documented refresh path works. Report the
registry path, input scope, verification performed and remaining gaps. Follow
[scaffold](scaffold.md) for any requested human-facing reference and
[engagement](engagement.md) for an adoption pilot's fresh-context retrieval check.
