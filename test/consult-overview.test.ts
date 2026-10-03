import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderConsultOverview } from '../src/core/consult-overview.ts';
import type { Consult } from '../src/core/consult.ts';

const example = (): Consult => JSON.parse(readFileSync('skill/templates/consult.example.json', 'utf8'));

test('overview preserves the authored first action and verification without claiming completion', () => {
  const c = example();
  const before = JSON.stringify(c);
  const html = renderConsultOverview(c);
  assert.ok(html.includes(c.plan[0].title));
  assert.ok(html.includes(c.plan[0].verification));
  assert.match(html, /These checks are planned/);
  assert.match(html, /not a measured dependency graph/);
  assert.equal(JSON.stringify(c), before);
  assert.equal(renderConsultOverview(c), html);
});

test('overview escapes agent copy and describes missing judgment honestly', () => {
  const c = example();
  c.problem[0].text = '</script><img src=x onerror=alert(1)>';
  const html = renderConsultOverview(c);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;/script&gt;'));
  assert.match(renderConsultOverview(), /No delivery plan has been authored/);
  c.plan = [];
  assert.match(renderConsultOverview(c), /Acceptance has not been recorded/);
});

test('assessment overview keeps prerequisites, estimate basis and approval boundary visible', async () => {
  const { renderAssessmentOverview } = await import('../src/core/consult-overview.ts');
  const html = renderAssessmentOverview({
    executive: {
      stakes: 'Theme mismatch',
      recommendation: 'Review the consumer',
      decision: 'Choose a slice',
      decisionOwner: 'Maintainer',
    },
    work: [
      {
        title: 'Pilot',
        changes: 'Inspect the real screen',
        dependsOn: ['W01'],
        acceptance: ['Check both modes'],
        estimate: {
          low: 2,
          high: 5,
          unit: 'person-hours',
          confidence: 'low',
          basis: 'Render access unknown',
        },
      },
    ],
  });
  assert.match(html, /Prerequisites: W01/);
  assert.match(html, /2–5 person-hours/);
  assert.match(html, /Render access unknown/);
  assert.match(html, /does not record approval/);
  assert.match(html, /href="#finding"/);
  assert.match(html, /href="#architecture"/);
  assert.match(html, /href="#methodology"/);
});
