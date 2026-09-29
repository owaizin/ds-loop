# Phase 5 implementation report — 2026-09-29

The two adapters, registration, public exports, coverage integration, documentation and regression tests are implemented. **The public-repository precision gate has not passed. Network access was unavailable for cloning public repositories.** The cached package measurements below are supplemental evidence, not substitutes for the required two repositories per adapter. This is not a precision-qualified release.

## Implementation

- `token-json@0.1.0` discovers JSON by shape, reads DTCG `$value`/`$type` and Style Dictionary `value`/`type`, inherits group types, preserves dotted token names and selectors, and records the actual value line. JSON grammar is validated before a position-tracking walk; escaped strings, multiline values and duplicate keys are tested. `$description`, `$themes` and other metadata are not extracted as tokens.
- JSON aliases retain reference names and are classified as references when their chains have unique, present targets in the extraction scope. Missing targets, duplicate names across files, cycles and embedded expressions remain ambiguous. Alias resolution does not replace the authored value with a literal. Every extracted JSON value is a declaration.
- `scss@0.1.0` reads `$variables`, CSS custom properties, selected ordinary properties, nested/conditional rule contexts, indented `.sass`, namespaced variables and `map.get`/`map-get` references. `@use` and `@forward` are recorded without module resolution. Assignment modifiers `!default` and `!global` are omitted from token values so downstream colour conversion can read them. Comments and strings cannot invent declarations. Declaration at-rules such as `@font-face` are excluded from ordinary use-site inventory.
- Both adapters use shared file scoping and existing literal classifiers, run through the common registry, and are exported from `src/index.ts`. Existing CSS extraction behaviour is unchanged; its classifiers were exported for reuse. No runtime dependency, network call or model call was added to the engine.
- Tier rules test original configured naming patterns and normalized dotted/Sass names. Dotted semantic namespaces and appearance terms now work. JSON aliases reach tier-leakage analysis without receiving CSS `var()` fallback findings.
- Coverage names JSON and both Sass extensions, retains malformed/unsupported token files as unread, and reports unresolved/composite declarations through `unclassifiedDeclarations`. Unsupported declared JSON colours enter `unconvertible`; neither is mislabeled as a low-alpha colour. These limits make coverage incomplete and appear in detailed/plain text and HTML reports, independently of severity filtering.
- Updated the supported-format documentation. The existing not-checked regression examples now use unsupported LESS instead of newly supported SCSS; their assertions still verify real CLI output.

## Required precision gate: blocked, not skipped or passed

All clone attempts used fresh paths under `/tmp`, never this repository. Each exited 128 with `ssh: Could not resolve hostname github.com: -65563`. Git's configured HTTPS-to-SSH translation was preserved. A separate HTTPS request to `raw.githubusercontent.com` exited 6 with `Could not resolve host`. No Git/authentication configuration was changed.

| Public repository | Target / planned pin | Measurement and hand-checked rule hits |
| --- | --- | --- |
| excalidraw/excalidraw | SCSS; benchmark pin `5a406e51875157bece389b9bc92d41ff241d5f3d` | Clone failed; no values measured; 0 hits checked |
| FlowiseAI/Flowise | `packages/ui`; benchmark pin `9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb` | Clone failed; SCSS subset unmeasured; 0 hits checked; MUI CSS-in-JS remains unsupported |
| chakra-ui/chakra-ui | Benchmark pin `961161428b8c59157ad921dd23303b73c294d73f` | Clone failed; 0 hits checked; CSS-in-JS remains unsupported |
| amzn/style-dictionary | JSON examples; no commit could be obtained or verified | Clone failed; no values measured; 0 hits checked |
| primer/primitives | JSON tokens; no commit could be obtained or verified | Clone failed; no values measured; 0 hits checked |

The three benchmark pins above are planned targets copied from `benchmarks/reference.json`, **not verified checkouts**. That file already had working-tree changes when this task began and was not edited by this task. No reference was promoted from its `unmeasurable` list.

**Observed repository false-positive rate: unavailable (0 reviewed actionable hits; denominator zero), not 0%.** The JSON and SCSS adapters each still need two pinned public repository runs and a source-context review of their findings. Flowise and Chakra cannot become fully measurable through these adapters because the brief does not add a CSS-in-JS reader.

