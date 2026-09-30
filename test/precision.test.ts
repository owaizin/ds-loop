import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
// @ts-expect-error untyped dev script
import { diff, measure } from '../scripts/precision-measure.mjs';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

test('the precision snapshot records counts, not paths, and diff names every moved leaf', () => {
  const report = audit('fixtures/css-audit-example', { config: DEFAULT_CONFIG, silent: true });
  const m = measure(report, 0);
  assert.equal(m.verdict, 'issues');
  assert.deepEqual(m.findings['high token/raw-value-in-style'], { cards: 2, located: 2 });
  assert.equal(m.reachability.cards['no-static-importer'], 3);
  assert.doesNotMatch(JSON.stringify(m), /styles\.css|fixtures\//);
  assert.deepEqual(diff(m, structuredClone(m)), []);

  const moved = structuredClone(m);
  moved.reachability.cards['no-static-importer'] = 0;
  moved.fixEdits = 1;
  assert.deepEqual(diff(m, moved), ['fixEdits: 0 → 1', 'reachability.cards.no-static-importer: 3 → 0']);
  moved.fixEdits = undefined;
  assert.deepEqual(diff(m, moved).slice(0, 1), ['fixEdits: 0 → absent']);
});

test('the checked-in snapshot holds no machine-local path', () => {
  const text = readFileSync('benchmarks/precision.json', 'utf8');
  assert.doesNotMatch(text, /\/Users\/|\/home\/|\/tmp\/|\/var\/folders|\/private\/|[A-Z]:\\\\/);
  for (const repo of JSON.parse(text).repos) assert.ok(repo.measured, `${repo.name} is recorded`);
});
