import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { dashboard } from '../src/commands/dashboard.ts';
import { report } from '../src/commands/report.ts';
import { BENCHMARK_POLICY } from '../src/config/benchmark.ts';
import { loadConfig } from '../src/config/load.ts';
import {
  type Reference,
  benchmarkHtml,
  benchmarkMeasurement,
  compareReferences,
  isMeasurableReference,
  readReferences,
  referenceSet,
} from '../src/core/benchmark.ts';
import { teamShape } from '../src/core/team-shape.ts';

const fixture = resolve('fixtures/example-workspace');
const measured = audit(fixture, { silent: true });
const key = 'style-tokenization-color';
const reference = (value: number): Reference => ({
  name: 'example/public',
  url: 'https://github.com/example/public',
  sha: 'a'.repeat(40),
  set: 'products',
  license: 'MIT',
  date: '2026-09-29',
  scanPath: '.',
  ratios: { [key]: value },
  occurrences: { [key]: 100 },
  totalValues: 100,
  adapters: measured.manifest.adapter,
  configHash: measured.manifest.configHash,
});
const compare = (team: number, values: number[]) =>
  compareReferences({ ...measured, ratios: { [key]: team } }, values.map(reference), 'products').find(
    (d) => d.key === key,
  )!;

test('range uses observed extremes and odd/even medians, with inclusive boundaries', () => {
  assert.deepEqual(compare(0.4, [0.8, 0.2, 0.6, 0.4]), {
    key,
    team: 0.4,
    min: 0.2,
    max: 0.8,
    median: 0.5,
    status: 'in range',
    references: Array(4).fill('example/public'),
  });
  assert.equal(compare(0.2, [0.8, 0.2, 0.4]).median, 0.4);
  assert.equal(compare(0.2, [0.2, 0.5, 0.8]).status, 'in range');
  assert.equal(compare(0.8, [0.2, 0.5, 0.8]).status, 'in range');
  assert.equal(compare(0.1, [0.2, 0.5, 0.8]).status, 'below range');
  assert.equal(compare(0.9, [0.2, 0.5, 0.8]).status, 'above range');
  assert.equal(compare(0.4, [0.4, 0.4, 0.4]).median, 0.4);
});

test('instrument differences suppress numbers rather than silently dropping references', () => {
  for (const changed of [{ adapters: 'other' }, { configHash: 'other' }]) {
    const dimensions = compareReferences(
      { ...measured, ratios: { [key]: 0.5 } },
      [reference(0.3), reference(0.5), { ...reference(0.8), ...changed }],
      'products',
    );
    const d = dimensions.find((d) => d.key === key)!;
    assert.equal(d.status, 'not comparable — instrument differs');
    assert.equal(d.min, undefined);
    assert.equal(d.median, undefined);
  }
});

test('missing team dimensions and reference dimensions stay distinct; sets do not mix', () => {
  const dimensions = compareReferences(
    { ...measured, ratios: { [key]: 0 } },
    [{ ...reference(0.5), set: 'systems' }],
    'products',
  );
  assert.equal(dimensions.find((d) => d.key === key)!.status, 'too few reference repos to state a range');
  assert.equal(dimensions.find((d) => d.key === 'style-tokenization-duration')!.status, 'not checked');
  assert.equal(
    compareReferences({ ...measured, ratios: {} }, [reference(0.2)], 'products').find((d) => d.key === key)!
      .status,
    'not checked',
  );
});

test('workspace applications using UI choose products even when UI is publishable', () => {
  const shape = teamShape(fixture);
  assert.equal(referenceSet(shape).set, 'products');
  assert.ok(shape.productionConsumers.length);
  assert.ok(shape.facts.every((f) => f.files.length));
  assert.equal(referenceSet(shape, 'systems').set, 'systems');
});

