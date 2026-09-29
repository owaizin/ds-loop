import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { context } from '../src/commands/context.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import type { LoadedConfig } from '../src/config/load.ts';

const loaded = (over: Partial<LoadedConfig> = {}): LoadedConfig => ({
  config: DEFAULT_CONFIG,
  severityOverrides: {},
  system: null,
  source: 'defaults',
  ...over,
});

/** context() prints; the file it writes is what the test reads */
function inTree<T>(files: Record<string, string>, fn: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-contract-'));
  const log = console.log;
  console.log = () => {};
  try {
    for (const [name, body] of Object.entries(files)) {
      const full = join(root, name);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body);
    }
    return fn(root);
  } finally {
    console.log = log;
    rmSync(root, { recursive: true, force: true });
  }
}

const TOKENS = ':root{--ds-color-bg-default:#ffffff;--ds-color-bg-raised:#f5f5f5;--paper:#080512}\n';

test('--write-contract writes measured counts and leaves intent as TODO', () => {
  const md = inTree({ 'tokens.css': TOKENS }, (root) => {
    context(root, loaded(), { writeContract: true });
    return readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
  });

  assert.match(md, /^---\ngenerated_by: ds-loop context --write-contract/);
  assert.match(md, /\*\*3\*\* token declarations/);
  assert.match(md, /`--ds-color-…`/); // brand prefix + semantic namespace, read as one
  assert.match(md, /`--paper`/); // a bare name is reported as having no namespace
  assert.match(md, /- \*\*Primitive tier\*\* —.*TODO/);
  // the one thing it must never do: state a convention nobody wrote down
  assert.doesNotMatch(md, /This system uses|The convention is|appears to follow/);
});

test('an existing contract is never overwritten', () => {
  const kept = '# Ours\n\nHand-written. Do not clobber.\n';
  const after = inTree({ 'tokens.css': TOKENS, 'DESIGN-SYSTEM.md': kept }, (root) => {
    context(root, loaded(), { writeContract: true });
    return readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
  });
  assert.equal(after, kept);
});

