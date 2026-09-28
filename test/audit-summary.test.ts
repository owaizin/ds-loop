import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { auditSummary, findingLocations } from '../src/core/audit-summary.ts';

test('large hit lists stay one summary row with exact counts and three recorded locations', () => {
  const report = audit('fixtures/css-audit-example', { silent: true });
  const count = 12_000;
  report.findings = [
    {
      ruleId: 'token/var-missing-fallback',
      severity: 'low',
      summary: `${count} var() reference(s) have no fallback value`,
      where: 'a.css:1',
      fix: 'Retained verbatim in full detail.',
      data: { count, hits: Array.from({ length: count }, (_, i) => ({ where: `a.css:${i + 1}` })) },
    },
  ];
  const before = JSON.stringify(report);
  const lines = auditSummary(report, '.');
  const rows = lines.filter((line) => line.includes('[LOW]'));
  assert.equal(rows.length, 1);
  assert.ok(rows[0]?.includes(report.findings[0]!.summary));
  assert.match(rows[0]!, /12000 hits · a.css:1, a.css:2, a.css:3$/);
  assert.equal(JSON.stringify(report), before, 'the terminal must not alter the report');
});

test('locations use recorded hits without claiming declaration candidates are use sites', () => {
  const finding = {
    ruleId: 'test/rule',
    severity: 'low' as const,
    summary: 'unchanged',
    where: 'swept a range',
    fix: 'review',
    data: { pairs: [] },
  };
  assert.deepEqual(findingLocations(finding), []);
  assert.deepEqual(
    findingLocations({
      ...finding,
      where: 'color at src/button.css:2; padding at src/button.css:2; gap at src/row.css:8',
    }),
    ['src/button.css:2', 'src/row.css:8'],
  );
});
