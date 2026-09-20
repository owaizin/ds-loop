import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fix } from '../src/commands/fix.ts';

function fixture(css: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-fix-'));
  mkdirSync(join(dir, 'css'));
  writeFileSync(join(dir, 'css', 't.css'), css);
  writeFileSync(
    join(dir, 'SOURCE.json'),
    JSON.stringify({
      label: 'f',
      upstream: 'x',
      fixtureSha: 'x',
      retrievedAt: 'x',
      path: 'css',
      shippedPrimitiveCount: null,
    }),
  );
  return dir;
}

test('fix: inserts fallback from the resolved literal, skips already-safe and unresolvable', () => {
  const dir = fixture(
    ':root{\n' +
      '  --p-blue: #2563eb;\n' +
      '  --ok: var(--p-blue);\n' + // fixable
      '  --safe: var(--p-blue, #2563eb);\n' + // already has a fallback
      '  --chain: var(--other);\n' + // --other undefined -> unresolvable
      '}\n',
  );
  try {
    const edits = fix(dir);
    assert.equal(edits.length, 1);
    assert.equal(edits[0]?.from, 'var(--p-blue)');
    assert.equal(edits[0]?.to, 'var(--p-blue, #2563eb)');

    fix(dir, { write: true });
    const after = readFileSync(join(dir, 'css', 't.css'), 'utf8');
    assert.ok(after.includes('--ok: var(--p-blue, #2563eb)'));
    assert.ok(after.includes('--safe: var(--p-blue, #2563eb)')); // untouched
    assert.ok(after.includes('--chain: var(--other)')); // untouched
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, ['--experimental-strip-types', CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

test('fix help is available without a path or valid project config and never writes', () => {
  const dir = fixture(':root{--p:#123456;--use:var(--p)}');
  try {
    const before = readFileSync(join(dir, 'css/t.css'), 'utf8');
    writeFileSync(join(dir, 'ds-loop.config.json'), '{ invalid');
    const result = run(['fix', '--help', '--write'], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ds-loop fix <path>/);
    assert.match(result.stdout, /alias chains/);
    assert.match(result.stdout, /ds-loop fix \. --write/);
    assert.equal(readFileSync(join(dir, 'css/t.css'), 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fix reports ineligible references separately from having no candidates', () => {
  const dir = fixture(':root{--a:var(--b);--b:var(--absent)}');
  try {
    const before = readFileSync(join(dir, 'css/t.css'), 'utf8');
    const skipped = run(['fix', '.', '--write'], dir);
    assert.equal(skipped.status, 0, skipped.stderr);
    assert.match(skipped.stdout, /2 fallback-less var\(\) reference\(s\) examined/);
    assert.match(skipped.stdout, /2 skipped/);
    assert.match(skipped.stdout, /direct color or dimension literal/);
    assert.equal(readFileSync(join(dir, 'css/t.css'), 'utf8'), before);
    writeFileSync(join(dir, 'css/t.css'), ':root{--p:#123456;--safe:var(--p,#123456)}');
    const noCandidates = run(['fix', '.'], dir);
    assert.match(noCandidates.stdout, /No fallback-less var\(\) candidates/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fix explains unsupported scope and rejects audit-only flags without changing files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-fix-jsx-'));
  const body = '<div className="bg-[#123456]" />';
  try {
    writeFileSync(join(dir, 'Card.tsx'), body);
    const result = run(['fix', '.'], dir);
    assert.match(result.stdout, /No CSS custom-property declarations/);
    const rejected = run(['fix', '.', '--target', 'color', '--write'], dir);
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /does not support --target/);
    assert.equal(readFileSync(join(dir, 'Card.tsx'), 'utf8'), body);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fix accepts the write flag before its explicit path', () => {
  const dir = fixture(':root{--p:#123456;--use:var(--p)}');
  try {
    const result = run(['fix', '--write', '.'], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(dir, 'css/t.css'), 'utf8'), /var\(--p, #123456\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
