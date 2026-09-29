import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { audit } from '../src/commands/audit.ts';
import { report } from '../src/commands/report.ts';
import { loadConfig } from '../src/config/load.ts';
import { renderConsultHtml } from '../src/core/consult-html.ts';
import { type Consult, checkConsult } from '../src/core/consult.ts';
import { analyseConsumers } from '../src/core/consumers.ts';
import { PLAIN_RULES, PLAIN_VERDICTS } from '../src/core/plain.ts';
import { RULES } from '../src/rules/registry.ts';

const example = (): Consult => JSON.parse(readFileSync('skill/templates/consult.example.json', 'utf8'));
const cli = resolve('src/cli.ts');
const run = (args: string[], cwd?: string) =>
  spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], { cwd, encoding: 'utf8' });

test('plain words cover exactly the registered rules and all verdicts', () => {
  assert.deepEqual(Object.keys(PLAIN_RULES).sort(), RULES.map((r) => r.id).sort());
  for (const words of [...Object.values(PLAIN_RULES), ...Object.values(PLAIN_VERDICTS)]) {
    assert.ok(words.title.trim());
    assert.ok(words.description.trim());
  }
});

for (const source of ['fixtures/css-audit-example', 'fixtures/example-workspace']) {
  for (const consult of [undefined, example()]) {
    test(`${source}: complete report ${consult ? 'with' : 'without'} consult`, () => {
      const root = resolve(source);
      const measured = audit(source, { silent: true });
      const before = JSON.stringify(measured);
      const html = renderConsultHtml(measured, analyseConsumers(root), root, consult);
      assert.equal(JSON.stringify(measured), before, 'presentation must not mutate engine data');
      const ids = ['summary', 'problem', 'current', 'ideal', 'after', 'plan', 'limits'];
      let position = -1;
      for (const id of ids) {
        const next = html.indexOf(`class="deck-section" id="${id}"`);
        assert.ok(next > position, `section ${id} must be ordered`);
        position = next;
      }
      assert.equal((html.match(/Not written yet — ask your agent/g) ?? []).length, consult ? 0 : 4);
      assert.match(html, /What we couldn't check/);
      assert.match(html, /DESIGN SYSTEM LOOP \/ SYSTEM REPORT/);
      assert.match(html, /class="cover"/);
      assert.match(html, /class="headline-metrics"/);
      assert.equal(
        (html.match(/<h1>/g) ?? []).length,
        consult
          ? source.endsWith('example-workspace')
            ? 3
            : 2
          : source.endsWith('example-workspace')
            ? 2
            : 1,
      );
      assert.match(html, /@page\{margin:18mm\}/);
      if (consult) {
        assert.match(html, /architecture-lanes/);
        assert.match(html, /Step 1 · Effort: One team review/);
        assert.match(html, /Changes: shared/);
      }
      assert.match(html, /@media print/);
      assert.match(html, /break-before:page/);
      assert.doesNotMatch(html, /<(?:script|link|img|iframe)[^>]+(?:src|href)=/);
      assert.match(html, /default-src 'none'/);
      if (source.endsWith('example-workspace')) {
        assert.match(html, /consumer-map/);
        assert.match(html, /file:[^"]+App.tsx#L1/);
      } else {
        assert.match(html, /Hard-coded styles/);
        assert.match(html, /id="tokens"/);
        assert.match(html, /file:[^"]+styles.css#L7/);
      }
      if (consult) {
        assert.match(html, /Unsupported/);
        assert.match(html, /Assumptions — awaiting confirmation/);
      }
      for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
    });
  }
}

test('validation accumulates errors and handles malformed nested values without throwing', () => {
  assert.deepEqual(checkConsult(example()).errors, []);
  for (const value of [
    null,
    [],
    42,
    {
      problem: [null],
      practices: ['x'],
      plan: [{}],
      assumptions: false,
      after: { architecture: { title: 'x', lanes: [null], nodes: [null] } },
    },
  ]) {
    assert.ok(checkConsult(value).errors.length);
  }
  const c = example();
  c.title = '';
  c.plan[0].verification = '';
  c.problem[0].evidence = [{ ref: 'javascript:alert(1)' }, { ref: 'made/up-rule' }];
  c.after.architecture.edges![0].to = 'missing';
  const errors = checkConsult(c).errors.join('\n');
  for (const text of ['consult.title', 'plan[0].verification', 'evidence[0]', 'evidence[1]', 'both ends'])
    assert.ok(errors.includes(text));
});

test('untrusted claim text is escaped and unsupported claims remain visible', () => {
  const c = example();
  c.problem[0] = { text: '</script><img src=x onerror=alert(1)>', evidence: [] };
  c.after.architecture.nodes[0].label = '<svg onload=alert(1)>';
  const root = resolve('fixtures/example-workspace');
  const html = renderConsultHtml(audit(root, { silent: true }), analyseConsumers(root), root, c);
  assert.doesNotMatch(html, /<img src=x|<svg onload/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Unsupported — no evidence refs/);
});

test('CLI defaults, invalid input, output directories and not-checked summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-consult-'));
  try {
    writeFileSync(join(dir, 'theme.less'), '@brand: red;');
    const result = run(['report'], dir);
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(dir, 'ds-loop-report.html'), 'utf8');
    const summary = html.split('id="summary"')[1].split('id="problem"')[0];
    assert.match(summary, /Not checked/);
    assert.match(summary, /not a clean result/);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ title: '' }));
    const failed = run(['report', dir, '--consult', bad, '--out', join(dir, 'bad.html')]);
    assert.equal(failed.status, 1);
    for (const field of ['title', 'problem', 'practices', 'after', 'plan', 'assumptions'])
      assert.ok(failed.stderr.includes(field));
    assert.equal(run(['report', '--consult'], dir).status, 1);
    assert.equal(run(['report', '--out'], dir).status, 1);
    const output = join(dir, 'nested', 'report.html');
    assert.equal(
      report('fixtures/css-audit-example', loadConfig(undefined), {
        out: output,
        consult: 'skill/templates/consult.example.json',
      }),
      output,
    );
    assert.match(readFileSync(output, 'utf8'), /Hard-coded styles/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
