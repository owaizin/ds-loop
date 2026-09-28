import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cssCustomPropsAdapter } from '../src/adapters/css-custom-props.ts';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

test('selector attribution matches the previous prefix search, including compact and multiline CSS', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-selector-'));
  try {
    const selectors = [
      ':root',
      '.a,\n.b',
      '.parent .child',
      '[data-theme="dark"]',
      '@media (x) {\n.a',
      '/* comment */ .x:hover',
      'a,, b',
      '',
      '.a[foo]',
      'á .b',
    ];
    const text = selectors
      .map((s, i) => `${s}{--example-${i}:#123; --other-${i}:#234;} .last{\n--next-${i}:#345;\n}`)
      .join('\r\n');
    writeFileSync(join(dir, 'tokens.css'), text);
    const values = cssCustomPropsAdapter.extract(
      { root: dir, fixtureSha: 'test', label: 'Example DS' },
      DEFAULT_CONFIG,
    );
    const lines = text.split('\n');
    assert.equal(values.length, selectors.length * 3);
    for (const value of values) {
      const prefix = lines.slice(0, value.provenance.line).join('\n');
      const open = prefix.lastIndexOf('{');
      const match =
        open < 0 ? null : prefix.slice(0, open).match(/([.#:\[\]\w-]+(?:\s*,\s*[.#:\[\]\w-]+)*)\s*$/);
      assert.equal(value.provenance.selector, match ? match[1].trim() : null);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a 5,000-file authored tree audits within a generous 30-second budget', { timeout: 60_000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-speed-'));
  try {
    writeFileSync(join(dir, 'tokens.css'), ':root{--space-3:12px;--font-size-small:12px;}');
    for (let folder = 0; folder < 50; folder++) {
      const group = join(dir, `group-${folder}`);
      mkdirSync(group);
      for (let file = 0; file < 100; file++)
        writeFileSync(join(group, `${file}.css`), '.a{padding:12px;font-size:12px}');
    }
    const start = performance.now();
    const report = audit(dir, { silent: true });
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 30_000, `audit took ${elapsed.toFixed(0)}ms; generous budget is 30,000ms`);
    assert.equal(report.styleInventory.spacing?.occurrences, 5_000);
    assert.equal(report.styleInventory.typography?.occurrences, 5_000);
    const suggestions = report.findings.flatMap((f) => f.suggestion?.values ?? []);
    assert.equal(suggestions.length, 10_000);
    assert.equal(new Set(suggestions.map((s) => s.file)).size, 5_000);
    assert.ok(
      suggestions.every(
        (s) =>
          s.status === 'exact' &&
          s.candidates[0]?.token === (s.property === 'padding' ? '--space-3' : '--font-size-small'),
      ),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
