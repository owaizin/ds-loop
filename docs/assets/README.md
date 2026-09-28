# README report captures

These reports use independently written, public repository fixtures under the
repository's MIT licence. They contain no client source or measurements. The
workspace example is synthetic; its percentages are not adoption benchmarks.

Generate from the repository root using the development CLI:

```sh
node --experimental-strip-types src/cli.ts audit fixtures/css-audit-example --html docs/assets/audit-report.html
node --experimental-strip-types src/cli.ts consumers fixtures/example-workspace --scope @example/ui --html docs/assets/consumers-report.html
```

The audit exits 1 because the fixture deliberately contains findings. The HTML
is still written. No fixture dependency installation is needed.

## Capture list

Use a 1440px-wide desktop viewport, light theme, 100% browser zoom. Serve these
files over local HTTP if the browser automation cannot open file URLs. Wait for
the audit evidence loader and the consumers diagram edges to finish rendering.

- **audit-report.png** from **audit-report.html**: frame the title, verdict,
  severity summary, coverage, category comparison and the color/spacing finding
  cards with `styles.css:7` and `styles.css:9`. Use a full-page capture cropped to
  relevant sections if those cards fall below token architecture. Keep source
  locations legible; do not alter the rendered text or hide the coverage panel.
- **consumers-report.png** from **consumers-report.html**: frame the title, web
  lane with dashboard and portal cards, their 75%/50% share bars, shared-package
  cards and import edges. Include the legend explaining story/test imports.
  Keep the scope and synthetic source identifiable.

Save both PNGs in this directory. README uses these exact absolute URLs so npm's
renderer can load the images:

- https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/audit-report.png
- https://raw.githubusercontent.com/owaizin/ds-loop/main/docs/assets/consumers-report.png

After push, check both images load in the rendered GitHub README and in a Markdown
preview with npm-style URL resolution. HTML evidence browsing uses the browser's
native DecompressionStream; use a current browser for the audit report.

The HTML files are generated capture inputs. Commit them alongside the PNGs and
fixture source so reviewers can reproduce the images. They are not shipped in
the npm tarball; the README loads the PNGs from GitHub.
