import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { historyTrend, renderAuditHtml } from '../src/core/report-html.ts';

const report = () => audit('fixtures/css-audit-example', { silent: true });
test('HTML is deterministic, contains all verdicts and escapes hostile source text', () => {
  const r = report();
  r.manifest.ranAt = '2026-01-01T00:00:00.000Z';
  r.findings[0].summary = '</script><img src=x onerror=alert(1)>';
  for (const verdict of ['clean', 'issues', 'not-checked'] as const) {
    r.verdict = verdict;
    const html = renderAuditHtml(r);
    assert.equal(html, renderAuditHtml(r));
    assert.ok(html.includes(verdict));
    assert.ok(html.includes('&lt;/script&gt;'));
    assert.ok(!html.includes('<img src=x'));
    assert.doesNotMatch(html, /(?:src|href)=["']https?:|@import|fetch\(|XMLHttpRequest/);
    const payload = html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1];
    assert.equal(JSON.parse(payload).report.findings[0].summary, r.findings[0].summary);
  }
});
test('inventory keeps every occurrence traceable and large groups mount only three examples', () => {
  const r = report();
  for (const category of Object.values(r.styleInventory)) {
    assert.equal(
      category.values.reduce((n, v) => n + (v.locations?.length ?? 0), 0),
      category.occurrences,
    );
  }
  r.findings = Array.from({ length: 10001 }, (_, i) => ({ ...r.findings[0], where: `a.css:${i + 1}` }));
  const html = renderAuditHtml(r);
  assert.equal((html.match(/class="finding"/g) ?? []).length, 3);
  assert.ok(html.includes('10001 findings'));
  assert.ok(html.includes('a.css:10001'));
});
test('history never compares a changed instrument or filtered audit', () => {
  const r = report();
  assert.match(historyTrend(r, '').reason!, /No scorecard/);
  const row = {
    ranAt: r.manifest.ranAt,
    label: r.manifest.fixtureLabel,
    fixtureSha: 'old',
    adapters: r.manifest.adapter,
    configHash: r.manifest.configHash,
    ratios: r.ratios,
    findings: {},
    findingCount: 1,
    coverageComplete: true,
  };
  assert.equal(historyTrend(r, `${JSON.stringify(row)}\n${JSON.stringify(row)}`).rows.length, 2);
  assert.match(historyTrend(r, JSON.stringify({ ...row, configHash: 'other' })).reason!, /instrument moved/);
  assert.match(historyTrend(r, 'bad json').reason!, /invalid/);
  r.manifest.judgedFiles = ['a.css'];
  assert.match(historyTrend(r, JSON.stringify(row)).reason!, /filtered/);
});

test('timestamp override is the only clock input and rule strings stay verbatim', () => {
  const r = report();
  const first = renderAuditHtml(r, { timestamp: '2000-01-01T00:00:00Z' });
  r.manifest.ranAt = '2099-01-01T00:00:00Z';
  assert.equal(first, renderAuditHtml(r, { timestamp: '2000-01-01T00:00:00Z' }));
  assert.ok(!first.includes('2099-01-01'));
  assert.ok(first.includes(r.findings[0].summary));
  assert.ok(first.includes('suggest:'));
});

test('history does not bridge instrument changes or accept another source', () => {
  const r = report();
  const row = {
    ranAt: r.manifest.ranAt,
    label: r.manifest.fixtureLabel,
    fixtureSha: 'old',
    adapters: r.manifest.adapter,
    configHash: r.manifest.configHash,
    ratios: r.ratios,
    findings: {},
    findingCount: 1,
    coverageComplete: true,
  };
  const changed = { ...row, adapters: 'other@1' };
  assert.match(
    historyTrend(r, [row, changed, row].map((v) => JSON.stringify(v)).join('\n')).reason!,
    /Fewer than two/,
  );
  assert.match(
    historyTrend(r, JSON.stringify({ ...row, label: 'other' })).reason!,
    /No scorecard rows match/,
  );
  r.manifest.minSeverity = 'high';
  assert.match(historyTrend(r, JSON.stringify(row)).reason!, /filtered/);
});

test('overview precedes detail sections and suggestions use a table with safe literal swatches', () => {
  const r = report();
  r.findings[0].data = { probes: ['#12345', '0 0% 0%', 'var(--x)', '#333', 'hsl(0 0% 50%)'] };
  const html = renderAuditHtml(r);
  assert.ok(html.indexOf('class="summary-strip"') < html.indexOf('id="coverage"'));
  assert.ok(html.includes('Top 5 files'));
  assert.ok(html.includes('class="chart-row"'));
  assert.ok(html.includes('<th>Property / category</th>'));
  assert.ok(html.includes('<th>Delta</th>'));
  assert.ok(html.includes('<summary>Details</summary>'));
  const data = JSON.parse(
    html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1],
  );
  assert.ok(Object.keys(data.swatches).every((s) => /^(#|rgba?\(|hsla?\()/i.test(s) && !s.includes('var(')));
  assert.equal(data.swatches['#12345'], undefined);
  assert.equal(data.swatches['0 0% 0%'], undefined);
  assert.equal(data.swatches['var(--x)'], undefined);
  assert.ok(data.swatches['#333']);
  for (const f of r.findings) assert.ok(html.includes(f.summary));
});
