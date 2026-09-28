import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cssCustomPropsAdapter } from '../src/adapters/css-custom-props.ts';
import { cssRuleBodiesAdapter } from '../src/adapters/css-rule-bodies.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';

for (const adapter of [cssRuleBodiesAdapter, cssCustomPropsAdapter]) {
  test(`${adapter.id}: channel references, active channels and unsupported expressions`, () => {
    const cases = [
      ['hsl(var(--ds-channels))', 'reference'],
      ['hsl(var(--ds-channels) / 0.5)', 'reference'],
      ['rgb(var(--ds-channels) / 50%)', 'reference'],
      ['rgb(var(--ds-channels))', 'reference'],
      ['hsl(var(--ds-a, 0 0% 0%))', 'reference'],
      ['hsl(var(--ds-a, var(--ds-b, 0 0% 0%)) / var(--ds-alpha))', 'reference'],
      ['hsl(var(--ds-hue) 50% 50%)', 'mixed'],
      ['rgb(12 var(--ds-green) 0)', 'mixed'],
      ['hsl(var(--ds-channels) / calc(1 - var(--ds-alpha)))', 'ambiguous'],
      ['hsl(var(--ds-channels) nonsense)', 'ambiguous'],
      ['hsl(var(--ds-channels)) trailing', 'ambiguous'],
    ];
    const dir = mkdtempSync(join(tmpdir(), 'ds-channel-'));
    try {
      writeFileSync(
        join(dir, 'a.css'),
        cases
          .map(
            ([value], i) =>
              `.sample-${i} { ${adapter === cssRuleBodiesAdapter ? 'color' : `--ds-color-${i}`}: ${value}; }`,
          )
          .join('\n'),
      );
      const values = adapter.extract({ root: dir, fixtureSha: 'test', label: 'test' }, DEFAULT_CONFIG);
      assert.equal(values.length, cases.length);
      for (const [i, value] of values.entries()) {
        assert.equal(value.provenance.classification, cases[i][1], cases[i][0]);
        assert.equal(value.raw, cases[i][0]);
        assert.ok(value.refs?.length);
        assert.equal(value.provenance.line, i + 1);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
