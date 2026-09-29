import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scssAdapter } from '../src/adapters/scss.ts';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

function extract(text: string, ext = 'scss') {
  const root = mkdtempSync(join(tmpdir(), 'ds-scss-'));
  try {
    writeFileSync(join(root, `theme.${ext}`), text);
    const source = { root, label: 'test', fixtureSha: 'test-sha' };
    return { values: scssAdapter.extract(source, DEFAULT_CONFIG), report: audit(root, { silent: true }) };
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

test('SCSS variables, nested conditional selectors, CSS tokens, imports and map references', () => {
  const { values, report } = extract(`@use "sass:map";
@forward "theme";
$palette-blue-500: #123456 !default;
.card {
  --color-bg: #abcdef;
  color: $palette-blue-500;
  @media (width > 10px) {
    &:hover { padding: map.get($spaces, "small"); }
  }
}`);
  const variable = values.find((v) => v.provenance.tokenName === '$palette-blue-500')!;
  assert.equal(variable.provenance.classification, 'color');
  assert.equal(variable.provenance.line, 3);
  assert.equal(variable.raw, '#123456');
  assert.equal(values.filter((v) => /^@/.test(v.provenance.property)).length, 2);
  const padding = values.find((v) => v.provenance.property === 'padding')!;
  assert.equal(padding.provenance.tokenName, null);
  assert.equal(padding.provenance.classification, 'reference');
  assert.deepEqual(padding.refs, ['$spaces']);
  assert.equal(padding.provenance.selector, '.card > @media (width > 10px) > &:hover');
  assert.equal(padding.provenance.line, 8);
  assert.ok(values.some((v) => v.provenance.tokenName === '--color-bg'));
  assert.equal(report.coverage.unreadFormats['.scss'], undefined);
});

test('comments, strings, maps and interpolation cannot invent literal hits', () => {
  const { values } = extract(`// $fake: #fff;
/* .bad { color: #fff; } */
$map: (red: #f00, blue: #00f);
$x: "color: #fff;";
.a {
 content: "color: #fff;";
 background: url("https://example.test/a;b");
 padding: $space * 2;
 color: theme.$ink;
 margin: 4px $space;
 .icon-#{$name} { color: #{$color}; }
 color: lab(20% 0 0);
}`);
  assert.ok(!values.some((v) => v.provenance.tokenName === '$fake'));
  assert.equal(values.find((v) => v.provenance.tokenName === '$map')!.provenance.classification, 'ambiguous');
  assert.equal(values.find((v) => v.raw === '$space * 2')!.provenance.classification, 'ambiguous');
  assert.equal(values.find((v) => v.raw === 'theme.$ink')!.provenance.classification, 'reference');
  assert.equal(values.find((v) => v.raw === '4px $space')!.provenance.classification, 'mixed');
  assert.equal(values.find((v) => v.raw === '#{$color}')!.provenance.classification, 'ambiguous');
  assert.equal(values.find((v) => v.raw.startsWith('lab('))!.provenance.classification, 'ambiguous');
});

test('indented Sass preserves nesting and original line numbers', () => {
  const { values } = extract(
    `$space: 4px
.card
  padding: $space
  &:hover
    color: #123456
.other
  margin: 8px
`,
    'sass',
  );
  assert.equal(values.length, 4);
  assert.equal(values[2].provenance.selector, '.card > &:hover');
  assert.equal(values[2].provenance.line, 5);
  assert.equal(values[3].provenance.selector, '.other');
});

test('assignment flags do not hide palette colours from downstream conversion', () => {
  const { report } = extract('$palette-a-100: #123456 !default;\n$palette-b-100: #123457 !global;');
  assert.ok(report.findings.some((f) => f.ruleId === 'color/near-duplicate-primitives'));
});

test('Sass element pseudo-selectors are contexts, not declarations', () => {
  const { values } = extract('a:hover\n  color: #123456\n', 'sass');
  assert.equal(values[0].provenance.selector, 'a:hover');
});

test('font-face descriptors are not component style use sites', () => {
  const { values } = extract('@font-face { font-weight: 400; }\n.a { font-weight: 600; }');
  assert.equal(values.filter((v) => v.provenance.surface === 'style').length, 1);
  assert.equal(values[0].raw, '600');
});

test('public SCSS fixture keeps modules and maps visible without font-face findings', () => {
  const report = audit('fixtures/fontsource-scss', { silent: true });
  assert.deepEqual(report.coverage.unreadFormats, {});
  assert.ok(report.coverage.unclassifiedDeclarations?.count);
  assert.ok(report.coverage.unclassifiedStyles?.count);
  assert.ok(!report.findings.some((f) => f.ruleId === 'token/raw-value-in-style'));
});

test('SCSS respects a single-file hook scope', () => {
  const root = mkdtempSync(join(tmpdir(), 'ds-scss-scope-'));
  try {
    const first = join(root, 'a.scss');
    writeFileSync(first, '$palette-a-100: #123456;');
    writeFileSync(join(root, 'b.sass'), '$palette-b-100: #abcdef');
    const source = { root, label: 'scope', fixtureSha: 'test', only: [first] };
    const values = scssAdapter.extract(source, DEFAULT_CONFIG);
    assert.equal(values.length, 1);
    assert.equal(values[0].provenance.file, 'a.scss');
    assert.equal(scssAdapter.detect({ ...source, only: [] }), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mixed CSS and Sass reference provenance retains source order', () => {
  const { values } = extract('.a { margin: var(--space) $gap map.get($sizes, "small"); }');
  assert.deepEqual(values[0].refs, ['--space', '$gap', '$sizes']);
});
