import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { expandReportData, reportData } from '../src/core/report-data.ts';
import { renderAuditHtml } from '../src/core/report-html.ts';
import { htmlPayload } from './html-payload.ts';

test('wire index retains every candidate, declaration, duplicate and ordered alias path', () => {
  const report = audit('fixtures/css-audit-example', { silent: true });
  const suggestion = report.findings.find((f) => f.suggestion)!.suggestion!;
  const site = suggestion.values[0];
  assert.ok(site.candidates.length);
  site.candidates.push(structuredClone(site.candidates[0]));
  site.candidates[0].declarations.push(structuredClone(site.candidates[0].declarations[0]));
  suggestion.values.push(...Array.from({ length: 100 }, () => structuredClone(site)));
  const original = JSON.stringify(report);
  const wire = reportData(report);
  assert.deepEqual(expandReportData(JSON.parse(JSON.stringify(wire))), report);
  assert.equal(JSON.stringify(report), original, 'serialization must not mutate the audit');
  assert.ok(wire.suggestionIndex.candidates.length < site.candidates.length * 10);
  assert.ok(JSON.stringify(wire).length < original.length / 2);
  assert.deepEqual(htmlPayload(renderAuditHtml(report)).report, wire);
});

test('offline browser loader can decompress the complete escaped evidence payload', async () => {
  const report = audit('fixtures/css-audit-example', { silent: true });
  report.findings[0].summary = '</script><img src=x>\u2028';
  const html = renderAuditHtml(report);
  const packed = JSON.parse(
    html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1],
  );
  const bytes = Uint8Array.from(atob(packed.data), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const decoded = JSON.parse(await new Response(stream).text());
  assert.deepEqual(decoded, htmlPayload(html));
  assert.equal(decoded.report.findings[0].summary, report.findings[0].summary);
  assert.ok(!html.includes('<img src=x>'));
});