test('a publishable standalone library chooses systems, private app and unknown fall back to products', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-shape-'));
  try {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'example-ui', exports: './index.js' }));
    assert.equal(referenceSet(teamShape(root)).set, 'systems');
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'app', private: true }));
    mkdirSync(join(root, 'src/components/ui'), { recursive: true });
    writeFileSync(join(root, 'src/components/ui/button.stories.tsx'), 'export const Example = {};');
    writeFileSync(join(root, 'CODEOWNERS'), '* @example');
    const shape = teamShape(root);
    assert.equal(referenceSet(shape).set, 'products');
    assert.equal(shape.facts.find((f) => f.label === 'Stories')!.value, 'found');
    assert.equal(shape.facts.find((f) => f.label === 'Code owners')!.value, 'found');
    assert.match(shape.facts.find((f) => f.label === 'Single-app UI directory heuristic')!.value, /found/);
    writeFileSync(join(root, 'package.json'), '{broken');
    assert.match(teamShape(root).facts.find((f) => f.label === 'Package (root)')!.value, /not checked/);
    assert.equal(referenceSet(teamShape(root)).set, 'products');
    assert.match(
      teamShape(join(root, 'absent')).facts.find((f) => f.label === 'Stories')!.value,
      /not checked/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('story-only consumers and documentation applications do not make a library a product', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-shape-library-'));
  const write = (file: string, value: unknown) => writeFileSync(join(root, file), JSON.stringify(value));
  try {
    mkdirSync(join(root, 'packages/ui'), { recursive: true });
    mkdirSync(join(root, 'apps/docs'), { recursive: true });
    write('package.json', { private: true, workspaces: ['packages/*', 'apps/*'] });
    write('packages/ui/package.json', { name: '@example/ui', exports: './index.tsx' });
    write('apps/docs/package.json', { name: 'docs', private: true, scripts: { dev: 'next dev' } });
    writeFileSync(
      join(root, 'apps/docs/page.tsx'),
      "import { Button } from '@example/ui'; export const Page = () => <Button />;",
    );
    assert.equal(referenceSet(teamShape(root)).set, 'systems');
    rmSync(join(root, 'apps/docs/page.tsx'));
    writeFileSync(
      join(root, 'apps/docs/page.stories.tsx'),
      "import { Button } from '@example/ui'; export const Page = () => <Button />;",
    );
    assert.deepEqual(teamShape(root).productionConsumers, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('report and dashboard show set selection, facts, and override; invalid CLI overrides fail', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-benchmark-render-'));
  const cwd = process.cwd();
  try {
    process.chdir(root);
    const loaded = loadConfig(undefined);
    writeFileSync(join(root, 'styles.css'), '.x { color: red; padding: 4px; }');
    const reportPath = report(root, loaded, { out: join(root, 'report.html'), against: 'systems' });
    const html = readFileSync(reportPath, 'utf8');
    assert.match(html, /Compared with public systems/);
    assert.match(html, /[0-9]+ reference repos:/);
    assert.match(html, /Team structure/);
    assert.match(html, /--against products\|systems/);
    const dashboardPath = dashboard(root, loaded, {
      out: join(root, 'dashboard.html'),
      against: 'products',
    });
    assert.match(readFileSync(dashboardPath, 'utf8'), /Compared with public products/);
    assert.equal(
      JSON.parse(readFileSync(join(root, 'node_modules/.cache/ds-loop/dashboards.json'), 'utf8'))[0].against,
      'products',
    );
    for (const args of [
      ['report', fixture, '--against'],
      ['dashboard', fixture, '--against', 'unknown'],
    ]) {
      const run = spawnSync(
        process.execPath,
        ['--experimental-strip-types', join(cwd, 'src/cli.ts'), ...args],
        { encoding: 'utf8' },
      );
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /--against must be products or systems/);
    }
  } finally {
    process.chdir(cwd);
    rmSync(root, { recursive: true, force: true });
  }
});

test('shipped references are pinned, measured, named public sources, not candidates', () => {
  const references = readReferences();
  assert.ok(references.length);
  for (const r of references) {
    assert.match(r.url, /^https:\/\/github.com\//);
    assert.match(r.sha, /^[a-f0-9]{40}$/);
    assert.equal(Object.keys(r.ratios).length, 7);
    assert.ok(r.totalValues > 0);
    assert.ok(isMeasurableReference(r));
    for (const [dimension, ratio] of Object.entries(r.ratios)) {
      assert.ok(Number.isInteger(r.occurrences[dimension]));
      assert.ok(r.occurrences[dimension] <= r.totalValues);
      if (r.occurrences[dimension] < BENCHMARK_POLICY.minOccurrences) assert.equal(ratio, null);
      else assert.equal(typeof ratio, 'number');
    }
    assert.ok(['MIT', 'Apache-2.0', 'BSD-3-Clause'].includes(r.license));
  }
});

test('a dimension below the sample floor never contributes even with a numeric ratio', () => {
  const low = { ...reference(0), adapters: 'unread-instrument', occurrences: { [key]: 99 } };
  const d = compareReferences(
    { ...measured, ratios: { [key]: 0.5 } },
    [reference(0.4), reference(0.6), reference(0.8), low],
    'products',
  )[0];
  assert.equal(d.min, 0.4);
  assert.equal(d.references.length, 3);
});

test('fewer than three references cannot state a range', () => {
  for (const values of [[], [0.2], [0.2, 0.8]]) {
    const d = compare(0.5, values);
    assert.equal(d.status, 'too few reference repos to state a range');
    assert.equal(d.min, undefined);
    assert.equal(d.median, undefined);
  }
});

test('all dimensions below the floor exclude a repo; null ratios retain their actual denominator', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-benchmark-sample-'));
  try {
    writeFileSync(join(root, 'styles.css'), '.x { color: red; padding: 4px; }');
    const run = audit(root, { silent: true });
    const measurement = benchmarkMeasurement(run);
    assert.equal(measurement.occurrences[key], 1);
    assert.equal(measurement.ratios[key], null);
    assert.equal(measurement.occurrences['style-tokenization-shadow'], 0);
    assert.equal(measurement.ratios['style-tokenization-shadow'], null);
    assert.equal(isMeasurableReference(measurement), false);
    assert.equal(
      compareReferences(measured, [{ ...reference(0), ...measurement }], 'products')[0].references.length,
      0,
    );
    writeFileSync(
      join(root, 'styles.css'),
      Array.from({ length: 100 }, (_, i) => `.x${i} { color: red; }`).join('\n'),
    );
    const sufficient = benchmarkMeasurement(audit(root, { silent: true }));
    assert.equal(sufficient.occurrences[key], 100);
    assert.equal(sufficient.ratios[key], 0);
    assert.equal(isMeasurableReference(sufficient), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the shared report/dashboard table renders sparse contributor counts without a range', () => {
  for (const set of ['systems', 'products'] as const) {
    for (const count of [0, 1, 2]) {
      const references = Array.from({ length: count }, () => ({ ...reference(0.4), set }));
      const html = benchmarkHtml(
        { ...measured, ratios: { [key]: 0.5 } },
        teamShape(fixture),
        set,
        references,
      );
      assert.match(html, /too few reference repos to state a range/);
      assert.ok(html.includes(`${count} reference repos:`));
      assert.ok(!html.includes('0.4–0.4'));
    }
  }
});
