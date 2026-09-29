import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { impact } from '../src/commands/impact.ts';

test('impact returns all static locations, matches original export names, separates stories', () => {
  const root = mkdtempSync(join(tmpdir(), 'impact-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ workspaces: ['ui', 'app'] }));
  for (const name of ['ui', 'app']) {
    mkdirSync(join(root, name));
    writeFileSync(
      join(root, name, 'package.json'),
      JSON.stringify({ name, exports: { '.': './index.ts', './unused': './unused.ts' } }),
    );
  }
  writeFileSync(
    join(root, 'app/a.ts'),
    `${"import { Button as B } from 'ui';\n".repeat(7)}// import { Button } from 'ui';\nconst lazy = import('ui');\nexport { Button } from 'ui';`,
  );
  writeFileSync(join(root, 'app/a.stories.tsx'), "import { Button } from 'ui';");
  const result = impact('ui#Button', root, { silent: true });
  assert.equal(result.production.length, 7);
  assert.equal(result.production[6].line, 7);
  assert.equal(result.storiesAndTests.length, 1);
  assert.equal(impact('B', root, { silent: true }).production.length, 0);
  assert.ok(result.unconsumedExports.some((e) => e.package === 'ui' && e.subpath === './unused'));
  assert.match(result.limits.join(' '), /dynamic imports/);
});
