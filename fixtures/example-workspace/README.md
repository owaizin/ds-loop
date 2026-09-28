# Example DS workspace

Independently written, synthetic source under this repository's MIT licence.
This is a static-analysis fixture, not a production case study or a runnable app.
No dependencies need installing to inspect its imports and JSX.

The dashboard renders three shared elements and one local element. The portal
renders one of each. A separate story demonstrates exclusion from production
counts. These inputs are deliberate examples, not adoption benchmarks.

From the ds-loop checkout:

```sh
npm run ds-loop -- consumers fixtures/example-workspace --scope @example/ui
npm run ds-loop -- consumers fixtures/example-workspace --scope @example/ui --html /private/tmp/consumers-report.html
```
