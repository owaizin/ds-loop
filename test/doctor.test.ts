import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { context } from '../src/commands/context.ts';
import { doctor } from '../src/commands/doctor.ts';
import { loadConfig } from '../src/config/load.ts';
import type { Coverage } from '../src/core/coverage.ts';
import { guardCoverageSignature } from '../src/core/doctor-evidence.ts';

function tree(fn: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-doctor-'));
  const log = console.log;
  console.log = () => {};
  try {
    fn(root);
  } finally {
    console.log = log;
    rmSync(root, { recursive: true, force: true });
  }
}
const css = '.x { color: red; }\n';

test('doctor reports contract drift, and suppresses deltas when config or adapters change', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    context(root, loadConfig(undefined, root), { writeContract: true });
    const original = readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
    writeFileSync(join(root, 'style.css'), `${css}.y { color: blue; }\n`);
    assert.equal(doctor(root, { silent: true }).contract.status, 'drift');
    for (const replacement of [
      original.replace(/config_hash: .*/, 'config_hash: different'),
      original.replace(/css-rule-bodies@[\d.]+/g, 'css-rule-bodies@old'),
    ]) {
      writeFileSync(join(root, 'DESIGN-SYSTEM.md'), replacement);
      const contract = doctor(root, { silent: true }).contract;
      assert.equal(contract.status, 'instrument-changed');
      assert.deepEqual(contract.changes, []);
    }
  }));

test('doctor reports unmatched naming patterns as observations and cites doc/code pairs', () =>
  tree((root) => {
    writeFileSync(join(root, 'tokens.css'), ':root { --ink: #222; }\n');
    writeFileSync(join(root, 'style.css'), css);
    writeFileSync(join(root, 'AGENTS.md'), '# Conventions\nAll CSS color values must use tokens.\n');
    writeFileSync(
      join(root, 'ds-loop.config.json'),
      JSON.stringify({ taxonomy: { primitivePattern: '^--absent-', upstreamPattern: '^--upstream-' } }),
    );
    const result = doctor(root, { silent: true });
    assert.ok(result.config.observations.some((o) => o.key === 'primitivePattern'));
    assert.ok(result.config.observations.some((o) => o.key === 'upstreamPattern'));
    assert.equal(result.intent.pairs[0].document.file, 'AGENTS.md');
    assert.equal(result.intent.pairs[0].document.line, 2);
    assert.equal(result.intent.pairs[0].code.file, 'style.css');
    assert.equal(result.intent.pairs[0].code.line, 1);
  }));

test('guard reports missing, current, and changed project coverage without writing state', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    assert.equal(doctor(root, { silent: true }).guard.coverage, 'not-recorded');
    mkdirSync(join(root, '.claude'));
    writeFileSync(
      join(root, '.claude/settings.json'),
      JSON.stringify({
        hooks: { PostToolUse: [{ hooks: [{ type: 'command', command: 'node /some/ds-loop-guard.mjs' }] }] },
      }),
    );
    mkdirSync(join(root, 'node_modules/.cache/ds-loop'), { recursive: true });
    const file = join(root, 'node_modules/.cache/ds-loop/guard-coverage.json');
    const state = JSON.stringify({ signature: 'complete', at: '2026-01-01T00:00:00Z' });
    writeFileSync(file, state);
    assert.equal(doctor(root, { silent: true }).guard.installed, true);
    assert.equal(doctor(root, { silent: true }).guard.coverage, 'current');
    writeFileSync(join(root, 'unread.less'), '$ink: red;');
    assert.equal(doctor(root, { silent: true }).guard.coverage, 'changed');
    assert.equal(readFileSync(file, 'utf8'), state);
  }));

test('doctor CLI always exits zero including unreadable input and invalid configuration', () =>
  tree((root) => {
    const cli = resolve('src/cli.ts');
    for (const target of [root, join(root, 'missing')]) {
      const run = spawnSync(
        process.execPath,
        ['--experimental-strip-types', cli, 'doctor', target, '--json'],
        { cwd: root, encoding: 'utf8' },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.ok(JSON.parse(run.stdout));
    }
    writeFileSync(join(root, 'ds-loop.config.json'), '{invalid');
    const run = spawnSync(process.execPath, ['--experimental-strip-types', cli, 'doctor', root, '--json'], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(JSON.parse(run.stdout).error, /JSON/);
  }));

test('legacy contracts compare their recorded counts and incomplete contracts stay not checked', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    context(root, loadConfig(undefined, root), { writeContract: true });
    const path = join(root, 'DESIGN-SYSTEM.md');
    const legacy = readFileSync(path, 'utf8')
      .replace(/^adapters: .*\n/m, '')
      .replace(/^measurements: .*\n/m, '');
    writeFileSync(path, legacy);
    assert.equal(doctor(root, { silent: true }).contract.status, 'unchanged');
    writeFileSync(join(root, 'style.css'), `${css}.y { color: blue; }`);
    assert.equal(doctor(root, { silent: true }).contract.status, 'drift');
    writeFileSync(path, '# Our handwritten contract\n');
    assert.equal(doctor(root, { silent: true }).contract.status, 'not-checked');
  }));

test('a changed eligible ratio produces a delta; crossing the floor produces no numeric delta', () =>
  tree((root) => {
    const styles = (n: number, value: string) =>
      Array.from({ length: n }, (_, i) => `.x${i} { color: ${value}; }`).join('\n');
    writeFileSync(join(root, 'style.css'), styles(100, 'red'));
    context(root, loadConfig(undefined, root), { writeContract: true });
    writeFileSync(join(root, 'style.css'), styles(100, 'var(--ink)'));
    const measured = doctor(root, { silent: true }).contract.changes.find(
      (c) => c.measurement === 'style-tokenization-color',
    );
    assert.equal(measured?.delta, 1);
    writeFileSync(join(root, 'style.css'), styles(99, 'var(--ink)'));
    const small = doctor(root, { silent: true }).contract.changes.find(
      (c) => c.measurement === 'style-tokenization-color',
    );
    assert.equal(small?.after, null);
    assert.equal(small?.delta, undefined);
  }));

