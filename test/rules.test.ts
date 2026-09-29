import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clusterByDeltaE } from '../src/color/cluster.ts';
import { toLab } from '../src/color/convert.ts';
import { ciede2000 } from '../src/color/delta-e.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import type { RawValue } from '../src/core/provenance.ts';
import { literalDuplicateRule, nearDuplicatePaletteRule, semanticLiteralRule } from '../src/rules/color.ts';
import { rawDimensionRule } from '../src/rules/dimension.ts';
import type { RuleContext } from '../src/rules/types.ts';

function value(tokenName: string, raw: string): RawValue {
  return {
    raw,
    provenance: {
      file: 't.css',
      line: 1,
      selector: ':root',
      property: tokenName,
      tokenName,
      surface: null,
      category: null,
      classification: 'color',
      reason: 'test',
      fixtureSha: 'test',
      adapterId: 'test',
      adapterVersion: '0',
    },
  };
}

function ctx(colors: RawValue[]): RuleContext {
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
    values: colors,
    colors,
  };
}

test('semantic-holds-literal flags non-primitive names, ignores scale steps', () => {
  const colors = [
    value('--slate-500', '#64748b'), // primitive by trailing number
    value('--palette-raw-blue-9', '#0f172a'), // primitive by hint
    value('--color-text-primary', '#020817'), // semantic literal — offender
    value('--brand-default', '#0f172a'), // semantic literal — offender
  ];
  const findings = semanticLiteralRule.run(ctx(colors));
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 2);
});

test('a category token is not a palette primitive', () => {
  // --chart-1 looks like a numbered scale step and matches primitivePattern, so a
  // source with no palette tier reported ten primitives and got told to "point each
  // at a primitive". Identified in calibration row 007, still misreporting at row 008.
  const colors = [
    value('--chart-1', '#1da1f2'),
    value('--chart-2', '#0f172a'),
    value('--subject-3', '#24704b'),
    value('--slate-500', '#64748b'), // a real scale step, still primitive
  ];
  const findings = semanticLiteralRule.run(ctx(colors));
  assert.equal(findings.length, 1);
  // the three category tokens are offenders; the scale step is not
  assert.equal(findings[0]?.data?.count, 3);
  assert.equal(findings[0]?.data?.primitivesInSource, 1, 'only --slate-500 is a primitive');
});

test('literal-duplicate-tokens groups tokens that share a value', () => {
  const colors = [
    value('--palette-white', '#ffffff'),
    value('--brand-on', '#ffffff'),
    value('--accent-on', '#ffffff'),
    value('--palette-black', '#000000'),
  ];
  const findings = literalDuplicateRule.run(ctx(colors));
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.summary ?? '', /1 colour value\(s\) are declared by 3/);
});

test('rawDimensionRule: flags semantic/component tokens with raw lengths, not primitives', () => {
  const dim = (name: string, raw: string): RawValue => ({
    raw,
    provenance: {
      file: 't.css',
      line: 1,
      selector: ':root',
      property: name,
      tokenName: name,
      surface: null,
      category: null,
      classification: 'dimension',
      reason: 'test',
      fixtureSha: 't',
      adapterId: 't',
      adapterVersion: '0',
    },
  });
  const findings = rawDimensionRule.run(
    ctx([
      dim('--ds-space-4', '1rem'), // primitive — ok
      dim('--ds-card-padding', '24px'), // component — flag
      dim('--ds-space-gap-inline', '8px'), // semantic — flag
      dim('--ds-font-weight-bold', '700'), // weight scale — skipped by name filter
    ]),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 2);
});

test('rawDimensionRule: a widget-named token is not promoted by its last segment', () => {
  // --panel-radius reached the dimension rule as "semantic" because classifyTier
  // stripped --panel- and read "radius" as a namespace. Two HIGH findings on this
  // repo's own site/theme.css came from that, and 2 of 3 on a real client repo.
  const dim = (name: string, raw: string): RawValue => ({
    raw,
    provenance: {
      file: 't.css',
      line: 1,
      selector: ':root',
      property: name,
      tokenName: name,
      surface: null,
      category: null,
      classification: 'dimension',
      reason: 'test',
      fixtureSha: 't',
      adapterId: 't',
      adapterVersion: '0',
    },
  });
  const findings = rawDimensionRule.run(
    ctx([
      dim('--panel-radius', '18px'), // widget token, unknown tier — not judged
      dim('--header-size', '20px'), // same shape
      dim('--color-action-text', '12px'), // namespace opens the name — flag
    ]),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.data?.count, 1);
  assert.match(findings[0]?.where ?? '', /--color-action-text/);
});

// Found by dogfooding on a real system, not by this suite: two reported pairs
// compared a translucent overlay with the opaque colour beneath it. CIEDE2000 is
// defined over three dimensions and has no alpha term, so the pair measured ΔE
// 0.000 and read as an exact duplicate. Distance alone does not establish that two
// values are interchangeable, and one of these composites while the other does not.
test('near-duplicate palette does not pair a translucent overlay with an opaque colour', () => {
  // 0.8 against 1.0 is the pair that was actually reported. It is why the tolerance is
  // a rounding epsilon and not a band: the first value tried was 0.25, which still
  // reported it.
  const reported = [
    value('--palette-fg', 'rgba(20, 20, 20, 1)'),
    value('--palette-overlay', 'rgba(20, 20, 20, 0.8)'),
  ];
  assert.deepEqual(nearDuplicatePaletteRule.run(ctx(reported)), []);

  const overlay = [
    value('--palette-black-900', '#000000'),
    value('--palette-black-100', 'rgba(0, 0, 0, 0.1)'),
  ];
  assert.equal(ciede2000(toLab('#000000')!, toLab('rgba(0, 0, 0, 0.1)')!), 0, 'ΔE must still read 0 here');
  assert.deepEqual(nearDuplicatePaletteRule.run(ctx(overlay)), []);
});

test('near-duplicate palette still pairs two opaque colours nobody can tell apart', () => {
  const found = nearDuplicatePaletteRule.run(
    ctx([value('--palette-slate-500', '#64748b'), value('--palette-slate-550', '#64748c')]),
  );
  assert.equal(found.length, 1);
  assert.match(found[0]!.where, /--palette-slate-500 ≈ --palette-slate-550/);
});

test('alpha gates a cluster edge without changing the distance it gates', () => {
  const points = [
    { id: 'opaque', raw: '#1e40af' },
    { id: 'overlay', raw: 'rgba(30, 64, 175, 0.08)' },
  ];
  assert.equal(clusterByDeltaE(points, 2.3).length, 1, 'ungated, these merge — that was the defect');
  assert.equal(clusterByDeltaE(points, 2.3, DEFAULT_CONFIG.clustering.alphaTolerance).length, 2);
});
