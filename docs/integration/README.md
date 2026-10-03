# Assessment overview integration

The primary checkout's assessment renderer was uncommitted when this branch began.
It is deliberately not copied into this branch or claimed as this task's work.
After this branch and the assessment package are both present, apply:

```sh
git apply --check docs/integration/assessment-overview.patch
git apply docs/integration/assessment-overview.patch
```

The patch imports the shared overview renderer, adds its CSS, and inserts the view
in the assessment overview. It changes no assessment schema or validation. If the
check fails, reconcile these three additions manually against the newer renderer;
never replace the complete file with an older copy.

Tested against the primary checkout snapshot on 2026-10-03 in a temporary copy:
assessment tests and overview tests pass (6 tests). Browser checks found four cards,
resolved anchors, no page errors and no horizontal overflow at 1440px and 375px.
The primary checkout remains untouched. The branch's normal consulting report uses
the view directly; this patch is only for the separately owned assessment package.
