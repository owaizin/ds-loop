# Compare your system with public code

A ratio needs context. Compare your measured tokenization with pinned public sources:

```bash
ds-loop report .
ds-loop dashboard . --against products
```

The report and dashboard choose products when they find application commands or private
production consumers of workspace packages. A package with `exports` and no `private: true`
selects systems when no product application was identified. Documentation, examples and
playgrounds are excluded from those application signals. Without enough evidence, products
is the fallback. This is an inference from manifests and supported imports, not proof of the
repository's audience. Use `--against products|systems` to correct it. Dashboard refreshes
retain your override.

`ds-loop context .` lists the structural facts with their source paths. The consulting report
also includes them under “Where you are now.” Missing or unreadable manifests and unavailable
workspace analysis say `not checked`.

Each tokenization dimension shows your ratio, the observed minimum and maximum, the median,
and `below range`, `in range` or `above range`. Boundaries are inclusive. These are observations,
not grades or recommendations. The contributor count and named sources appear alongside each dimension.
Ratios use reference-only values divided by literal, reference and mixed values together.
They do not establish reference resolution, visual quality or runtime behaviour.

A reference dimension requires **100 classified occurrences**: literal + reference + mixed
values, excluding ambiguous and excluded values. Its recorded `occurrences` is this exact
denominator, not the number of distinct values or the total inventory. Below that floor,
`ratios[dimension]` is `null`, meaning **not measured**, and contributes to no range.
A genuine zero with sufficient occurrences remains a measurement.

A range requires **three contributing repositories**. With fewer, both report and dashboard
say `too few reference repos to state a range`, show the contributor count, and omit the
range and median. A missing team measurement still says `not checked`. Once there are enough
contributors, any adapter or configuration mismatch says
`not comparable — instrument differs` and suppresses the comparison numbers. Mismatched
rows are never silently removed to manufacture a comparable range.

Both floors live in `src/config/benchmark.ts` and are **UNCALIBRATED**. The occurrence floor
screens out small incidental stylesheets; at 100 occurrences one observation moves a ratio
by at most one percentage point. Three repositories are a minimal starting corpus, not an
industry distribution. Neither rule proves coverage of a repository's main styling format.
These eligibility settings do not change the audit instrument or its configuration hash.

## Current reference coverage

Every pinned row was re-measured on 2026-09-30 with `scripts/benchmark.mjs`, configuration
hash `5b0a0820`. Nine repositories are eligible references:

| Set | Repository |
|---|---|
| systems | Radix Themes, Radix Primitives, Mantine, Primer React |
| products | Supabase, Appsmith, Refine, Excalidraw, PostHog |

Contributing repositories per dimension (a range needs three):

| Dimension | systems | products |
|---|---|---|
| color | 4 | 4 |
| spacing | 4 | 5 |
| typography | 3 | 3 |
| radius | 2 | 2 |
| shadow | 1 | 0 |
| z-index | 1 | 1 |
| duration | 0 | 1 |

Four pinned repositories stay in `unmeasurable`, each with the reason the script recorded:

| Repository | Reason |
|---|---|
| `chakra-ui/chakra-ui` | CSS-in-JS, which no adapter reads |
| `FlowiseAI/Flowise` | MUI CSS-in-JS, which no adapter reads |
| `langflow-ai/langflow` | CSS-in-JS dependencies; no dimension reaches 100 classified occurrences |
| `shadcn-ui/ui` | Styles in `.html` and `.astro`, which no adapter reads; no dimension reaches 100 classified occurrences |

`pendingMeasurements` is empty.

`benchmarks/reference.json` schema 2 separates eligible `references`, `unmeasurable` sources,
`pendingMeasurements` and unpinned `candidates`. Newly measured rows store all seven
benchmark ratios and denominators, total extracted values, public URL, SHA, licence, scan
path, date, adapters, configuration hash and coverage. Legacy palette ratios are not
benchmark dimensions and are omitted from new records; their zero-denominator placeholders
must not become comparison data. No source code is vendored, and the packaged engine reads
this file from disk without network access.

## Reproduce or extend the corpus

Run these from a development checkout with Node 22.6 or newer and Git installed:

```bash
npm run benchmark
npm run benchmark -- --verify
npm run benchmark -- --verify --repo=radix-ui/themes
```

The default run fetches each reference, excluded source and pending measurement at its pinned SHA into an OS temporary
directory, audits its recorded scope with `DEFAULT_CONFIG`, updates the measurements, then
removes the checkout. It never installs dependencies or runs upstream build scripts.
`--verify` measures one pinned reference and fails on changed ratios, denominators, total extracted values, adapters or configuration;
it does not rewrite the data. `--repo=owner/name` selects a specific row.

When reviewing a new candidate, verify that its scanned code is permissively licensed and that
its scope represents the intended product or system, then pin and measure it:

```bash
npm run benchmark -- --pin --repo=excalidraw/excalidraw
```

`--pin` resolves HEAD only for candidates without a SHA. Subsequent runs use that pin. The
script checks the recorded licence file for its licence notice and requires at least one tokenization dimension with 100 classified occurrences before promoting
a candidate. A refusal names likely unread formats, using coverage and CSS-in-JS dependency
evidence. The existing pure-palette rejection remains. Ordinary refreshes move sources with
no eligible dimensions into `unmeasurable`, retaining their coverage and exclusion reason. This basic check does not replace
reviewing mixed-licence subtrees. Stop and revise or reject unsuitable candidates.

For an existing local clone, `--cache=/absolute/path/to/clone` fetches its pinned Git object
into a fresh temporary checkout. It does not audit uncommitted files or mutate the cached
clone. This makes offline verification possible when the object is already available.
`--data=/absolute/path/to/reference.json` selects an alternate manifest, useful for checking
that deliberately changed ratios fail verification without modifying the shipped data.
