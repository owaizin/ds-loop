import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { renderAuditHtml } from '../src/core/report-html.ts';
import { tokenArchitecture } from '../src/core/token-architecture.ts';

function value(name: string | null, raw: string, refs: string[] = []): RawValue {
  return {
    raw,
    refs,
    provenance: {
      file: 'tokens.css',
      line: 1,
      tokenName: name,
      property: name ?? 'color',
      surface: name ? null : 'style',
      category: name ? null : 'color',
      selector: ':root',
      fixtureSha: 'example',
      adapterId: 'example',
      adapterVersion: '1',
      classification: refs.length ? 'reference' : 'color',
      reason: 'example',
    },
  };
}
function project(files: Record<string, string>, run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-architecture-'));
  try {
    for (const [name, raw] of Object.entries(files)) writeFileSync(join(dir, name), raw);
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test('observed chains, cycles, unknown lanes and missing targets remain distinct', () => {
  const a = tokenArchitecture(
    [
      value('--palette-gray-500', '#333'),
      value('--color-text', 'var(--palette-gray-500)', ['--palette-gray-500']),
      value('--ds-button-text', 'var(--color-text)', ['--color-text']),
      value(null, 'var(--ds-button-text)', ['--ds-button-text']),
      value('--odd', 'var(--absent)', ['--absent']),
      value('--loop-a', 'var(--loop-b)', ['--loop-b']),
      value('--loop-b', 'var(--loop-a)', ['--loop-a']),
    ],
    { ...DEFAULT_CONFIG, architecture: { maxAliasDepth: 1 } },
    [],
  );
  assert.equal(a.tokens.find((t) => t.name === '--ds-button-text')?.aliasDepth, 2);
  assert.deepEqual(a.health.deepAliases, ['--ds-button-text']);
  assert.deepEqual(a.health.cycles, ['--loop-a', '--loop-b']);
  assert.equal(a.tokens.find((t) => t.name === '--loop-a')?.aliasDepth, null);
  assert.equal(a.tokens.find((t) => t.name === '--odd')?.tier, 'unknown');
  assert.deepEqual(a.health.undeclared, ['--absent']);
  assert.equal(
    a.edges.reduce((n, e) => n + e.count, 0),
    6,
  );
});
test('mode selectors and within-file order are observed without claiming cross-file winners', () => {
  project(
    {
      'a.css':
        ':root{--color-brand:#333}\n[data-preview-theme="dark"]{--color-brand:#eee}\n.dark{--color-brand:#ddd}',
      'b.css': ':root{--color-brand:#222}',
    },
    (dir) => {
      const r = audit(dir, { silent: true });
      const a = r.tokenArchitecture!;
      assert.deepEqual(a.health.redeclarations, ['--color-brand']);
      const d = a.tokens.find((t) => t.name === '--color-brand')!.declarations;
      assert.equal(d.length, 4);
      assert.equal(d[1].selector, '[data-preview-theme="dark"]');
      assert.deepEqual(
        d.map((x) => x.sourceOrder),
        [0, 1, 2, 0],
      );
      assert.deepEqual(
        d.map((x) => x.mode),
        [false, true, true, false],
      );
      assert.ok(a.limits.some((l) => l.includes('No computed winner')));
    },
  );
});
test('finding-backed edges link only matched recorded locations', () => {
  const a = tokenArchitecture(
    [
      value('--palette-gray-500', '#333'),
      value('--ds-button-text', 'var(--palette-gray-500)', ['--palette-gray-500']),
    ],
    DEFAULT_CONFIG,
    [
      {
        ruleId: 'token/tier-leakage',
        severity: 'high',
        summary: 'verbatim',
        where: 'tokens.css:1',
        fix: 'review',
        data: { leaks: [{ token: '--ds-button-text', target: '--palette-gray-500', where: 'tokens.css:1' }] },
      },
    ],
  );
  assert.deepEqual(a.edges[0].findings, [0]);
});
test('10k token chain is iterative and the HTML initially renders only aggregate groups', () => {
  const values = Array.from({ length: 10000 }, (_, i) =>
    value(`--odd-${i}`, i ? `var(--odd-${i - 1})` : '#333', i ? [`--odd-${i - 1}`] : []),
  );
  // Reverse order forces the DFS to traverse the entire chain in one walk.
  const a = tokenArchitecture(values.reverse(), DEFAULT_CONFIG, []);
  assert.equal(a.tokens[0].aliasDepth, 9999);
  assert.equal(a.tokens.length, 10000);
  const report = audit('fixtures/css-audit-example', { silent: true });
  report.tokenArchitecture = a;
  const html = renderAuditHtml(report, { timestamp: '2000-01-01T00:00:00.000Z' });
  assert.equal(html, renderAuditHtml(report, { timestamp: '2000-01-01T00:00:00.000Z' }));
  assert.ok(html.split('<script id="audit-data"')[0].length < 60000);
  assert.match(html, /Token architecture/);
  assert.match(html, /rows.slice\(offset, offset\+30\)/);
});
test('architecture data is escaped and optional depth config validates without changing legacy defaults', () => {
  project({ 'tokens.css': ':root{--odd:#333}' }, (dir) => {
    const report = audit(dir, { silent: true });
    report.tokenArchitecture!.tokens[0].declarations[0].value =
      '</script><img src="https://bad.example" onerror="alert(1)">';
    const html = renderAuditHtml(report);
    assert.ok(!html.includes('</script><img'));
    assert.ok(!html.includes('<img src='));
    const file = join(dir, 'config.json');
    writeFileSync(file, JSON.stringify({ architecture: { maxAliasDepth: 2 } }));
    const config = loadConfig(file).config;
    assert.equal(config.architecture?.maxAliasDepth, 2);
    assert.notEqual(hashConfig(config), hashConfig(DEFAULT_CONFIG));
    writeFileSync(file, JSON.stringify({ architecture: { maxAliasDepth: -1 } }));
    assert.throws(() => loadConfig(file), /maxAliasDepth/);
  });
});

test('alias depth remains unresolved for consumers entering a cycle; disconnected branches stay measurable', () => {
  const a = tokenArchitecture(
    [
      value('--a', 'var(--b)', ['--b']),
      value('--b', 'var(--a)', ['--a']),
      value('--c', 'var(--a)', ['--a']),
      value('--leaf', '#123'),
    ],
    DEFAULT_CONFIG,
    [],
  );
  assert.equal(a.tokens.find((t) => t.name === '--c')?.aliasDepth, null);
  assert.equal(a.tokens.find((t) => t.name === '--c')?.cycle, false);
  assert.equal(a.tokens.find((t) => t.name === '--leaf')?.aliasDepth, 0);
});
