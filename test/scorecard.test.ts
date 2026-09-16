import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { type ScorecardRow, comparability } from '../src/commands/scorecard.ts';

function row(over: Partial<ScorecardRow> = {}): ScorecardRow {
  return {
    ranAt: '2026-09-17T00:00:00.000Z',
    label: 'test',
    fixtureSha: 'git:abc123',
    adapters: 'css-custom-props@0.2.0',
    configHash: '5c40eb56',
    ratios: { 'literal-colors-per-distinct': 1.5 },
    findings: { 'color/semantic-holds-literal': 4 },
    findingCount: 1,
    coverageComplete: true,
    ...over,
  };
}

test('a delta is only clean when the instrument did not move', () => {
  assert.deepEqual(comparability(row(), row()), { clean: true });
  assert.deepEqual(comparability(null, row()), { clean: true }, 'a first row has nothing to compare');

  // the incident this guard exists for: the adapter learned to parse oklch, so
  // every earlier measurement stopped being comparable while no source changed
  const adapterMoved = comparability(row(), row({ adapters: 'css-custom-props@0.3.0' }));
  assert.equal(adapterMoved.clean, false);
  assert.match(String((adapterMoved as { reason: string }).reason), /adapters changed/);

  const configMoved = comparability(row(), row({ configHash: 'deadbeef' }));
  assert.equal(configMoved.clean, false);
  assert.match(String((configMoved as { reason: string }).reason), /config changed/);

  const both = comparability(row(), row({ adapters: 'x@1', configHash: 'y' }));
  assert.deepEqual((both as { changed: string[] }).changed, ['adapter', 'config']);
});

test('scorecard appends one row per run and compares against the last for that source', async () => {
  const { scorecard } = await import('../src/commands/scorecard.ts');
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-scorecard-'));
  const prev = process.cwd();
  try {
    process.chdir(dir);
    writeFileSync('tokens.css', ':root{--brand:#1da1f2;--accent:#1da1f2}\n');

    const first = scorecard('.', { dir, json: true });
    assert.equal(first.previous, null, 'first run has no predecessor');

    // the team aliases the duplicate instead of re-typing it
    writeFileSync('tokens.css', ':root{--palette-blue-500:#1da1f2;--brand:var(--palette-blue-500)}\n');
    const second = scorecard('.', { dir, json: true });
    assert.ok(second.previous, 'second run compares against the first');
    assert.equal(second.previous?.ranAt, first.row.ranAt);

    const lines = readFileSync(join(dir, '.ds-scorecard', 'history.jsonl'), 'utf8')
      .trim()
      .split('\n');
    assert.equal(lines.length, 2, 'append-only, one row per run');
    for (const line of lines) assert.ok(JSON.parse(line).configHash, 'every row records its instrument');
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--dry-run writes nothing', async () => {
  const { scorecard } = await import('../src/commands/scorecard.ts');
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-scorecard-dry-'));
  const prev = process.cwd();
  try {
    process.chdir(dir);
    mkdirSync('s');
    writeFileSync(join('s', 'tokens.css'), ':root{--brand:#1da1f2}\n');
    scorecard('s', { dir, dryRun: true, json: true });
    assert.throws(() => readFileSync(join(dir, '.ds-scorecard', 'history.jsonl'), 'utf8'));
  } finally {
    process.chdir(prev);
    rmSync(dir, { recursive: true, force: true });
  }
});
