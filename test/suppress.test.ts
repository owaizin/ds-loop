import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { applyIgnores } from '../src/core/suppress.ts';
import { RULES } from '../src/rules/registry.ts';

function value(tokenName: string | null, raw: string, file = 'theme.css'): RawValue {
  return {
    raw,
    provenance: {
      file,
      line: 1,
      selector: ':root',
      property: tokenName ?? 'bg',
      tokenName,
      classification: 'color',
      reason: 'test',
      fixtureSha: 'test',
      adapterId: 'test',
      adapterVersion: '0',
    },
  };
}

const reason = 'Agent review: the palette layer lands next sprint and this token seeds it.';

test('an exception removes one value from one rule, and reports that it did', () => {
  const values = [value('--color-surface-raised', '#ffffff'), value('--color-action-bg', '#245bdb')];
  const ignores = [{ rule: 'color/semantic-holds-literal', value: '--color-surface-raised', reason }];

  const hit = applyIgnores('color/semantic-holds-literal', values, ignores);
  assert.equal(hit.values.length, 1);
  assert.equal(hit.suppressions.length, 1);
  assert.equal(hit.suppressions[0]?.matched, 1);
  assert.equal(hit.suppressions[0]?.entry.reason, reason);

  // scoped to the rule it names — another rule still sees every value
  const other = applyIgnores('token/tier-leakage', values, ignores);
  assert.equal(other.values.length, 2);
  assert.deepEqual(other.suppressions, []);
});

test('an exception matches on a literal value, and is scoped by file', () => {
  const values = [value(null, '#ffffff', 'Card.tsx'), value(null, '#ffffff', 'Legacy.tsx')];
  const scoped = applyIgnores('token/raw-value-in-markup', values, [
    { rule: 'token/raw-value-in-markup', value: '#FFFFFF', files: ['Legacy.tsx'], reason },
  ]);
  assert.equal(scoped.values.length, 1);
  assert.equal(scoped.values[0]?.provenance.file, 'Card.tsx');

  // `*` on a file scope is the whole-file exception
  const whole = applyIgnores('token/raw-value-in-markup', values, [
    { rule: 'token/raw-value-in-markup', value: '*', files: ['Legacy.tsx'], reason },
  ]);
  assert.equal(whole.values.length, 1);
});

test('an empty file selection suppresses nothing, while omitted files explicitly match all', () => {
  const values = [value('--color-action-bg', '#245bdb', 'current/theme.css')];
  const entry = { rule: 'color/semantic-holds-literal', reason };
  assert.deepEqual(applyIgnores(entry.rule, values, [{ ...entry, files: [] }]), {
    values,
    suppressions: [],
  });
  assert.equal(applyIgnores(entry.rule, values, [entry]).values.length, 0);
});

test('malformed exception selectors fail loading rather than broadening or silently missing their scope', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-ignore-scope-'));
  const path = join(dir, 'ds-loop.config.json');
  try {
    for (const files of ['legacy/*', null, [7], [''], ['**/theme.css']]) {
      writeFileSync(path, JSON.stringify({ ignore: [{ rule: '*', files, reason }] }));
      assert.throws(() => loadConfig(undefined, dir), /config: ignore\[0\].*files/);
    }
    for (const value of [7, null, {}, '']) {
      writeFileSync(path, JSON.stringify({ ignore: [{ rule: '*', value, reason }] }));
      assert.throws(() => loadConfig(path), /config: ignore\[0\].*value/);
    }
    writeFileSync(path, JSON.stringify({ ignore: [null] }));
    assert.throws(() => loadConfig(path), /config: ignore\[0\].*object/);
    writeFileSync(path, JSON.stringify({ ignore: [{ rule: '*', files: [], reason }] }));
    assert.deepEqual(loadConfig(path).config.ignore[0]?.files, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an exception without a reason fails the config load', () => {
  // The point of the feature: a false positive gets an argument, not a widened
  // threshold. A dropped entry would look like the exception was honoured, so
  // the load fails instead.
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-ignore-'));
  try {
    writeFileSync(
      join(dir, 'ds-loop.config.json'),
      JSON.stringify({ ignore: [{ rule: 'color/semantic-holds-literal', value: '--x' }] }),
    );
    assert.throws(() => loadConfig(undefined, dir), /needs a `reason`/);

    writeFileSync(join(dir, 'ds-loop.config.json'), JSON.stringify({ ignore: [{ value: '--x', reason }] }));
    assert.throws(() => loadConfig(undefined, dir), /needs a `rule`/);

    writeFileSync(
      join(dir, 'ds-loop.config.json'),
      JSON.stringify({ ignore: [{ rule: '*', value: '--x', reason }] }),
    );
    assert.equal(loadConfig(undefined, dir).config.ignore.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every registered rule states what breaks if it is ignored', () => {
  // "I don't know the risk and impact" was the first thing a real user said to a
  // nine-finding audit. A rule that ships without an answer re-opens that.
  for (const rule of RULES) {
    assert.ok(rule.impact && rule.impact.trim().length > 20, `${rule.id} has no impact line`);
    assert.ok(!/^[a-z]/.test(rule.impact), `${rule.id}: impact should read as a sentence`);
  }
});

test('a clean verdict still shows what was argued away to reach it', () => {
  // The same rule the whole tool runs on: silence may never be ambiguous. A run
  // that suppressed its way to clean has to say so in the report.
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-sup-'));
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'theme.css'), ':root{--color-surface-raised:#ffffff}\n');
    const report = audit(root, {
      silent: true,
      config: {
        ...DEFAULT_CONFIG,
        ignore: [{ rule: 'color/semantic-holds-literal', value: '--color-surface-raised', reason }],
      },
    });
    assert.equal(report.findings.length, 0);
    assert.equal(report.verdict, 'clean');
    assert.equal(report.suppressions.length, 1);
    assert.equal(report.suppressions[0]?.matched, 1);
    assert.equal(report.suppressions[0]?.reason, reason);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
