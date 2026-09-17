import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';

function inTree<T>(files: Record<string, string>, fn: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-coverage-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      const full = join(root, name);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('audit reports the formats it could not read', () => {
  const coverage = inTree(
    {
      'tokens.css': ':root{--brand:#1da1f2}\n',
      'theme.scss': '$brand: #1da1f2;\n',
      'Widget.vue': '<template><div class="p-[13px]" /></template>\n',
      'package.json': '{"name":"x"}\n',
      'README.md': '# x\n',
      'logo.png': 'not-really-a-png',
    },
    (root) => audit(root, { silent: true }).coverage,
  );

  assert.deepEqual(coverage.unreadFormats, { '.scss': 1, '.vue': 1 });
  // package.json and README.md are not styling; flagging them would bury the real gaps
  assert.ok(!('.json' in coverage.unreadFormats), 'package.json must not read as unread styling');
  assert.ok(!('.md' in coverage.unreadFormats));
  assert.equal(coverage.complete, false);
});

test('a design-token file is detected by name, package.json is not', () => {
  const coverage = inTree(
    { 'tokens.css': ':root{--brand:#1da1f2}\n', 'design-tokens.json': '{}', 'package.json': '{}' },
    (root) => audit(root, { silent: true }).coverage,
  );
  assert.deepEqual(coverage.unreadTokenFiles, ['design-tokens.json']);
});

test('an unconvertible colour is surfaced in coverage, not silently dropped', () => {
  const coverage = inTree(
    { 'tokens.css': ':root{--brand:lab(52% 40 60);--ok:oklch(0.6 0.2 30)}\n' },
    (root) => audit(root, { silent: true }).coverage,
  );
  assert.equal(coverage.unconvertible.count, 1, 'lab() is recognised but not convertible');
  assert.deepEqual(coverage.unconvertible.samples, ['lab(52% 40 60)']);
  assert.equal(coverage.complete, false);
});

test('a low-alpha colour is undecided, not unconvertible', () => {
  // found on a real app: 13 rgba() overlay tints were reported as "recognised but
  // not convertible". They convert fine — what is undecided is their role, which is
  // a judgement for a human and not a hole in the engine. Conflating the two makes
  // both numbers unreadable.
  const coverage = inTree(
    { 'tokens.css': ':root{--scrim:rgba(0, 0, 0, 0.08);--brand:#1da1f2}\n' },
    (root) => audit(root, { silent: true }).coverage,
  );
  assert.equal(coverage.unconvertible.count, 0, 'rgba is convertible');
  assert.equal(coverage.undecided.count, 1);
  assert.deepEqual(coverage.undecided.samples, ['rgba(0, 0, 0, 0.08)']);
  // an undecided role is not a coverage gap
  assert.equal(coverage.complete, true, 'the tool read and converted it; the meaning is yours');
});

test('literal-colors-per-distinct counts declarations only', () => {
  // it silently changed quantity when the markup adapter shipped: a real app
  // measured [redacted] against a declared palette of [redacted], under an unchanged name.
  // Rows 001-005 were declarations-only by construction, so it must stay that way.
  const report = inTree(
    {
      'tokens.css': ':root{--brand:#1da1f2;--accent:#1da1f2}\n',
      'App.tsx': 'const a = "bg-[#ff0000] text-[#00ff00] border-[#0000ff]";\n',
    },
    (root) => audit(root, { silent: true }),
  );
  // 2 declarations over 1 distinct declared value = 2, regardless of the 3 use sites
  assert.equal(report.ratios['literal-colors-per-distinct'], 2);
  const markup = report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup');
  assert.equal(markup?.data?.colors, 3, 'use-site volume is reported by the markup rule instead');
});

test('coverage states what each adapter reads inside the files it opens', () => {
  const coverage = inTree(
    { 'tokens.css': ':root{--brand:#1da1f2}\n', 'App.tsx': 'const x = "p-[13px]";\n' },
    (root) => audit(root, { silent: true }).coverage,
  );
  const tw = coverage.partialReads.find((p) => p.adapter.startsWith('tailwind-jsx'));
  assert.ok(tw, 'the tailwind adapter should be listed');
  // "the file was opened" is not "the file was covered"
  assert.match(tw.reads, /not inline style objects, not CSS-in-JS/);
});

test('a source with nothing unread and every colour converted reports complete', () => {
  const coverage = inTree(
    { 'tokens.css': ':root{--palette-blue-500:#1da1f2}\n' },
    (root) => audit(root, { silent: true }).coverage,
  );
  assert.deepEqual(coverage.unreadFormats, {});
  assert.equal(coverage.unconvertible.count, 0);
  assert.equal(coverage.complete, true);
});