test('quoted, fenced, tentative and unrelated conventions produce no pairs', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    writeFileSync(
      join(root, 'AGENTS.md'),
      [
        '> All CSS color values must use tokens.',
        '    All CSS color values must use tokens.',
        '````text',
        '```',
        'All CSS color values must use tokens.',
        '````',
        '```text',
        'All CSS color values must use tokens.',
        '```',
        '<!--',
        'All CSS color values must use tokens.',
        '-->',
        'Perhaps all CSS color values must use tokens.',
        'All CSS spacing values must use tokens.',
      ].join('\n'),
    );
    assert.deepEqual(doctor(root, { silent: true }).intent.pairs, []);
  }));

test('doctor CLI findings, drift, and instrument changes all exit zero with parseable JSON', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    writeFileSync(join(root, 'AGENTS.md'), 'All CSS color values must use tokens.\n');
    writeFileSync(join(root, 'tokens.css'), ':root { --ink: #222; }');
    context(root, loadConfig(undefined, root), { writeContract: true });
    writeFileSync(join(root, 'style.css'), `${css}.y { color: blue; }`);
    for (const changed of [false, true]) {
      if (changed)
        writeFileSync(join(root, 'ds-loop.config.json'), '{"taxonomy":{"primitivePattern":"^--absent-"}}');
      const run = spawnSync(
        process.execPath,
        ['--experimental-strip-types', resolve('src/cli.ts'), 'doctor', root, '--json'],
        { encoding: 'utf8' },
      );
      assert.equal(run.status, 0, run.stderr);
      const report = JSON.parse(run.stdout);
      assert.equal(report.contract.status, changed ? 'instrument-changed' : 'drift');
      assert.ok(report.intent.pairs.length);
      if (changed) assert.deepEqual(report.contract.changes, []);
    }
  }));

test('doctor signature matches the shipped hook and ignores per-file judgement', () => {
  const hook = readFileSync('skill/hooks/ds-loop-guard.mjs', 'utf8');
  const implementation = hook.match(/function coverageSignature\(c\) \{[\s\S]*?\n\}/)![0];
  const signature = runInNewContext(`(${implementation})`) as (c: unknown) => string;
  for (const fields of [
    { unreadFormats: {}, unreadTokenFiles: [] },
    { unreadFormats: { '.vue': 3, '.less': 2 }, unreadTokenFiles: ['z.json', 'a.json'] },
  ]) {
    const coverage = { ...fields, couldNotJudge: ['any'], unconvertible: [{}] } as unknown as Coverage;
    assert.equal(guardCoverageSignature(coverage), signature(coverage));
  }
});

test('name matching follows normalized SCSS/JSON tier patterns and compound namespaces', () =>
  tree((root) => {
    writeFileSync(
      join(root, 'tokens.json'),
      JSON.stringify({
        palette: { red: { 100: { $type: 'color', $value: '#f00' } } },
        button: { fill: { $type: 'color', $value: '#222' } },
        'brand-color': { fill: { $type: 'color', $value: '#333' } },
      }),
    );
    writeFileSync(
      join(root, 'ds-loop.config.json'),
      JSON.stringify({
        taxonomy: {
          primitivePattern: '^palette-red-',
          componentPattern: '^--button-',
          semanticNamespaces: ['brand-color'],
        },
      }),
    );
    assert.deepEqual(doctor(root, { silent: true }).config.observations, []);
  }));

test('unreadable or malformed retained state is not checked, not clean', () =>
  tree((root) => {
    writeFileSync(join(root, 'style.css'), css);
    mkdirSync(join(root, '.claude'));
    writeFileSync(join(root, '.claude/settings.json'), '{invalid');
    mkdirSync(join(root, 'DESIGN-SYSTEM.md'));
    mkdirSync(join(root, 'node_modules/.cache/ds-loop'), { recursive: true });
    writeFileSync(join(root, 'node_modules/.cache/ds-loop/guard-coverage.json'), '{invalid');
    const result = doctor(root, { silent: true });
    assert.equal(result.contract.status, 'not-checked');
    assert.equal(result.guard.installed, null);
    assert.equal(result.guard.coverage, 'not-checked');
  }));

test('an unreadable workspace never reports unchanged measurements as a pass', () =>
  tree((root) => {
    writeFileSync(join(root, 'package.json'), '{"workspaces":["packages/*"]}');
    mkdirSync(join(root, 'packages/empty'), { recursive: true });
    writeFileSync(join(root, 'packages/empty/package.json'), '{"name":"empty"}');
    context(root, loadConfig(undefined, root), { writeContract: true });
    assert.equal(doctor(root, { silent: true }).contract.status, 'not-checked');
  }));

test('config checks include CSS declaration names whose values are omitted by adapters', () =>
  tree((root) => {
    writeFileSync(join(root, 'tokens.css'), ':root { --opacity-step: 15%; --ink: #222; }');
    writeFileSync(
      join(root, 'ds-loop.config.json'),
      JSON.stringify({
        taxonomy: {
          primitivePattern: '^--opacity-',
          semanticNamespaces: ['opacity'],
          componentPattern: '^--ink$',
        },
      }),
    );
    assert.deepEqual(doctor(root, { silent: true }).config.observations, []);
  }));
