import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
