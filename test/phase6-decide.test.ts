import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { context } from '../src/commands/context.ts';
import { decide } from '../src/commands/decide.ts';
import { loadConfig } from '../src/config/load.ts';

test('decision records append unique Markdown files and are discovered by context', () => {
  const root = mkdtempSync(join(tmpdir(), 'decide-'));
  const input = {
    decision: 'Use shared buttons',
    alternatives: 'Keep local buttons',
    evidence: ['ui/Button.tsx:2'],
    owner: 'Design systems',
    date: '2026-09-29',
  };
  const a = decide(root, input);
  const b = decide(root, input);
  assert.notEqual(a, b);
  assert.match(readFileSync(a, 'utf8'), /Use shared buttons/);
  assert.match(readFileSync(a, 'utf8'), /ui\/Button.tsx:2/);
  const logs: string[] = [];
  const original = console.log;
  try {
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    context(root, loadConfig(undefined));
  } finally {
    console.log = original;
  }
  assert.match(logs.join('\n'), /docs\/decisions/);
  assert.throws(() => decide(root, { ...input, owner: '' }), /owner/);
  assert.throws(() => decide(root, { ...input, date: '2026-02-31' }), /date/);
});
