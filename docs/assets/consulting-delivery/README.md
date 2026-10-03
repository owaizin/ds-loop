# Consulting delivery example

Independently constructed Example DS fixture; no client source or measurements.

Generate from the repository root:

```sh
node --experimental-strip-types src/cli.ts report fixtures/example-workspace --consult skill/templates/consult.example.json --out docs/assets/consulting-delivery/report.html
```

The overview repeats authored diagnosis, proposed outcome, first action and
verification. It does not infer priorities from engine counts. Source links in
this local report refer to the generating checkout; regenerate in your checkout.

Chrome headless checks: desktop 1440px light/dark and 375px light; no page errors,
no document horizontal overflow, four cards and resolved overview anchors.
Screenshots capture the overview. Print export generated; the overview page was visually checked for readability. Test data is illustrative, not a claimed delivered migration.
