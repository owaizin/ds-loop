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
