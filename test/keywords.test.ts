import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { classifyStyle } from '../src/adapters/css-rule-bodies.ts';
import { ADAPTERS } from '../src/adapters/registry.ts';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { formatCoverage } from '../src/core/coverage.ts';
import { keywordParts } from '../src/core/literals.ts';

const keywords = [
  'transparent',
  'currentColor',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'none',
  'auto',
  'normal',
];
const families = [
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
];

test('every adapter retains all keyword classes with reasons and component exclusions', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-keywords-'));
  try {
    const all = [...keywords, ...families].map((v) => v.toUpperCase());
    writeFileSync(
      join(root, 'tokens.css'),
      `:root {\n${all.map((v, i) => `--ds-${i}: ${v};`).join('\n')}\n}\n.a {\n${all.map((v, i) => `${i < keywords.length ? 'color' : 'font-family'}: ${v};`).join('\n')}\n}`,
    );
    writeFileSync(
      join(root, 'patterns.scss'),
      `.a {\n${all.map((v, i) => `${i < keywords.length ? 'color' : 'font-family'}: ${v};`).join('\n')}\n}`,
    );
    writeFileSync(
      join(root, 'tokens.json'),
      JSON.stringify(Object.fromEntries(all.map((v, i) => [`ds${i}`, { $type: 'color', $value: v }]))),
    );
    writeFileSync(join(root, 'view.tsx'), `const classes = "${all.map((v) => `bg-[${v}]`).join(' ')}";`);
    for (const adapter of ADAPTERS) {
      const values = adapter.extract({ root, label: 'keywords', fixtureSha: 'frozen' }, DEFAULT_CONFIG);
      assert.equal(values.length, all.length, adapter.id);
      for (const value of values) {
        assert.equal(value.provenance.classification, 'excluded', `${adapter.id}: ${value.raw}`);
        assert.match(value.provenance.reason, /keyword|generic/i);
        assert.equal(value.excludedKeywords?.[0]?.classification, 'excluded');
      }
    }
    const report = audit(root, { silent: true });
    assert.equal(report.coverage.excludedKeywords?.count, all.length * ADAPTERS.length);
    assert.match(formatCoverage(report.coverage).join('\n'), /recognised and excluded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('frozen Excalidraw patterns retain genuine literals and references beside exclusions', () => {
  const root = resolve('test/fixtures/phase-5b');
  const adapter = ADAPTERS.find((a) => a.id === 'scss')!;
  const values = adapter.extract({ root, label: 'phase-5b', fixtureSha: 'frozen' }, DEFAULT_CONFIG);
  assert.deepEqual(
    values.map((v) => v.provenance.classification),
    ['excluded', 'excluded', 'color', 'reference', 'reference', 'mixed', 'excluded', 'style-literal'],
  );
  assert.equal(values[4].excludedKeywords?.length, 2);
  assert.equal(values[5].excludedKeywords?.length, 1);
  assert.equal(values[5].provenance.line, 8);
  const report = audit(root, { silent: true });
  assert.equal(report.ratios['style-tokenization-color'], 0.5);
  assert.equal(report.coverage.excludedKeywords?.count, 8);
  assert.equal(
    report.findings
      .filter((f) => f.ruleId === 'token/raw-value-in-style')
      .reduce((n, f) => n + Number(f.data?.count), 0),
    3,
  );
  // Run the identical frozen declarations through the CSS reader too.
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-keyword-css-'));
  try {
    writeFileSync(
      join(dir, 'patterns.css'),
      readFileSync(join(root, 'patterns.scss'), 'utf8').replace(/^\/\/[^\n]*/, ''),
    );
    const css = ADAPTERS.find((a) => a.id === 'css-rule-bodies')!;
    assert.deepEqual(
      css
        .extract({ root: dir, label: 'css', fixtureSha: 'frozen' }, DEFAULT_CONFIG)
        .map((v) => v.provenance.classification),
      values.map((v) => v.provenance.classification),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('keyword scan does not erase strings, function arguments or fallback values', () => {
  for (const value of [
    '"serif"',
    'var(--none, transparent)',
    'url(transparent)',
    'transparent-color',
    '--transparent',
  ]) {
    assert.equal(keywordParts(value).excluded.length, 0, value);
  }
  assert.equal(classifyStyle('color', 'transparent red var(--x)', ['--x']), 'mixed');
  assert.equal(classifyStyle('spacing', 'auto 12px', []), 'dimension');
  assert.equal(classifyStyle('typography', 'system-ui, sans-serif', []), 'excluded');
  assert.equal(classifyStyle('typography', '"serif", sans-serif', [], 'font-family'), 'style-literal');
});

test('mixed keyword values retain literals across declarations and Tailwind utilities', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-keyword-mixed-'));
  try {
    writeFileSync(
      join(root, 'tokens.css'),
      ':root { --ds-color: transparent #123456; --ds-ref: transparent #123456 var(--x); }',
    );
    writeFileSync(
      join(root, 'tokens.scss'),
      '$ds-color: transparent #123456; $ds-ref: transparent #123456 var(--x);',
    );
    writeFileSync(
      join(root, 'tokens.json'),
      JSON.stringify({ color: { $type: 'color', $value: 'transparent #123456' } }),
    );
    writeFileSync(
      join(root, 'view.tsx'),
      'const classes = "bg-transparent bg-[transparent_#123456] bg-[transparent_#123456_var(--x)] bg-[transparent_var(--x)]";',
    );
    for (const adapter of ADAPTERS.filter((a) => a.id !== 'css-rule-bodies')) {
      const values = adapter.extract({ root, label: 'mixed', fixtureSha: 'frozen' }, DEFAULT_CONFIG);
      const literal = values.find((v) => v.raw === 'transparent #123456')!;
      assert.equal(literal.provenance.classification, 'color', adapter.id);
      assert.equal(literal.excludedKeywords?.[0].raw, 'transparent');
      const mixed = values.find((v) => v.raw === 'transparent #123456 var(--x)');
      if (adapter.id !== 'token-json') assert.equal(mixed?.provenance.classification, 'mixed', adapter.id);
    }
    const report = audit(root, { silent: true });
    assert.equal(report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup')?.data?.count, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
