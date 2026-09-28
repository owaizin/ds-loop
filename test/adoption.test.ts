import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { comparability, scorecard } from '../src/commands/scorecard.ts';
import { componentUses } from '../src/core/component-usage.ts';
import { renderConsumersHtml } from '../src/core/consumers-html.ts';
import { CONSUMERS_VERSION, analyseConsumers, pathAliases } from '../src/core/consumers.ts';

function project(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'adoption-'));
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'example', workspaces: ['apps/*', 'packages/*'] }),
    'packages/ui/package.json': JSON.stringify({
      name: '@example/ui',
      exports: { '.': './index.ts', './forms': './forms.ts' },
    }),
    'apps/web/package.json': JSON.stringify({ name: '@example/web', dependencies: { 'external-ui': '1' } }),
    'apps/web/App.tsx': `import * as UI from '@example/ui';
import { Field as Input } from '@example/ui/forms';
import Local from './Local';
import {Modal} from 'external-ui';
import type {Props} from '@example/ui';
const example = '<UI.Fake />'; // <UI.Comment />
export const App = () => <><UI.Button/><UI.Button/><Input/><Local/><Modal/><Unknown/><Props/><div/></>;`,
    'apps/web/App.stories.tsx': `import {Button} from '@example/ui'; export const Story = () => <Button/>;`,
    'apps/web/App.test.tsx': `import {Button} from '@example/ui'; const x = <Button/>;`,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('JSX adoption resolves imports, excludes stories/tests, keeps unknowns and correct denominator', () =>
  project((root) => {
    const r = analyseConsumers(root, { scope: '@example/ui' });
    const app = r.consumers.find((c) => c.package === '@example/web')!;
    const u = app.usage.production;
    assert.equal(u.shared.elements, 3);
    assert.equal(u.shared.distinctComponents, 2);
    assert.equal(u.local.elements, 1);
    assert.equal(u.external.elements, 1);
    assert.equal(u.unresolved.elements, 2);
    assert.equal(u.sharedComponentShare, 0.75);
    assert.equal(app.usage.storiesAndTests.shared.elements, 2);
    assert.equal(u.sharedSubpaths.find((s) => s.subpath === './forms')!.shareOfSharedAndLocal, 0.25);
    assert.equal(u.hits.find((h) => h.element === 'Input')!.component, '@example/ui/forms#Field');
    assert.equal(u.hits.find((h) => h.element === 'UI.Button')!.line, 7);
    assert.ok(renderConsumersHtml(r, { label: 'Example DS', generatedAt: 'fixed' }).includes('75.0%'));
    assert.equal(
      r.consumers.find((c) => c.package === '@example/ui')!.usage.production.sharedComponentShare,
      null,
    );
    assert.equal(r.analysisVersion, CONSUMERS_VERSION);
  }));

test('non-workspaces are not checked; default, same-package and unresolved alias origins are explicit', () => {
  const root = mkdtempSync(join(tmpdir(), 'adoption-empty-'));
  try {
    assert.equal(analyseConsumers(root).status, 'not-checked');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const hits = componentUses(
    `import Shared from '@example/ui'; import Own from '@example/app'; import Alias from '@/button'; const x=<><Shared/><Own/><Alias/></>;`,
    'App.tsx',
    '@example/app',
    ['@example/app', '@example/ui'],
  );
  assert.deepEqual(
    hits.map((h) => h.origin),
    ['shared', 'local', 'unresolved'],
  );
  assert.equal(hits[0].component, '@example/ui#default');
});

test('scorecard appends per-package ratios, tracks deltas and consumers instrument changes', () =>
  project((root) => {
    const first = scorecard(root, { dir: root, json: true }).row;
    const key = 'shared-component-share:@example/web';
    assert.equal(first.ratios[key], 0.75);
    assert.equal(first.consumersVersion, CONSUMERS_VERSION);
    writeFileSync(
      join(root, 'apps/web/Extra.tsx'),
      `import Local from './Local'; export const X = () => <Local/>;`,
    );
    const second = scorecard(root, { dir: root, json: true });
    assert.equal(second.row.ratios[key], 0.6);
    assert.equal(second.previous!.ratios[key], 0.75);
    assert.equal(comparability(second.previous, second.row).clean, true);
    assert.equal(comparability({ ...first, consumersVersion: '0.0.0' }, second.row).clean, false);
    assert.equal(comparability({ ...first, consumersVersion: undefined }, second.row).clean, false);
    const rows = readFileSync(join(root, '.ds-scorecard/history.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s));
    assert.equal(rows.length, 2);
    assert.ok(!Object.keys(rows[1].ratios).some((k) => k.includes('elements')));
  }));

test('type arguments do not become JSX; namespace and named aliases share component identity', () => {
  const text = `import * as UI from '@example/ui'; import {Button as B} from '@example/ui';
  type X = Wrapper<Button>; function generic<TItem>(x: Props<TItem>) { return <><UI.Button/><B/></>; }`;
  const hits = componentUses(text, 'App.tsx', '@example/app', ['@example/ui']);
  assert.deepEqual(
    hits.map((h) => h.element),
    ['UI.Button', 'B'],
  );
  assert.equal(hits[0].component, hits[1].component);
});

test('JSX in JavaScript files is included', () =>
  project((root) => {
    writeFileSync(
      join(root, 'apps/web/Legacy.js'),
      `import {Button} from '@example/ui'; export const X = () => <Button/>;`,
    );
    assert.equal(
      analyseConsumers(root).consumers.find((c) => c.package === '@example/web')!.usage.production.shared
        .elements,
      4,
    );
  }));

test('tsconfig path aliases and same-file components count as local', () => {
  const text = `import Alias from '@/button'; function Row() { return null; }
  const x = <><Alias/><Row/><Missing/></>;`;
  const hits = componentUses(text, 'App.tsx', '@example/app', ['@example/ui'], undefined, [], ['@/']);
  assert.deepEqual(
    hits.map((h) => h.origin),
    ['local', 'local', 'unresolved'],
  );
  const root = mkdtempSync(join(tmpdir(), 'adoption-paths-'));
  try {
    writeFileSync(
      join(root, 'tsconfig.json'),
      `{ // comment\n "compilerOptions": { "paths": { "@/*": ["./src/*"], "~lib": ["./lib"] } } }`,
    );
    assert.deepEqual(pathAliases(join(root, 'tsconfig.json')), ['@/', '~lib']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('comparisons against capitalised operands are not JSX', () => {
  const text = `const LIMIT = 2; function Row() { return <Row/>; }
  if (a < LIMIT) {} const ok = xs[0] < MAX && (n) < Y; const p = <p>Batch <Row/></p>;`;
  const hits = componentUses(text, 'App.tsx', '@example/app', []);
  assert.deepEqual(
    hits.map((h) => h.element),
    ['Row', 'Row'],
  );
});
