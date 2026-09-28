import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
// @ts-expect-error — plain ESM tool shipped in the skill, no type declarations
import { checkProposal, renderProposal } from '../skill/tools/proposal.mjs';

const example = () => JSON.parse(readFileSync('skill/templates/proposal.example.json', 'utf8'));
const tool = 'skill/tools/proposal.mjs';

test('the shipped example passes and flags its one unsupported box', () => {
  const { errors, warnings } = checkProposal(example());
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /specialist/);
});

test('observed and inferred claims need evidence; proposed links do not', () => {
  const p = example();
  p.nodes.find((n: { id: string }) => n.id === 'admin').evidence = [];
  p.nodes.find((n: { id: string }) => n.id === 'native').evidence = [];
  const { errors, warnings } = checkProposal(p);
  assert.ok(errors.some((e: string) => /node "admin": observed needs at least one evidence ref/.test(e)));
  assert.ok(errors.some((e: string) => /node "native": inferred needs/.test(e)));
  assert.ok(!warnings.some((w: string) => /edge/.test(w)), 'a proposed link is a proposal by nature');
});

test('structure is enforced: unknown lanes, nodes, statuses and owners', () => {
  const p = example();
  p.nodes.push({ id: 'x', lane: 'nowhere', label: 'X', status: 'maybe' });
  p.edges.push({
    from: 'admin',
    to: 'ghost',
    meaning: 'import',
    status: 'observed',
    evidence: [{ ref: 'a' }],
  });
  p.edges.push({ from: 'admin', to: 'web', status: 'proposed' });
  p.decisions.push({ question: 'Q?', status: 'decided' });
  p.roadmap.push({ stage: 'Later' });
  const { errors } = checkProposal(p);
  for (const re of [
    /lane "nowhere" is not declared/,
    /status must be one of/,
    /both ends must be declared/,
    /meaning is required/,
    /names its owner/,
    /entry criteria are required/,
  ]) {
    assert.ok(
      errors.some((e: string) => re.test(e)),
      `expected ${re}`,
    );
  }
});

test('render escapes agent text, marks unsupported boxes and is deterministic', () => {
  const p = example();
  p.nodes[0].label = '</script><img src=x onerror=alert(1)>';
  const a = renderProposal(p, { date: '2026-09-28' });
  const b = renderProposal(p, { date: '2026-09-28' });
  assert.equal(a, b);
  assert.ok(!a.includes('<img src=x'), 'label must be escaped');
  assert.match(a, /Unsupported: no linked fact/);
  assert.match(a, /1 claim without a linked fact/);
  assert.ok(!/https?:\/\//.test(a), 'no external URLs');
});

test('CLI: check exits 1 on errors, render writes one HTML file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proposal-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(
    bad,
    JSON.stringify({
      title: 't',
      lanes: [{ id: 'a' }],
      nodes: [{ id: 'n', lane: 'a', label: 'L', status: 'observed' }],
    }),
  );
  const r1 = spawnSync(process.execPath, [tool, 'check', bad], { encoding: 'utf8' });
  assert.equal(r1.status, 1);
  assert.match(r1.stderr, /observed needs at least one evidence ref/);
  const out = join(dir, 'p.html');
  const r2 = spawnSync(
    process.execPath,
    [tool, 'render', 'skill/templates/proposal.example.json', '--html', out],
    { encoding: 'utf8' },
  );
  assert.equal(r2.status, 0);
  assert.match(readFileSync(out, 'utf8'), /^<!doctype html>/);
});
