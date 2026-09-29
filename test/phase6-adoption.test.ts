import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ScorecardRow } from '../src/commands/scorecard.ts';
import { adoptionReport } from '../src/core/adoption.ts';
const row = (
  date: string,
  ratios: Record<string, number>,
  extra: Partial<ScorecardRow> = {},
): ScorecardRow => ({
  ranAt: date,
  label: 'demo',
  fixtureSha: 'live',
  adapters: 'css@1',
  configHash: 'same',
  ratios,
  findings: {},
  findingCount: 0,
  coverageComplete: true,
  ...extra,
});
test('adoption compares recorded baseline ratios by category and package, states runs and dates', () => {
  const result = adoptionReport(
    [
      row('2026-09-01', { 'style-tokenization-color:ui': 0.2 }),
      row('2026-09-29', { 'style-tokenization-color:ui': 0.6 }),
    ],
    'demo',
  );
  assert.equal(result.status, 'compared');
  assert.equal(result.runs, 2);
  assert.equal(result.start, '2026-09-01');
  assert.equal(result.end, '2026-09-29');
  assert.equal(result.ratios[0].baseline, 0.2);
  assert.equal(result.ratios[0].current, 0.6);
});
test('no single-row trend, no instrument-crossing delta even when endpoints match, missing is not zero', () => {
  const a = row('2026-09-01', { x: 0.2 });
  assert.equal(adoptionReport([a], 'demo').status, 'single-run');
  assert.equal(adoptionReport([], 'demo').status, 'not-checked');
  assert.equal(
    adoptionReport(
      [a, row('2026-09-10', { x: 0.3 }, { configHash: 'other' }), row('2026-09-29', { x: 0.4 })],
      'demo',
    ).status,
    'instrument-changed',
  );
  const result = adoptionReport([a, row('2026-09-29', { y: 0.4 })], 'demo');
  assert.equal(result.ratios.find((r) => r.key === 'x')!.current, null);
  assert.equal(result.ratios.find((r) => r.key === 'y')!.baseline, null);
  assert.equal(adoptionReport([a], 'other').runs, 0);
});

test('documentation version changes and reversed dates cannot produce a delta', () => {
  const first = row('2026-09-01', { 'docs-documented:ui': 0.5 }, { docsVersion: '0.1.0' });
  const last = row('2026-09-29', { 'docs-documented:ui': 0.9 }, { docsVersion: '0.2.0' });
  assert.equal(adoptionReport([first, last], 'demo').status, 'instrument-changed');
  assert.equal(adoptionReport([last, first], 'demo').status, 'invalid-history');
});
