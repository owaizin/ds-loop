import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { audit } from '../src/commands/audit.ts';
import { type Assessment, checkAssessment } from '../src/core/assessment.ts';
import { renderConsultHtml } from '../src/core/consult-html.ts';
import { type Consult, checkConsult } from '../src/core/consult.ts';
import { analyseConsumers } from '../src/core/consumers.ts';

const assessment = (): Assessment => ({
  client: 'Example DS',
  scope: 'Constructed CSS fixture only',
  preparedBy: 'Test author',
  sourceRevision: 'test-revision',
  sourceState: 'Synthetic fixture',
  executive: {
    headline: 'Review the fixed color.',
    recommendation: 'Inspect the consumer before editing.',
    stakes: 'Theme behavior is not assessed.',
    decision: 'Authorize investigation.',
    decisionOwner: 'Maintainer, proposed',
    investment: 'One bounded review.',
    preserve: ['Public API'],
    alternatives: [{ option: 'Retain', tradeoff: 'If intentional, record the reason.' }],
  },
  measures: [
    {
      label: 'Source records',
      numerator: 1,
      denominator: 1,
      definition: 'Retained example',
      evidence: ['E01'],
    },
  ],
  areas: [
    {
      name: 'Foundations',
      state: 'review',
      conclusion: 'Investigate intent.',
      coverage: 'One excerpt',
      unknowns: 'Rendered behavior',
      evidence: ['E01'],
    },
    {
      name: 'Accessibility',
      state: 'not-assessed',
      conclusion: 'Not assessed',
      coverage: 'No checks',
      unknowns: 'All behavior',
      evidence: [],
    },
  ],
  findings: [
    {
      id: 'F01',
      title: 'Fixed color',
      priority: 'now',
      basis: 'source',
      observation: 'Source contains a literal.',
      consequence: 'Theme behavior needs review.',
      recommendation: 'Confirm the role.',
      alternative: 'Intentional value.',
      limits: 'No runtime inspection.',
      verification: ['Verify both themes.'],
      evidence: ['E01'],
    },
  ],
  work: [
    {
      id: 'W01',
      title: 'Review',
      owner: 'Maintainer, proposed',
      dependsOn: [],
      findings: ['F01'],
      changes: 'Inspect role.',
      acceptance: ['Record intent.'],
      estimate: {
        low: 1,
        high: 2,
        unit: 'person-hours',
        confidence: 'low',
        basis: 'One source and two theme states; no repair included.',
      },
    },
  ],
  evidence: [
    {
      id: 'E01',
      title: 'Excerpt',
      kind: 'source',
      ref: 'styles.css:7',
      capturedAt: '2026-10-02',
      excerpt: '.example { color: red; }',
      limitation: 'Constructed source.',
    },
  ],
});
const consult = (): Consult => ({
  ...JSON.parse(readFileSync('skill/templates/consult.example.json', 'utf8')),
  assessment: assessment(),
});

test('assessment validates references, estimate bounds, measurement denominators and cycles', () => {
  assert.deepEqual(checkConsult(consult()).errors, []);
  for (const value of [null, 42, [], {}, { evidence: [null], findings: [false], work: [null] }])
    assert.ok(checkAssessment(value).errors.length);
  const bad = assessment();
  bad.findings[0].evidence = ['missing'];
  bad.work[0].dependsOn = ['W01'];
  bad.work[0].estimate.high = -1;
  bad.measures[0].denominator = 0;
  const errors = checkAssessment(bad).errors.join('\n');
  for (const text of ['unknown reference missing', 'dependency cycle', '0 <= low <= high', 'denominator > 0'])
    assert.ok(errors.includes(text));
  const c = consult();
  c.assessment!.findings[0].verification = [];
  assert.match(checkConsult(c).errors.join('\n'), /verification/);
});

test('editorial report retains source, portable citations and all three styles without mutating evidence', () => {
  const root = resolve('fixtures/css-audit-example');
  const r = audit(root, { silent: true });
  const c = consult();
  const before = JSON.stringify({ r, c });
  const html = renderConsultHtml(r, analyseConsumers(root), root, c);
  assert.equal(JSON.stringify({ r, c }), before);
  for (const style of ['dark', 'light', 'split']) assert.ok(html.includes(`data-style-choice="${style}"`));
  for (const id of [
    'overview',
    'assessment',
    'architecture',
    'finding',
    'plan',
    'methodology',
    'finding-F01',
    'evidence-E01',
    'work-W01',
  ])
    assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /href="#evidence-E01"/);
  assert.doesNotMatch(html, /file:\/\//);
  assert.match(html, /id="delivery-title"/);
  assert.match(html, /class="delivery-grid"/);
  assert.match(html, /No runtime inspection/);
  assert.match(html, /Not assessed/);
  assert.match(html, /1–2 person-hours/);
  assert.match(html, /default-src 'none'/);
  const payload = JSON.parse(
    html.match(/<script type="application\/json" id="assessment-data">([\s\S]*?)<\/script>/)![1],
  );
  assert.deepEqual(payload.audit.manifest, r.manifest);
  assert.equal(payload.audit.findings.length, r.findings.length);
  assert.deepEqual(payload.assessment, c.assessment);
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'every generated id is unique');
  for (const href of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(href[1]), href[1]);
});

test('assessment escapes executable text in HTML and downloadable JSON', () => {
  const root = resolve('fixtures/css-audit-example');
  const c = consult();
  c.assessment!.client = '</script><img src=x onerror=alert(1)>';
  c.assessment!.evidence[0].excerpt = '<svg onload=alert(1)>';
  const html = renderConsultHtml(audit(root, { silent: true }), analyseConsumers(root), root, c);
  assert.doesNotMatch(html, /<img src=x|<svg onload/);
  assert.match(html, /&lt;svg onload/);
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
});