test('recorded exceptions are mirrored into the contract with their reasons', () => {
  // the other half of the ignore feature: the config is the source of truth, the
  // contract is the version a human reads before arguing with a finding
  const reason = 'The palette layer lands next sprint and this token is the seed for it.';
  const md = inTree({ 'tokens.css': TOKENS }, (root) => {
    context(
      root,
      loaded({
        config: {
          ...DEFAULT_CONFIG,
          ignore: [{ rule: 'color/semantic-holds-literal', value: '--paper', reason }],
        },
      }),
      { writeContract: true },
    );
    return readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
  });
  assert.match(md, /## Sanctioned deviations/);
  assert.match(md, /color\/semantic-holds-literal/);
  assert.ok(md.includes(reason));
});

test('nothing is written when no adapter reads the tree', () => {
  // an empty contract would claim a measurement pass that never happened
  const exists = inTree({ 'notes.txt': 'hello\n' }, (root) => {
    context(root, loaded(), { writeContract: true });
    try {
      readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
      return true;
    } catch {
      return false;
    }
  });
  assert.equal(exists, false);
});

test('a saved contract retains conversion and adapter limits alongside measured counts', () => {
  const md = inTree({ 'tokens.css': ':root { --surface: lab(40% 0 0); --radius: 18px; }' }, (root) => {
    context(root, loaded(), { writeContract: true });
    return readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
  });
  assert.match(md, /1 colour value\(s\).*cannot convert/);
  assert.ok(md.includes('lab(40% 0 0)'));
  assert.match(md, /not rule bodies/);
  assert.doesNotMatch(md, /tier rules have nothing to read/);
  assert.doesNotMatch(md, /Every format present in this tree was read/);
});

test('a saved exception retains its file selector rather than becoming blanket permission', () => {
  const md = inTree({ 'tokens.css': TOKENS }, (root) => {
    context(
      root,
      loaded({
        config: {
          ...DEFAULT_CONFIG,
          ignore: [
            {
              rule: 'color/semantic-holds-literal',
              value: '--paper',
              files: ['legacy/*'],
              reason: 'Retain the old theme during migration.',
            },
            { rule: 'token/tier-leakage', value: '--radius', reason: 'Shared foundation is intentional.' },
          ],
        },
      }),
      { writeContract: true },
    );
    return readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
  });
  assert.match(md, /legacy\/\*/);
  assert.match(md, /all files/);
});

test('package measurements are local and honor the sample floor boundary', () => {
  inTree(
    {
      'package.json': '{"workspaces":["packages/*"]}',
      'packages/full/package.json': '{"name":"full"}',
      'packages/full/style.css': Array.from({ length: 100 }, (_, i) => `.x${i} { color: var(--ink); }`).join(
        '\n',
      ),
      'packages/small/package.json': '{"name":"small"}',
      'packages/small/style.css': Array.from({ length: 99 }, (_, i) => `.x${i} { color: red; }`).join('\n'),
    },
    (root) => {
      context(root, loaded(), { writeContract: true });
      const md = readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
      const full = md.split('### full')[1].split('### small')[0];
      const small = md.split('### small')[1];
      assert.match(full, /css-rule-bodies@/);
      assert.match(full, /style-tokenization-color \| 1 \|/);
      assert.match(small, /style-tokenization-color \| not measured/);
    },
  );
});

test('workspace sections include packages without measurable styling', () => {
  inTree(
    {
      'package.json': '{"workspaces":["packages/*"]}',
      'packages/styled/package.json': '{"name":"@example/styled"}',
      'packages/styled/style.css': '.x { color: red; }',
      'packages/empty/package.json': '{"name":"@example/empty"}',
    },
    (root) => {
      context(root, loaded(), { writeContract: true });
      const md = readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
      assert.match(md, /### @example\/styled/);
      assert.match(md, /### @example\/empty/);
      assert.match(md, /not checked — no adapter/);
      assert.doesNotMatch(md, /0%/);
    },
  );
});

test('example-workspace lists every discovered package and preserves the resulting contract', () => {
  inTree({}, (root) => {
    cpSync('fixtures/example-workspace', root, { recursive: true });
    context(root, loaded(), { writeContract: true });
    const file = join(root, 'DESIGN-SYSTEM.md');
    const md = readFileSync(file, 'utf8');
    for (const name of ['@example/ui', '@example/dashboard', '@example/portal']) assert.ok(md.includes(name));
    assert.match(md, /not measured/);
    context(root, loaded(), { writeContract: true });
    assert.equal(readFileSync(file, 'utf8'), md);
  });
});

test('shared-component share uses production JSX occurrences and the common sample floor', () => {
  inTree(
    {
      'package.json': '{"workspaces":["packages/*"]}',
      'packages/ui/package.json': '{"name":"@example/ui"}',
      'packages/ui/index.tsx': 'export const Button = () => <button />;',
      'packages/app/package.json': '{"name":"@example/app"}',
      'packages/app/App.tsx': `import { Button } from '@example/ui'; export const App = () => <>${'<Button />'.repeat(100)}</>;`,
      'packages/small/package.json': '{"name":"@example/small"}',
      'packages/small/App.tsx': `import { Button } from '@example/ui'; export const App = () => <>${'<Button />'.repeat(99)}</>;`,
    },
    (root) => {
      context(root, loaded(), { writeContract: true });
      const md = readFileSync(join(root, 'DESIGN-SYSTEM.md'), 'utf8');
      assert.match(md.split('### @example/app')[1].split('### ')[0], /shared-component-share \| 1 \|/);
      assert.match(
        md.split('### @example/small')[1].split('### ')[0],
        /shared-component-share \| not measured/,
      );
    },
  );
});