## Frozen public fixtures and supplemental manual review

Two public npm packages were available locally. The fixture files are unchanged package bytes, with version pins, upstream URLs, per-file SHA-256 digests and copied package manifests in `SOURCE.json`/`UPSTREAM-PACKAGE.json`. Regression tests verify the digests. A package pin is not being represented as an upstream Git SHA.

| Fixture | Pin | Final extraction and coverage |
| --- | --- | --- |
| `fixtures/sanity-token-json` | `npm:@sanity-labs/design-tokens@0.0.2-alpha.4`; upstream `sanity-labs/design-tokens-poc` | 109/113 values ambiguous: 101 structured colours unconvertible and 8 structured dimensions unevaluated. 4/113 numeric font-weight declarations retained as excluded. No rule findings; coverage incomplete. |
| `fixtures/fontsource-scss` | `npm:@fontsource/inter@5.3.0`; upstream `fontsource/font-files` | 38/52 values ambiguous, 13/52 excluded and 1/52 a reference. One finding group: `token/tier-model-undetectable`, correctly reporting 0/1 classifiable referencing declarations. Coverage incomplete. |

Manual source checks:

- JSON: 10/113 extracted records — `black`, `blue-100`, `radius-0` through `radius-3`, and all four font-weight tokens. Checked shape, classification and source positions against the fixture files. No extraction misclassification observed in these 10 records. There were **0 actionable rule hits to review**, so this does not estimate rule precision.
- SCSS: 17/52 final records — all 10 declarations in `metadata.scss`, the six `@use` directives at `mixins.scss:1–7`, and `metadata.$metadata` at line 9. No extraction misclassification observed in these 17 final records. Reviewed the one final finding group against the names: it reports a judgment limitation, not a styling defect. Again, **0 actionable rule hits**, so the false-positive rate is undefined.
- The initial Fontsource run additionally put the `@font-face` font-weight descriptor at `mixins.scss:187` into the ordinary style inventory. Source review identified that scope error. Added a failing regression and excluded declaration at-rules, matching the existing CSS adapter. The final fixture run no longer has that use-site or its unjudged-style finding. This correction is extraction evidence, not a passing repository precision gate.

Fontsource's packaged license is retained verbatim. The Sanity package declares MIT but did not ship a LICENSE file; its manifest and attribution are retained, and the missing upstream license text is explicitly recorded in its NOTICE. Retrieve that text when network access returns.

## Remaining limits

- Structured DTCG colours/dimensions, other composite values, `$extends`, theme merging, JSON5 and YAML are not evaluated. Unsupported composites remain visible. The Sanity fixture demonstrates that a modern structured DTCG palette can be read yet still be unjudgeable for colour comparisons.
- JSON alias existence is scoped to extracted files. Missing external targets, duplicate mode definitions and cycles are ambiguous. No theme/import resolver guesses their meaning.
- Sass imports, maps, interpolation, functions, mixins and control flow are not evaluated. Directive and unsupported-expression records expose this ceiling. Selector context records nesting rather than compiling selectors; unsupported Sass grammar needs a real parser. The property set is the same bounded set used for CSS use-site analysis.
- Existing CSS-specific fixing and token-context suggestions were not extended into JSON or Sass transforms. CSS-in-JS and Vue/Svelte remain unsupported. Existing palette and dimension rules can judge only supported, classified values and configured naming conventions.
- Small public package samples cannot establish precision on application styling. Do not claim that any benchmark exclusion has been resolved until the blocked repository runs are completed.

## Verification

- `npm run check` — passed.
- `npm run type-check` — passed.
- `npm test` — passed: **268/268 tests**, zero failures or skips.
- Tests cover both JSON dialects, type inheritance, value locations, escaped and duplicate keys, aliases/chains/cycles, unconvertible colours, tier routing, mixed-format coverage, SCSS nesting, indented Sass, map references, comments/strings/interpolation, assignment flags, declaration at-rules, reference order, single-file scope, and frozen package digests.

No Git command wrote inside this repository. Clone attempts were confined to `/tmp`; existing user changes were preserved. The remaining acceptance work is the network-blocked precision gate and upstream license retrieval described above.
