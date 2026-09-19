import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { parseYamlLite } from '../src/config/yaml-lite.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { classifyTier, isPrimitiveName, tierLeakageRule, varMissingFallbackRule } from '../src/rules/tier.ts';
import type { RuleContext } from '../src/rules/types.ts';

test('classifyTier: semantic namespace beats widget word', () => {
  const c = DEFAULT_CONFIG;
  assert.equal(classifyTier('--ds-palette-raw-slate-900', c), 'primitive');
  assert.equal(classifyTier('--slate-500', c), 'primitive');
  assert.equal(classifyTier('--ds-color-bg-surface-default', c), 'semantic');
  assert.equal(classifyTier('--ds-color-bg-skeleton', c), 'semantic'); // widget word, semantic ns
  assert.equal(classifyTier('--ds-button-padding', c), 'component');
  assert.equal(classifyTier('--totally-random-thing', c), 'unknown');
});

test('classifyTier: a namespace word at the END of a name is not a namespace', () => {
  // --panel-radius names a panel. classifyTier used to strip the first segment
  // unconditionally, leaving "radius" — a semantic namespace — so every
  // --<widget>-<namespace> token was promoted to semantic and the dimension rule
  // reported it "high". Found dogfooding on this repo's own site/theme.css.
  const c = DEFAULT_CONFIG;
  assert.equal(classifyTier('--panel-radius', c), 'unknown');
  assert.equal(classifyTier('--header-size', c), 'unknown');
  assert.equal(classifyTier('--widget-space', c), 'unknown');
  // the namespace still counts when it opens the name, with or without a brand prefix
  assert.equal(classifyTier('--color-action-background', c), 'semantic');
  assert.equal(classifyTier('--ds-color-action-background', c), 'semantic');
  assert.equal(classifyTier('--radius', c), 'semantic');
});

test('classifyTier and the colour rules agree about a category token', () => {
  // isPrimitive lived in color.ts with the category-hint exclusion; classifyTier
  // had its own copy without it, so --chart-1 was a primitive to one and not the
  // other. One exported isPrimitiveName now answers for both.
  const c = DEFAULT_CONFIG;
  assert.equal(isPrimitiveName('--chart-1', c), false);
  assert.notEqual(classifyTier('--chart-1', c), 'primitive');
  assert.equal(isPrimitiveName('--slate-500', c), true);
  assert.equal(classifyTier('--slate-500', c), 'primitive');
});

function ref(tokenName: string, refs: string[]): RawValue {
  return {
    raw: refs.map((r) => `var(${r})`).join(' '),
    refs,
    provenance: {
      file: 't.css',
      line: 1,
      selector: ':root',
      property: tokenName,
      tokenName,
      classification: 'reference',
      reason: 'test',
      fixtureSha: 't',
      adapterId: 't',
      adapterVersion: '0',
    },
  };
}

function ctx(values: RawValue[]): RuleContext {
  return {
    meta: {
      label: 't',
      upstream: '',
      fixtureSha: 't',
      retrievedAt: '',
      path: '.',
      shippedPrimitiveCount: null,
    },
    source: { root: '.', fixtureSha: 't', label: 't' },
    config: DEFAULT_CONFIG,
    values,
    colors: [],
  };
}

test('tierLeakageRule: flags component→primitive skip, allows downward + aliasing', () => {
  const values = [
    ref('--ds-button-bg', ['--ds-color-bg-action-primary-default']), // component→semantic OK
    ref('--ds-color-bg-surface-default', ['--ds-palette-white']), // semantic→primitive OK
    ref('--ds-palette-white', ['--ds-palette-raw-white']), // primitive→primitive alias OK
    ref('--ds-button-padding', ['--ds-size-space-3']), // component→primitive SKIP
  ];
  const findings = tierLeakageRule.run(ctx(values));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 1);
  assert.equal(findings[0]?.data?.tierSkips, 1);
});

test('parseYamlLite: nested maps, scalars, comments, inline list', () => {
  const y = parseYamlLite(`
# a comment
system:
  name: "Example DS"
  component_count: null
  theming: true
severity:
  tier_leakage: critical  # trailing comment
npm:
  scoped_packages: []
`) as Record<string, Record<string, unknown>>;
  assert.equal(y.system!.name, 'Example DS');
  assert.equal(y.system!.component_count, null);
  assert.equal(y.system!.theming, true);
  assert.equal(y.severity!.tier_leakage, 'critical');
  assert.deepEqual(y.npm!.scoped_packages, []);
});

test('varMissingFallbackRule: flags var() without a comma-fallback', () => {
  const v = (name: string, raw: string): RawValue => ({
    raw,
    refs: [...raw.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!),
    provenance: {
      file: 't.css',
      line: 1,
      selector: ':root',
      property: name,
      tokenName: name,
      classification: 'reference',
      reason: 'test',
      fixtureSha: 't',
      adapterId: 't',
      adapterVersion: '0',
    },
  });
  const findings = varMissingFallbackRule.run(
    ctx([
      v('--a', 'var(--x)'), // flag
      v('--b', 'var(--x, #fff)'), // ok — has fallback
      v('--c', 'var(--x, var(--y))'), // ok — nested fallback
      v('--d', 'var(--p) var(--q)'), // flag x2
    ]),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 3);
});
