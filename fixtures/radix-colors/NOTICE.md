# Vendored third-party files

`css/` holds six files copied **byte-identically** from
[`@radix-ui/colors@3.0.0`](https://registry.npmjs.org/@radix-ui/colors/-/colors-3.0.0.tgz)
(tarball SHA-256 `f6cec1ff1fcc58a45eeefc25d0e6aa1f1659845dbd198963617a86e43d21f3d1`,
recorded in [`SOURCE.json`](SOURCE.json)):

`amber.css` · `blue.css` · `green.css` · `plum.css` · `red.css` · `slate.css`

They are unmodified. Radix Colors is MIT-licensed; [`LICENSE`](LICENSE) is that
package's own licence text, taken from the pinned 3.0.0 artifact rather than from
upstream `main`, whose copyright notice has since changed. Copyright (c) 2021 Radix.

Nothing else in this fixture is Radix's: `SOURCE.json`'s notes and this file are
`ds-loop`'s own, and the dark, alpha and remaining scales were deliberately not
vendored. The fixture is excluded from the npm package — it exists so the ΔE
sweep can be re-run against a control palette anyone can fetch and verify.

`ds-loop` itself is MIT-licensed; see the [repository LICENSE](../../LICENSE).
