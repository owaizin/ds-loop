import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The public product is "Design System Loops"; the identifier is `ds-loop`.
 *
 * This file guards the identifier half. A naming pass reads the branding half and
 * reasonably concludes that `ds-loop` looks like the old name — but these strings
 * are not branding. Some of them are already written into other people's
 * repositories:
 *
 *   - hook entries in users' .claude/settings.json point at ds-loop-guard.mjs
 *   - .ds-scorecard/history.jsonl is append-only history in users' repos
 *   - .ds-ops-config.yml is Murphy Trueman's filename, kept verbatim for interop
 *
 * Renaming any of them is a silent break in someone else's checkout, which is why
 * a test says so rather than a paragraph nobody reads at rename time.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

test('the package, binary and entry point stay ds-loop', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'ds-loop');
  assert.deepEqual(Object.keys(pkg.bin), ['ds-loop']);
  assert.ok(existsSync(join(ROOT, 'bin', 'ds-loop.mjs')), 'bin/ds-loop.mjs is the published entry point');
});

test('the skill keeps its invocation name', () => {
  // `$ds-loop` in the coordinator and in users' prompts resolves on this string
  assert.match(read('skill/SKILL.md'), /^name: ds-loop$/m);
  assert.ok(
    existsSync(join(ROOT, 'skill', 'hooks', 'ds-loop-guard.mjs')),
    'hook path is in users settings.json',
  );
  assert.ok(existsSync(join(ROOT, 'skill', 'bin', 'ds-loop')), 'skill launcher path');
});

test('config filenames are unchanged, including the interop one', () => {
  const load = read('src/config/load.ts');
  for (const name of [
    '.ds-loop-config.yml',
    '.ds-loop-config.yaml',
    'ds-loop.config.json',
    '.ds-ops-config.yml', // Murphy Trueman's filename — renaming breaks interop
    '.ds-ops-config.yaml',
  ]) {
    assert.ok(load.includes(name), `${name} must still be read`);
  }
});

test('state paths written into user repositories are unchanged', () => {
  assert.match(read('src/commands/scorecard.ts'), /'\.ds-scorecard'/);
  assert.match(read('skill/hooks/ds-loop-guard.mjs'), /node_modules\/\.cache\/ds-loop/);
});

test('CLI report headers are the command name, not the product name', () => {
  // these are verified against real runs by test/readme.test.ts; rebranding one
  // breaks documentation verification, and "fixing" that test removes the guard
  // against fabricated samples
  for (const file of ['audit.ts', 'context.ts', 'scorecard.ts', 'sweep.ts']) {
    const src = read(join('src', 'commands', file));
    assert.match(src, /ds-loop (audit|context|scorecard|sweep) —/, `${file} header must stay ds-loop`);
    assert.doesNotMatch(src, /Design System Loops/, `${file} must not carry product branding in output`);
  }
});
