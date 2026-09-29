import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { tokenJsonAdapter } from '../src/adapters/token-json.ts';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { classifyTier } from '../src/rules/tier.ts';

function tree<T>(files: Record<string, string>, run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'ds-json-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(root, file, '..'), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const source = (root: string) => ({ root, label: 'test', fixtureSha: 'test-sha' });

test('both JSON dialects, inherited type, aliases, and exact value lines', () => {
  tree(
    {
      'arbitrary.json': `{
  "palette": { "$type": "color", "blue": {
    "$description": "A quoted \\"value\\" is not a token",
    "$value": "#123456"
  } },
  "color": { "background": { "value": "{palette.blue}", "type": "color" } },
  "space": { "small": { "value": "4px" } }
}`,
    },
    (root) => {
      const values = tokenJsonAdapter.extract(source(root), DEFAULT_CONFIG);
      assert.equal(values.length, 3);
      assert.equal(values[0].provenance.line, 4);
      assert.equal(values[0].provenance.property, 'color');
      assert.equal(values[0].provenance.selector, 'palette.blue');
      assert.equal(values[0].provenance.tokenName, 'palette.blue');
      assert.equal(values[1].provenance.classification, 'reference');
      assert.deepEqual(values[1].refs, ['palette.blue']);
      assert.equal(values[2].provenance.classification, 'dimension');
      assert.ok(
        values.every((v) => v.provenance.adapterVersion === '0.2.0' && v.provenance.surface === null),
      );
    },
  );
});

test('aliases resolve across files; missing, cyclic and composite values remain ambiguous', () => {
  tree(
    {
      'a.json': '{"base":{"$value":"#fff","$type":"color"}}',
      'b.json':
        '{"color":{"ok":{"value":"{base}"},"missing":{"value":"{absent}"},"cycle":{"value":"{color.cycle}"},"p3":{"$type":"color","$value":"color(display-p3 1 0 0)"},"object":{"$type":"color","$value":{"colorSpace":"srgb","components":[1,0,0]}}}}',
    },
    (root) => {
      const values = tokenJsonAdapter.extract(source(root), DEFAULT_CONFIG);
      assert.deepEqual(
        values.map((v) => v.provenance.classification),
        ['color', 'reference', 'ambiguous', 'ambiguous', 'ambiguous', 'ambiguous'],
      );
      const coverage = audit(root, { silent: true }).coverage;
      assert.equal(coverage.unconvertible.count, 2);
      assert.equal(coverage.complete, false);
    },
  );
});

test('shape detection, ignored output, metadata, malformed JSON and scoped extraction', () => {
  tree(
    {
      'package.json': '{"name":"example","version":"1"}',
      'bad.json': '{',
      'dist/tokens.json': '{"a":{"value":"#fff"}}',
      'values.json': '{"$themes":[{"value":"#000"}],"a":{"value":"#123"},"b":{"value":"#456"}}',
    },
    (root) => {
      const scoped = { ...source(root), only: [join(root, 'package.json')] };
      assert.equal(tokenJsonAdapter.detect(scoped), false);
      assert.equal(tokenJsonAdapter.extract(source(root), DEFAULT_CONFIG).length, 2);
      assert.equal(tokenJsonAdapter.extract(scoped, DEFAULT_CONFIG).length, 0);
    },
  );
});

test('coverage tracks actual token files and dotted naming uses configured tier patterns', () => {
  tree(
    {
      'tokens.json':
        '{"palette":{"blue":{"500":{"value":"#123456"}}},"color":{"action":{"blue":{"value":"#123456"}}}}',
      'unsupported.tokens.json': '{}',
    },
    (root) => {
      const report = audit(root, { silent: true });
      assert.deepEqual(report.coverage.unreadTokenFiles, ['unsupported.tokens.json']);
      assert.equal(classifyTier('palette.blue.500', DEFAULT_CONFIG), 'primitive');
      assert.equal(classifyTier('color.action.blue', DEFAULT_CONFIG), 'semantic');
      assert.ok(report.findings.some((f) => f.ruleId === 'token/semantic-name-describes-appearance'));
      const config = structuredClone(DEFAULT_CONFIG);
      config.taxonomy.componentPattern = '^widgets\\.';
      assert.equal(classifyTier('widgets.button.fill', config), 'component');
    },
  );
});

test('multiline values, escaped keys, duplicate keys, alias chains and namespaced components', () => {
  tree(
    {
      'data.json': `{
    "base": {"value":"#000"},
    "base": {"value":"#fff"},
    "alias": {"value":"{base}"},
    "last": {"value":"{alias}"},
    "escaped\\"key": {"$value":
      "lab(20% 0 0)", "$type":"color"}
  }`,
    },
    (root) => {
      const values = tokenJsonAdapter.extract(source(root), DEFAULT_CONFIG);
      assert.equal(values.length, 4);
      assert.equal(values[0].raw, '#fff');
      assert.equal(values[0].provenance.line, 3);
      assert.equal(values[2].provenance.classification, 'reference');
      assert.equal(values[3].provenance.line, 7);
      assert.equal(values[3].provenance.tokenName, 'escaped"key');
      assert.equal(values[3].provenance.classification, 'ambiguous');
      assert.equal(classifyTier('ds.button.background', DEFAULT_CONFIG), 'component');
    },
  );
});

test('ambiguous aliases and unsupported values appear in human coverage, mixed formats stay attributed', () => {
  tree(
    {
      'tokens.json': '{"color":{"missing":{"$value":"{absent}"}}}',
      'a.scss': '.a { padding: 4px; }',
      'a.css': ':root { --palette-gray-500: #123456; }',
    },
    (root) => {
      const report = audit(root, { silent: true, minSeverity: 'high' });
      assert.equal(report.coverage.unclassifiedDeclarations?.count, 1);
      assert.equal(report.coverage.undecided.count, 0);
      assert.equal(report.coverage.complete, false);
      assert.deepEqual(report.coverage.unreadFormats, {});
      assert.ok(report.coverage.partialReads.some((a) => a.adapter === 'token-json@0.2.0'));
      assert.ok(report.coverage.partialReads.some((a) => a.adapter === 'scss@0.2.0'));
    },
  );
});

test('public JSON fixture is frozen by file digests and reports composite limits', () => {
  const report = audit('fixtures/sanity-token-json', { silent: true });
  assert.equal(report.coverage.unconvertible.count, 101);
  assert.equal(report.coverage.unclassifiedDeclarations?.count, 8);
  assert.equal(report.coverage.undecided.count, 0);
  assert.equal(report.coverage.complete, false);
});

test('JSON references reach tier rules without CSS fallback findings', () => {
  tree(
    {
      'data.json':
        '{"palette":{"blue":{"500":{"value":"#123456"}}},"ds":{"button":{"fill":{"value":"{palette.blue.500}"}}}}',
    },
    (root) => {
      const report = audit(root, { silent: true });
      assert.ok(report.findings.some((f) => f.ruleId === 'token/tier-leakage'));
      assert.ok(!report.findings.some((f) => f.ruleId === 'token/var-missing-fallback'));
    },
  );
});
