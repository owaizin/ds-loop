import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adaptersFor } from '../src/adapters/registry.ts';
import { parseArbitrary, tailwindJsxAdapter } from '../src/adapters/tailwind-jsx.ts';
import type { SourceRef } from '../src/adapters/types.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { semanticLiteralRule } from '../src/rules/color.ts';
import { rawValueInMarkupRule } from '../src/rules/markup.ts';
import type { RuleContext } from '../src/rules/types.ts';

const CARD = `
export const Card = ({ active }: { active: boolean }) => (
  <div className="rounded-lg p-[13px] bg-[#1da1f2] text-[14px]">
    <span className={cn('mt-[7px]', active && 'hover:bg-[#1DA1F2]')} />
    <b className="bg-[var(--ds-color-bg-default)] shadow-[#000000] ring-[#0000000d]" />
    <i className="grid-cols-[repeat(2,minmax(0,1fr))] dark:md:text-[color:var(--ds-color-text-muted)]" />
  </div>
);
`;

function inSource<T>(files: Record<string, string>, fn: (source: SourceRef) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-tw-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(root, name), body);
    return fn({ root, fixtureSha: 'test', label: 'test' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const extract = (files: Record<string, string>): RawValue[] =>
  inSource(files, (source) => tailwindJsxAdapter.extract(source, DEFAULT_CONFIG));

function ctx(values: RawValue[]): RuleContext {
  return {
    meta: {
      label: 'test',
      upstream: '',
      fixtureSha: 'test',
      retrievedAt: '',
      path: '.',
      shippedPrimitiveCount: null,
    },
    source: { root: '.', fixtureSha: 'test', label: 'test' },
    config: DEFAULT_CONFIG,
    values,
    colors: values.filter((v) => v.provenance.classification === 'color'),
  };
}

test('parseArbitrary splits variants, utility and value', () => {
  assert.deepEqual(parseArbitrary('dark:hover:bg-[#fff]'), {
    variants: ['dark', 'hover'],
    util: 'bg',
    value: '#fff',
  });
  // underscores are spaces, an escaped underscore is itself, type hints are dropped
  assert.equal(parseArbitrary('shadow-[0_1px_2px_#000]')?.value, '0 1px 2px #000');
  assert.equal(parseArbitrary('content-[a\\_b]')?.value, 'a_b');
  assert.equal(parseArbitrary('text-[color:var(--x)]')?.value, 'var(--x)');
  // ordinary code is not a class
  assert.equal(parseArbitrary('items[i]'), null);
  assert.equal(parseArbitrary('Record-[string]'), null);
  assert.equal(parseArbitrary('p-4'), null);
});

test('tailwind-jsx extracts arbitrary values with provenance, classifies by shape', () => {
  const values = extract({ 'Card.tsx': CARD });
  const by = (raw: string) => values.find((v) => v.raw === raw);

  const colors = values.filter((v) => v.provenance.classification === 'color').map((v) => v.raw);
  assert.deepEqual(colors.sort(), ['#1DA1F2', '#1da1f2']);

  const dims = values.filter((v) => v.provenance.classification === 'dimension').map((v) => v.raw);
  assert.deepEqual(dims.sort(), ['13px', '14px', '7px']);

  // a use site is not a declaration
  assert.equal(by('#1da1f2')?.provenance.tokenName, null);
  assert.equal(by('#1da1f2')?.provenance.property, 'bg');
  assert.equal(by('#1da1f2')?.provenance.line, 3);
  assert.equal(by('#1da1f2')?.provenance.adapterId, 'tailwind-jsx');
  // the variant chain is the condition, i.e. the selector
  assert.equal(by('#1DA1F2')?.provenance.selector, 'hover');

  // var() through an arbitrary value is correct usage, kept as a reference
  const refs = values.filter((v) => v.provenance.classification === 'reference');
  assert.deepEqual(refs.flatMap((v) => v.refs ?? []).sort(), [
    '--ds-color-bg-default',
    '--ds-color-text-muted',
  ]);

  // a shadow utility is an elevation recipe part, not a palette entry
  assert.equal(by('#000000')?.provenance.classification, 'shadow-internal');
  // ring-[...] is not a shadow hint, but alpha 0.05 is under the ceiling: a
  // human decides whether it is an overlay tint or a real colour
  assert.equal(by('#0000000d')?.provenance.classification, 'ambiguous');

  // neither a colour nor a length — dropped
  assert.equal(by('repeat(2,minmax(0,1fr))'), undefined);
});

test('raw-value-in-markup flags use-site literals; the declaration rules ignore them', () => {
  const values = extract({ 'Card.tsx': CARD });

  const findings = rawValueInMarkupRule.run(ctx(values));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.severity, 'high');
  assert.equal(findings[0]?.data?.count, 5); // 2 colours + 3 lengths
  assert.equal(findings[0]?.data?.colors, 2);
  assert.equal(findings[0]?.data?.dimensions, 3);
  assert.match(String(findings[0]?.where), /bg-\[#1da1f2\] at Card\.tsx:3/);

  // a hardcoded colour in a component is not "a semantic token holding a literal"
  assert.deepEqual(semanticLiteralRule.run(ctx(values)), []);
});

test('raw-value-in-markup names the token that already carries the value', () => {
  const declaration: RawValue = {
    raw: '#1DA1F2',
    provenance: {
      file: 'tokens.css',
      line: 2,
      selector: ':root',
      property: '--ds-palette-blue-500',
      tokenName: '--ds-palette-blue-500',
      classification: 'color',
      reason: 'test',
      fixtureSha: 'test',
      adapterId: 'css-custom-props',
      adapterVersion: '0',
    },
  };
  const values = [declaration, ...extract({ 'Card.tsx': CARD })];
  const finding = rawValueInMarkupRule.run(ctx(values))[0];

  // two use sites spell the same colour in different case — one swap, reported once
  assert.deepEqual(finding?.data?.alreadyDeclared, [{ value: '#1da1f2', token: '--ds-palette-blue-500' }]);
  assert.match(String(finding?.fix), /#1da1f2 is already --ds-palette-blue-500/);
});

test('detect is false without arbitrary values, and both adapters run on a mixed tree', () => {
  const clean = extract({ 'Clean.tsx': 'export const C = () => <div className="bg-surface p-4" />;\n' });
  assert.deepEqual(clean, []);
  assert.equal(
    inSource({ 'Clean.tsx': 'const s = "bg-surface p-4";\n' }, (source) => tailwindJsxAdapter.detect(source)),
    false,
  );

  const ids = inSource(
    { 'tokens.css': ':root { --ds-color-bg-default: #ffffff; }\n', 'Card.tsx': CARD },
    (source) => adaptersFor(source).map((a) => a.id),
  );
  assert.deepEqual(ids, ['css-custom-props', 'tailwind-jsx']);
});
