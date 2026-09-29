import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { audit } from '../src/commands/audit.ts';
import { dashboard } from '../src/commands/dashboard.ts';
import { scorecardRow } from '../src/commands/scorecard.ts';
import { loadConfig } from '../src/config/load.ts';
import { analyseConsumers } from '../src/core/consumers.ts';
import { dashboardHistory, renderDashboardHtml } from '../src/core/dashboard-html.ts';

const target = resolve('fixtures/example-workspace');
const measured = audit(target, { silent: true });
const consumers = analyseConsumers(target);
const today = scorecardRow(measured, consumers);
const row = (day: number, configHash = today.configHash) => ({
  ...today,
  configHash,
  ranAt: `2026-09-${day}T00:00:00.000Z`,
  ratios: { 'style-tokenization-color': day / 100, 'shared-component-share:@example/app': 0.5 },
});
const render = (rows: unknown[]) =>
  renderDashboardHtml(measured, today, consumers, rows.map((r) => JSON.stringify(r)).join('\n'), target);

for (const count of [0, 1, 4])
  test(`dashboard renders ${count} saved rows without inventing today's row`, () => {
    const html = render(Array.from({ length: count }, (_, i) => row(20 + i)));
    assert.match(html, /Today is a fresh audit, not a saved history row/);
    assert.match(html, /Findings by theme/);
    assert.match(html, /Coverage/);
    if (count < 2) {
      assert.match(html, /Fewer than two saved rows/);
      assert.doesNotMatch(html, /data-trend-segment/);
      assert.doesNotMatch(html, /<svg/);
      assert.match(html, /ds-loop scorecard/);
    } else {
      assert.match(html, /data-trend-segment/);
      assert.match(html, /<table>/);
      assert.match(html, /2026-09-20T00:00:00.000Z/);
      assert.match(html, /20.0%/);
      assert.match(html, /@example\/app/);
    }
    assert.doesNotMatch(html, /<(?:script|link|img|iframe)[^>]+(?:src|href)=/);
    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
  });

test('instrument boundaries break every series and label changed config, adapter and consumers', () => {
  for (const change of [{ configHash: 'other' }, { adapters: 'other' }, { consumersVersion: 'other' }]) {
    const html = render([row(20), row(21), { ...row(22), ...change }, { ...row(23), ...change }]);
    assert.match(html, /instrument changed — not a comparison/);
    // Two series, two comparable edges each. The middle edge must not be drawn.
    assert.equal((html.match(/data-trend-segment/g) ?? []).length, 4);
  }
});

test('missing values break lines; bad rows, dates and unmatched sources never become a trend', () => {
  const html = render([row(20), { ...row(21), ratios: {} }, row(22)]);
  assert.doesNotMatch(html, /data-trend-segment/);
  assert.match(html, /not checked/);
  for (const history of ['null', '{bad', JSON.stringify({ ...row(20), ratios: { a: 'bad' } })]) {
    assert.equal(dashboardHistory(history, today.label).rows.length, 0);
    assert.ok(dashboardHistory(history, today.label).note);
  }
  assert.match(render([row(22), row(20)]), /out of order/);
  assert.match(render([{ ...row(20), ratios: { 'style-tokenization-color': 2 } }]), /out-of-range/);
  assert.match(render([{ ...row(20), label: 'different source' }]), /No usable baseline/);
});

test('HTML escapes hostile labels and findings', () => {
  const html = renderDashboardHtml(
    measured,
    { ...today, label: '</title><script>bad()</script>' },
    consumers,
    '',
    '<img src=x>',
  );
  assert.doesNotMatch(html, /<script>bad/);
  assert.match(html, /&lt;img/);
});

test('dashboard CLI writes the default, leaves history untouched and rejects a missing output value', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-dashboard-'));
  try {
    mkdirSync(join(dir, '.ds-scorecard'));
    const history = `${JSON.stringify(row(20))}\n${JSON.stringify(row(21))}\n`;
    writeFileSync(join(dir, '.ds-scorecard/history.jsonl'), history);
    const cli = resolve('src/cli.ts');
    const res = spawnSync(process.execPath, ['--experimental-strip-types', cli, 'dashboard', target], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, res.stderr);
    assert.match(readFileSync(join(dir, 'ds-loop-dashboard.html'), 'utf8'), /data-trend-segment/);
    assert.equal(readFileSync(join(dir, '.ds-scorecard/history.jsonl'), 'utf8'), history);
    assert.equal(
      spawnSync(process.execPath, ['--experimental-strip-types', cli, 'dashboard', '--out'], { cwd: dir })
        .status,
      1,
    );
    dashboard(target, loadConfig(undefined), { out: join(dir, 'nested/custom.html'), historyDir: dir });
    assert.match(readFileSync(join(dir, 'nested/custom.html'), 'utf8'), /Dashboard/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('guard refreshes an existing default dashboard after an edit without recording history', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-dashboard-guard-'));
  try {
    writeFileSync(join(dir, 'tokens.css'), ':root { --brand: #123456; }');
    writeFileSync(join(dir, 'ds-loop-dashboard.html'), 'stale');
    const result = spawnSync(process.execPath, [resolve('skill/hooks/ds-loop-guard.mjs')], {
      cwd: dir,
      encoding: 'utf8',
      input: JSON.stringify({ cwd: dir, tool_input: { file_path: join(dir, 'tokens.css') } }),
    });
    assert.ok([0, 2].includes(result.status ?? -1), result.stderr);
    assert.match(readFileSync(join(dir, 'ds-loop-dashboard.html'), 'utf8'), /Today is a fresh audit/);
    assert.throws(() => readFileSync(join(dir, '.ds-scorecard/history.jsonl')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('guard preserves a custom dashboard target on non-style edits and reports refresh failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-dashboard-custom-'));
  try {
    mkdirSync(join(dir, 'source'));
    writeFileSync(join(dir, 'source/tokens.css'), ':root { --brand: #123456; }');
    const cli = resolve('src/cli.ts');
    const generate = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        cli,
        'dashboard',
        'source',
        '--out',
        'custom.html',
        '--against',
        'systems',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    assert.equal(generate.status, 0, generate.stderr);
    writeFileSync(join(dir, 'custom.html'), 'stale');
    const hook = () =>
      spawnSync(process.execPath, [resolve('skill/hooks/ds-loop-guard.mjs')], {
        cwd: dir,
        encoding: 'utf8',
        input: JSON.stringify({ cwd: dir, tool_input: { file_path: join(dir, 'source/index.ts') } }),
      });
    assert.equal(hook().status, 0);
    assert.match(readFileSync(join(dir, 'custom.html'), 'utf8'), /source · <time>/);
    assert.match(readFileSync(join(dir, 'custom.html'), 'utf8'), /Compared with public systems/);
    const registry = JSON.parse(
      readFileSync(join(dir, 'node_modules/.cache/ds-loop/dashboards.json'), 'utf8'),
    );
    registry[0].config = join(dir, 'missing-config.json');
    writeFileSync(join(dir, 'node_modules/.cache/ds-loop/dashboards.json'), JSON.stringify(registry));
    const before = readFileSync(join(dir, 'custom.html'), 'utf8');
    const failed = hook();
    assert.equal(failed.status, 2);
    assert.match(failed.stderr, /refresh failed.*may be stale/);
    assert.equal(readFileSync(join(dir, 'custom.html'), 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
