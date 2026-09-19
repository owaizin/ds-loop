import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { adaptersFor } from '../src/adapters/registry.ts';
import { parseArbitrary, parseNamed, tailwindJsxAdapter } from '../src/adapters/tailwind-jsx.ts';
import type { SourceRef } from '../src/adapters/types.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { semanticLiteralRule } from '../src/rules/color.ts';
import { rawValueInMarkupRule, stockPaletteUtilityRule } from '../src/rules/markup.ts';
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

test('geometry utilities are not drift; scale utilities are', () => {
  // found by auditing a real design system: w-[300px] and top-[-4px] are one-off
  // layout numbers, which is what an arbitrary value is for. p-[13px] bypasses
  // the spacing scale. Counting the first kind buries the second.
  const values = extract({
    'Geo.tsx': `
      <div className="w-[300px] max-h-[600px] top-[-4px] translate-y-[2px]" />
      <div className="p-[13px] gap-[7px] text-[14px] rounded-[3px]" />
      <div className="w-[#ff0000]" />
    `,
  });
  const dims = values
    .filter((v) => v.provenance.classification === 'dimension')
    .map((v) => v.provenance.property);
  assert.deepEqual(dims.sort(), ['gap', 'p', 'rounded', 'text']);
  // a hardcoded colour is drift on any utility, geometry included
  assert.equal(values.find((v) => v.raw === '#ff0000')?.provenance.classification, 'color');
});

test('build output is never audited', () => {
  const values = extract({
    'Card.tsx': 'export const C = () => <div className="p-[13px]" />;\n',
  });
  assert.equal(values.length, 1, 'the source file should be read');
  // dist/ is derived: a finding there duplicates one in src and points at a line
  // nobody edits
  const withDist = inSource(
    { 'Card.tsx': 'export const C = () => <div className="p-[13px]" />;\n' },
    (source) => {
      mkdirSync(join(source.root, 'dist'), { recursive: true });
      writeFileSync(join(source.root, 'dist', 'bundle.js'), 'x("p-[99px] m-[99px]")\n');
      return tailwindJsxAdapter.extract(source, DEFAULT_CONFIG);
    },
  );
  assert.deepEqual(
    withDist.map((v) => v.raw),
    ['13px'],
  );
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

const T = DEFAULT_CONFIG.taxonomy;

test('parseNamed picks colour utilities off the framework palette, nothing else', () => {
  assert.deepEqual(parseNamed('bg-white', T), { variants: [], util: 'bg', value: 'white' });
  assert.deepEqual(parseNamed('dark:bg-slate-900/50', T), {
    variants: ['dark'],
    util: 'bg',
    value: 'slate-900',
  });
  // a utility reading THIS system's token is the thing we want people writing
  assert.equal(parseNamed('bg-surface', T), null);
  assert.equal(parseNamed('text-muted-foreground', T), null);
  // scale steps and geometry are not colours
  assert.equal(parseNamed('text-sm', T), null);
  assert.equal(parseNamed('p-4', T), null);
  assert.equal(parseNamed('border-2', T), null);
  // a shadow colour is an elevation recipe, the carve-out CSS already makes
  assert.equal(parseNamed('shadow-black', T), null);
  // arbitrary values belong to parseArbitrary
  assert.equal(parseNamed('bg-[#fff]', T), null);
});

test('stock-palette-utility fires only when a theme colour layer exists', () => {
  // The bug this rule exists for: a file ds-loop had just called clean rendered
  // light-on-light in dark mode, because bg-white / text-slate-900 are outside
  // the theme and every rule at the time only looked for literals.
  const files = {
    'Card.tsx': '<div className="bg-white dark:bg-slate-900 p-4"><h2 className="text-slate-900">x</h2></div>',
  };
  const markup = extract(files);
  assert.equal(markup.filter((v) => v.provenance.classification === 'palette-utility').length, 3);

  // no token layer read — nothing is being bypassed, so the rule stays silent
  assert.deepEqual(stockPaletteUtilityRule.run(ctx(markup)), []);

  const themeToken: RawValue = {
    raw: '#ffffff',
    provenance: {
      file: 'theme.css',
      line: 2,
      selector: ':root',
      property: '--color-background',
      tokenName: '--color-background',
      classification: 'color',
      reason: 'test',
      fixtureSha: 'test',
      adapterId: 'css-custom-props',
      adapterVersion: '0',
    },
  };
  const findings = stockPaletteUtilityRule.run(ctx([...markup, themeToken]));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 3);
  assert.equal(findings[0]?.data?.underDarkVariant, 1);
  assert.match(findings[0]?.where ?? '', /bg-white/);
});

test('a named palette utility is not reported as a raw value in markup', () => {
  // the two rules key on different classifications on purpose: bg-white is a
  // valid class naming the wrong palette, not a literal pasted into a bracket.
  const values = extract({ 'Card.tsx': '<div className="bg-white bg-[#1da1f2]" />' });
  const findings = rawValueInMarkupRule.run(ctx(values));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 1);
  assert.match(findings[0]?.where ?? '', /bg-\[#1da1f2\]/);
});
