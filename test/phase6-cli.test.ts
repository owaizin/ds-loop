import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
function project() {
  const root = mkdtempSync(join(tmpdir(), 'phase6-cli-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'example', workspaces: ['ui', 'app'] }));
  for (const name of ['ui', 'app']) {
    mkdirSync(join(root, name));
    writeFileSync(
      join(root, name, 'package.json'),
      JSON.stringify({ name, ...(name === 'ui' ? { exports: './Button.tsx' } : {}) }),
    );
  }
  writeFileSync(join(root, 'ui/Button.tsx'), 'export const Button = () => <button />;');
  writeFileSync(join(root, 'ui/Button.stories.tsx'), 'export const Basic = () => <Button />;');
  writeFileSync(join(root, 'ui/styles.css'), '.button { color: #fff; background: var(--surface); }');
  writeFileSync(
    join(root, 'app/index.tsx'),
    "import { Button } from 'ui'; export const App = () => <Button />;",
  );
  return root;
}
const run = (root: string, ...args: string[]) =>
  execFileSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
test('CLI impact and decide produce usable JSON and context reads the record', () => {
  const root = project();
  const result = JSON.parse(run(root, 'impact', 'ui#Button', '--json'));
  assert.equal(result.production[0].file, 'app/index.tsx');
  const record = JSON.parse(
    run(
      root,
      'decide',
      '--decision',
      'Use Button',
      '--alternatives',
      'Local button',
      '--evidence',
      'ui/Button.tsx:1',
      '--owner',
      'UI',
      '--status',
      'proposed',
      '--json',
    ),
  );
  assert.match(readFileSync(record.file, 'utf8'), /Status: proposed/);
  assert.match(run(root, 'context'), /Use Button · proposed/);
});
test('scorecard/report include package-category ratios, single baseline, comparison and corrupt-history refusal', () => {
  const root = project();
  const first = JSON.parse(run(root, 'scorecard', '--json')).row;
  assert.equal(first.ratios['style-tokenization-color:ui'], 0.5);
  assert.equal(first.ratios['docs-documented:ui'], 1);
  assert.ok(first.docsVersion);
  run(root, 'report', '--out', 'one.html');
  assert.match(readFileSync(join(root, 'one.html'), 'utf8'), /One recorded run is a baseline, not a trend/);
  run(root, 'scorecard', '--json');
  const history = readFileSync(join(root, '.ds-scorecard/history.jsonl'), 'utf8');
  run(root, 'report', '--out', 'two.html');
  const html = readFileSync(join(root, 'two.html'), 'utf8');
  assert.match(html, /2 recorded runs/);
  assert.match(html, /style-tokenization-color:ui/);
  assert.match(html, /Component documentation/);
  assert.equal(readFileSync(join(root, '.ds-scorecard/history.jsonl'), 'utf8'), history);
  writeFileSync(join(root, '.ds-scorecard/history.jsonl'), `${history}null\n`);
  run(root, 'report', '--out', 'invalid.html');
  assert.match(readFileSync(join(root, 'invalid.html'), 'utf8'), /invalid rows; adoption was not checked/);
});
