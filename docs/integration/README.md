# Assessment overview integration

Integrated into the primary checkout on 2026-10-12. Both consulting and assessment
reports now use `src/core/consult-overview.ts` for the delivery overview.

The assessment renderer, validation, assets and tests are included with the
integration. The former standalone patch has been removed; no manual patch step
is needed. Future changes should update the shared renderer and its tests.
