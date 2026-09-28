import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { analyseConsumers } from '../src/core/consumers.ts';

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'consumers-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const pkg = (name: string, extra: object = {}) => JSON.stringify({ name, ...extra });

const MONOREPO = {
  'package.json': JSON.stringify({ name: 'root', private: true }),
  'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
  'packages/ui/package.json': pkg('@acme/ui', {
    exports: { '.': './index.ts', './native': './native.ts', './exam': './exam.ts' },
  }),
  'packages/ui/index.ts': 'export const Button = 1;',
  'apps/web/package.json': pkg('@acme/web', { dependencies: { 'react-dom': '1' } }),
  'apps/web/src/a.tsx':
    "import { Button, Card as C } from '@acme/ui';\nimport type { Props } from '@acme/ui';\nimport '@acme/ui/styles.css';\n",
  'apps/web/src/b.stories.tsx': "import { Exam } from '@acme/ui/exam';\n",
  'apps/web/src/c.ts': "const lazy = () => import('@acme/ui');\nexport { Button } from '@acme/ui';\n",
  'apps/mobile/package.json': pkg('@acme/mobile', { dependencies: { 'react-native': '1' } }),
  'apps/mobile/src/x.tsx':
    "import Default, { Sheet } from '@acme/ui/native';\nconst u = require('@acme/ui/native');\n",
  'apps/tool/package.json': pkg('@acme/tool'),
  'apps/tool/src/t.ts': "import x from 'left-pad';\nimport { y } from '../../packages/ui/index';\n",
};

test('maps workspace imports with counts, named imports and platforms', () => {
  const r = analyseConsumers(tree(MONOREPO));
  assert.equal(r.workspaceSource, 'pnpm-workspace.yaml');
  const web = r.consumers.find((c) => c.package === '@acme/web')!;
  assert.equal(web.platform, 'web');
  const root = web.uses.find((u) => u.specifier === '@acme/ui')!;
  assert.equal(root.count, 4, 'import, type import, dynamic import and re-export');
  assert.equal(root.names.Button, 1);
  assert.equal(root.names.Card, 1, 'aliased import keeps the exported name');
  assert.equal(root.names.Props, 1);
  assert.ok(root.samples.every((s) => s.file.startsWith('apps/web/src/') && s.line >= 1));
  const mobile = r.consumers.find((c) => c.package === '@acme/mobile')!;
  assert.equal(mobile.platform, 'native');
  const native = mobile.uses.find((u) => u.specifier === '@acme/ui/native')!;
  assert.equal(native.count, 2);
  assert.equal(native.subpath, './native');
  assert.equal(native.names.default, 1);
  assert.equal(r.consumers.find((c) => c.package === '@acme/tool')!.platform, 'unknown');
  assert.equal(
    r.consumers.find((c) => c.package === '@acme/tool')!.uses.length,
    0,
    'externals and relative paths are not workspace imports',
  );
});

test('stories and tests never count as production adoption', () => {
  const r = analyseConsumers(tree(MONOREPO));
  const exam = r.consumers
    .find((c) => c.package === '@acme/web')!
    .uses.find((u) => u.specifier === '@acme/ui/exam')!;
  assert.equal(exam.count, 1);
  assert.equal(exam.production, 0);
  const unconsumed = r.unconsumedExports.find((e) => e.subpath === './exam');
  assert.deepEqual(unconsumed, { package: '@acme/ui', subpath: './exam', storyOrTestOnly: true });
  assert.ok(!r.unconsumedExports.some((e) => e.subpath === '.' || e.subpath === './native'));
});

test('scope narrows specifiers and exports; no workspace is not-checked, not "nothing shared"', () => {
  const r = analyseConsumers(tree(MONOREPO), { scope: '@acme/ui/native' });
  const web = r.consumers.find((c) => c.package === '@acme/web')!;
  assert.equal(web.uses.length, 0);
  const empty = analyseConsumers(tree({ 'package.json': pkg('solo') }));
  assert.equal(empty.packages.length, 0);
  assert.equal(empty.workspaceSource, 'none');
});

test('package.json workspaces with ! exclusions', () => {
  const r = analyseConsumers(
    tree({
      'package.json': JSON.stringify({ name: 'r', workspaces: ['apps/*', '!apps/legacy'] }),
      'apps/a/package.json': pkg('a'),
      'apps/legacy/package.json': pkg('legacy'),
    }),
  );
  assert.deepEqual(
    r.packages.map((p) => p.name),
    ['a'],
  );
});

test('html: generated from the map, escaped, deterministic, story-only flagged', async () => {
  const { renderConsumersHtml } = await import('../src/core/consumers-html.ts');
  const root = tree({
    ...MONOREPO,
    'apps/web/src/evil.ts': "import { X } from '@acme/ui';\n// </script><img src=x>\n",
  });
  const r = analyseConsumers(root);
  const opts = { label: '<b>demo</b>', generatedAt: '2026-01-01T00:00:00Z' };
  const a = renderConsumersHtml(r, opts);
  assert.equal(a, renderConsumersHtml(r, opts));
  assert.ok(!a.includes('<b>demo</b>'), 'label escaped');
  assert.match(a, /stories\/tests only — not production adoption/);
  assert.match(a, /@acme\/ui\/exam/);
  assert.ok(!/https?:\/\//.test(a), 'no external URLs');
  const empty = renderConsumersHtml(analyseConsumers(tree({ 'package.json': pkg('solo') })), opts);
  assert.match(empty, /Not checked\./);
});
