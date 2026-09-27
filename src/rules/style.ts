import { type RawValue, VALUE_CATEGORIES, type ValueCategory } from '../core/provenance.ts';
import { isStyleLiteral } from '../core/style-inventory.ts';
import type { Rule, RuleTarget } from './types.ts';

/**
 * Records literal presence at ordinary CSS use sites. Fluent's instructions
 * illustrate a project choosing token usage as policy:
 * https://github.com/microsoft/fluentui/blob/master/AGENTS.md
 * That policy is not universal. Detection cannot establish prohibition, a
 * replacement token's role, or the result of the cascade.
 */
export const rawValueInStyleRule: Rule = {
  id: 'token/raw-value-in-style',
  title: 'Ordinary CSS contains literal values',
  impact:
    'Literal parts do not follow token changes; whether that matters depends on this property and the project contract.',
  targets: ['tokens', 'color', 'spacing', 'typography', 'elevation', 'motion'],
  run(ctx) {
    return VALUE_CATEGORIES.flatMap((category) => {
      if (
        ctx.target &&
        ctx.target !== 'all' &&
        ctx.target !== 'tokens' &&
        !CATEGORY_TARGETS[category].includes(ctx.target)
      )
        return [];
      const vs = ctx.values.filter(
        (v) =>
          v.provenance.surface === 'style' &&
          v.provenance.category === category &&
          v.provenance.tokenName === null,
      );
      const literals = vs.filter(isStyleLiteral);
      const unknown = vs.filter((v) => v.provenance.classification === 'ambiguous');
      const findings = [];
      if (literals.length)
        findings.push({
          ruleId: this.id,
          severity: ctx.config.style.severity[category],
          summary: `${literals.length} ${category} property value(s) contain literals in ordinary CSS (${new Set(literals.map((v) => v.raw)).size} distinct); project permission not judged`,
          where: locations(literals),
          fix: 'Review these values against the project token contract. Where a shared role applies, choose its token and verify affected states. Retain intentional literals with a recorded reason; this finding does not establish a policy violation.',
          data: { category, count: literals.length, hits: literals.map(hit) },
        });
      if (unknown.length)
        findings.push({
          ruleId: this.id,
          severity: 'low' as const,
          summary: `${unknown.length} ${category} property value(s) could not be fully classified`,
          where: locations(unknown),
          fix: 'Inspect these expressions in context. They are excluded from the tokenization denominator, not counted as tokenized or literal-free.',
          data: { category, count: unknown.length, notJudged: true, hits: unknown.map(hit) },
        });
      return findings;
    });
  },
};

// JSON retains every occurrence and every provenance field; only human locations
// are abbreviated. Inventory counts never use this display prefix.
function hit(v: RawValue) {
  return { value: v.raw, refs: v.refs ?? [], ...v.provenance };
}
function locations(vs: RawValue[]): string {
  return (
    vs
      .slice(0, 8)
      .map((v) => `${v.provenance.property}: ${v.raw} at ${v.provenance.file}:${v.provenance.line}`)
      .join('; ') + (vs.length > 8 ? `; +${vs.length - 8} more (all hits in --json)` : '')
  );
}

const CATEGORY_TARGETS: Record<ValueCategory, RuleTarget[]> = {
  color: ['color'],
  spacing: ['spacing'],
  typography: ['typography'],
  radius: ['spacing'],
  shadow: ['elevation'],
  'z-index': ['elevation'],
  duration: ['motion'],
};
