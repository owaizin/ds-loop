import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';
import { classifyTier } from '../src/rules/tier.ts';

const config = { ...DEFAULT_CONFIG, taxonomy: { ...DEFAULT_CONFIG.taxonomy, upstreamPattern: '^--ds-' } };
function project(css: string, run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-upstream-'));
  try {
    writeFileSync(join(dir, 'a.css'), css);
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('upstream precedence permits imported literal color and dimension; defaults unchanged', () => {
  assert.equal(classifyTier('--ds-color-text', config), 'upstream');
  assert.equal(classifyTier('--ds-space-4', config), 'upstream');
  assert.equal(classifyTier('--ds-button-gap', config), 'upstream');
  assert.equal(classifyTier('--ds-color-text', DEFAULT_CONFIG), 'semantic');
  project(':root{--ds-color-text:#333;--ds-radius-card:8px}', (dir) => {
    assert.deepEqual(audit(dir, { config, silent: true }).findings, []);
  });
});

test('project alias borrows upstream with fallback; components consume alias without leakage', () => {
  project(
    ':root{--ds-color-text:#333;--color-text:var(--ds-color-text,#333);--app-button-fg:var(--color-text,#333)}',
    (dir) => {
      assert.deepEqual(audit(dir, { config, silent: true }).findings, []);
    },
  );
});

test('direct component and ordinary CSS use sites report upstream bypass exactly once each', () => {
  project(
    ':root{--ds-color-text:#333;--app-button-fg:var(--ds-color-text,#333)}\n.button{color:var(--ds-color-text,#333)}',
    (dir) => {
      const report = audit(dir, { config, silent: true });
      assert.equal(report.findings.length, 1);
      assert.equal(report.findings[0].ruleId, 'token/upstream-bypass');
      assert.equal(report.findings[0].data?.count, 2);
      assert.equal(
        audit(dir, { config, files: [join(dir, 'a.css')], silent: true }).findings[0].data?.count,
        2,
      );
    },
  );
});

test('upstream internals are not project tiers; fallback requirement still applies to project alias', () => {
  project(':root{--ds-color-text:var(--ds-button-fg);--color-text:var(--ds-color-text)}', (dir) => {
    const findings = audit(dir, { config, silent: true }).findings;
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'token/var-missing-fallback');
    assert.equal(findings[0].data?.count, 1);
  });
});

test('config loads upstream pattern, rejects invalid patterns, and changes measurement hash', () => {
  assert.notEqual(hashConfig(config), hashConfig(DEFAULT_CONFIG));
  assert.notEqual(hashConfig(DEFAULT_CONFIG), '6b7f4662');
  project('', (dir) => {
    const path = join(dir, 'ds-loop.config.json');
    writeFileSync(path, JSON.stringify({ taxonomy: { upstreamPattern: '^--ds-' } }));
    assert.equal(loadConfig(undefined, dir).config.taxonomy.upstreamPattern, '^--ds-');
    for (const pattern of ['', '[', 42, []]) {
      writeFileSync(path, JSON.stringify({ taxonomy: { upstreamPattern: pattern } }));
      assert.throws(() => loadConfig(undefined, dir), /upstreamPattern/);
    }
  });
});

test('project aliases outrank aliases internal to upstream in replacement suggestions', () => {
  project(
    ':root{--ds-color-base:#333;--ds-color-text:var(--ds-color-base);--color-text:var(--ds-color-text,#333)}\n.x{color:#333}',
    (dir) => {
      const value = audit(dir, { config, silent: true }).findings.find(
        (f) => f.ruleId === 'token/raw-value-in-style',
      )!.suggestion!.values[0];
      assert.deepEqual(
        value.candidates.filter((c) => c.preferred).map((c) => c.token),
        ['--color-text'],
      );
    },
  );
});

test('extracted value rows survive suppressions and severity filtering for specimen consumers', () => {
  project('.a{font-size:14px;padding:8px;color:#333}.b{font-size:14px;padding:var(--space,8px)}', (dir) => {
    const before = audit(dir, { silent: true });
    const after = audit(dir, {
      silent: true,
      minSeverity: 'blocking',
      config: { ...config, ignore: [{ rule: '*', reason: 'Test inventory independence' }] },
    });
    assert.deepEqual(after.styleInventory, before.styleInventory);
    assert.deepEqual(after.styleInventory.typography?.values, [
      { value: '14px', property: 'font-size', classification: 'dimension', occurrences: 2 },
    ]);
    assert.equal(after.styleInventory.spacing?.values.length, 2);
    assert.equal(
      after.styleInventory.spacing?.values.reduce((sum, v) => sum + v.occurrences, 0),
      2,
    );
  });
});

test('a JavaScript API caller missing the new field does not classify everything as upstream', () => {
  const legacy = structuredClone(DEFAULT_CONFIG);
  Reflect.deleteProperty(legacy.taxonomy, 'upstreamPattern');
  assert.equal(classifyTier('--color-text', legacy), 'semantic');
});
