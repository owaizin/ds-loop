import { type ColorPoint, clusterByDeltaE } from '../color/cluster.ts';
import { toLab } from '../color/convert.ts';
import { ciede2000 } from '../color/delta-e.ts';
import { isPrimitiveName } from './tier.ts';
import type { Finding, Rule, RuleContext } from './types.ts';

// One definition of "is a palette primitive", shared with classifyTier — the two
// used to disagree about --chart-1 (category hints were applied here and nowhere
// else), so the colour rules and the tier rules judged the same token differently.
// The remaining asymmetry is deliberate: a colour rule treats unknown-tier tokens
// as offenders (a hex is never a config constant), a dimension rule does not.
const isPrimitive = isPrimitiveName;

function normRaw(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * A semantic token (not a primitive) holds a literal color instead of a
 * var() reference to a primitive. This breaks the layer model: renaming a
 * palette entry can no longer propagate, and the same colour now lives in
 * two places that will drift.
 */
export const semanticLiteralRule: Rule = {
  id: 'color/semantic-holds-literal',
  title: 'Semantic token holds a literal colour, not a var() reference',
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const offenders = ctx.colors.filter(
      (v) => v.provenance.tokenName !== null && !isPrimitive(v.provenance.tokenName, ctx.config),
    );
    if (offenders.length === 0) return [];

    // a count of declarations overstates the work when the same token is
    // redeclared across theme blocks or variant files. Measured: one repo
    // reported 649 declarations across 118 names and 35 files.
    const distinctNames = new Set(offenders.map((v) => v.provenance.tokenName)).size;
    const files = new Set(offenders.map((v) => v.provenance.file)).size;
    const primitives = ctx.colors.filter((v) => isPrimitive(v.provenance.tokenName, ctx.config)).length;
    return [
      {
        ruleId: this.id,
        severity: 'high',
        summary: `${offenders.length} semantic token declaration(s) hold a literal colour instead of referencing a primitive${distinctNames < offenders.length ? ` (${distinctNames} distinct token names across ${files} file(s))` : ''}`,
        where: offenders
          .slice(0, 8)
          .map((v) => `${v.provenance.tokenName} = ${v.raw} (${v.provenance.file}:${v.provenance.line})`)
          .join('; '),
        fix:
          primitives === 0
            ? 'There is no primitive tier in this source — every colour is declared where it is used, so there is nothing to reference yet. Add a palette layer first, then point these at it.'
            : 'Point each at a primitive: --token: var(--<ns>-palette-<name>). If no primitive matches, add one first.',
        data: {
          count: offenders.length,
          distinctNames,
          files,
          primitivesInSource: primitives,
          tokens: [...new Set(offenders.map((v) => v.provenance.tokenName))],
        },
      },
    ];
  },
};

/**
 * Two or more tokens carry byte-identical colour values. Usually a semantic
 * layer re-typing a palette value rather than aliasing it.
 */
export const literalDuplicateRule: Rule = {
  id: 'color/literal-duplicate-tokens',
  title: 'Multiple tokens declare the same literal colour value',
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const byValue = new Map<string, string[]>();
    for (const v of ctx.colors) {
      const k = normRaw(v.raw);
      const names = byValue.get(k) ?? [];
      names.push(v.provenance.tokenName ?? '(inline)');
      byValue.set(k, names);
    }
    const dupes = [...byValue.entries()].filter(([, names]) => new Set(names).size > 1);
    if (dupes.length === 0) return [];
    const total = dupes.reduce((s, [, names]) => s + names.length, 0);
    return [
      {
        ruleId: this.id,
        severity: 'medium',
        summary: `${dupes.length} colour value(s) are declared by ${total} different tokens`,
        where: dupes
          .slice(0, 6)
          .map(([val, names]) => `${val} <- ${[...new Set(names)].join(', ')}`)
          .join('; '),
        fix: 'Keep one canonical token per value; make the rest var() aliases of it.',
        data: { groups: dupes.map(([val, names]) => ({ value: val, tokens: [...new Set(names)] })) },
      },
    ];
  },
};

/**
 * Two palette primitives sit within a just-noticeable ΔE of each other.
 * Either an accidental near-duplicate or an over-fine ramp step no one can
 * tell apart in product.
 */
export const nearDuplicatePaletteRule: Rule = {
  id: 'color/near-duplicate-primitives',
  title: 'Palette primitives are perceptually indistinguishable',
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const prims = dedupe(
      ctx.colors
        .filter((v) => isPrimitive(v.provenance.tokenName, ctx.config))
        .map((v) => ({ id: v.provenance.tokenName ?? v.raw, raw: v.raw })),
    );
    const threshold = ctx.config.clustering.deltaE;
    const pairs: { a: string; b: string; deltaE: number }[] = [];
    const labs = prims.map((p) => toLab(p.raw));
    for (let i = 0; i < prims.length; i++) {
      for (let j = i + 1; j < prims.length; j++) {
        const li = labs[i];
        const lj = labs[j];
        if (!li || !lj) continue;
        const d = ciede2000(li, lj);
        if (d < threshold) pairs.push({ a: prims[i]!.id, b: prims[j]!.id, deltaE: round(d) });
      }
    }
    if (pairs.length === 0) return [];
    return [
      {
        ruleId: this.id,
        severity: 'low',
        summary: `${pairs.length} pair(s) of palette primitives are within ΔE ${threshold} — below a reliable just-noticeable difference`,
        where: pairs
          .slice(0, 8)
          .map((p) => `${p.a} ≈ ${p.b} (ΔE ${p.deltaE})`)
          .join('; '),
        fix: 'Confirm each pair is a deliberate ramp step. Collapse the ones that are not.',
        data: { pairs },
      },
    ];
  },
};

/**
 * Colour values in one source are stored in more than one form (hex + hsl
 * channels + rgb). A design system should commit to one convention so every
 * consumer writes the same wrapper.
 */
export const mixedColorFormRule: Rule = {
  id: 'color/mixed-storage-forms',
  title: 'Colour values use inconsistent storage forms',
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const forms = new Map<string, number>();
    // declarations only: this rule is about the STORAGE convention of the token
    // files. A hex in a component is a different defect (token/raw-value-in-markup).
    for (const v of ctx.colors.filter((c) => c.provenance.tokenName !== null)) {
      const f = classifyForm(v.raw);
      forms.set(f, (forms.get(f) ?? 0) + 1);
    }
    if (forms.size <= 1) return [];
    return [
      {
        ruleId: this.id,
        severity: 'medium',
        summary: `colour values are stored in ${forms.size} different forms`,
        where: [...forms.entries()].map(([f, n]) => `${f}: ${n}`).join(', '),
        fix: 'Pick one storage convention (hex, or HSL/OKLCH channels for free alpha) and migrate the rest. Document which wrapper each token type needs.',
        data: { forms: Object.fromEntries(forms) },
      },
    ];
  },
};

/**
 * The ΔE sweep, expressed as a rule: does this palette have an intent plateau
 * near the count the humans shipped? Its absence means either a generated
 * scale or a palette with no deliberate "these are the same" decisions.
 */
export const colorKneeRule: Rule = {
  id: 'color/no-intent-plateau',
  title: 'Palette has no ΔE plateau at the shipped primitive count',
  targets: ['color'],
  run(ctx: RuleContext): Finding[] {
    const shipped = ctx.meta.shippedPrimitiveCount;
    if (shipped == null) return [];
    // the plateau is a property of the declared palette; use-site literals are
    // not palette entries and would smear the curve.
    const points = dedupe(
      ctx.colors
        .filter((v) => v.provenance.tokenName !== null)
        .map((v) => ({ id: v.provenance.tokenName ?? v.raw, raw: v.raw })),
    );
    const { min, max, step } = ctx.config.sweep;
    let plateauFrom: number | null = null;
    let plateauTo: number | null = null;
    let prev: number | null = null;
    let runStart = min;
    for (let d = min; d <= max + 1e-9; d = round(d + step)) {
      const c = clusterByDeltaE(points, d).length;
      if (prev != null && c === prev) {
        if (Math.abs(c - shipped) <= shipped * 0.15 && d - runStart >= step * 2) {
          plateauFrom = runStart;
          plateauTo = d;
        }
      } else {
        runStart = d;
      }
      prev = c;
    }
    if (plateauFrom != null) return []; // healthy — plateau found, no finding
    return [
      {
        ruleId: this.id,
        severity: 'low',
        summary: `no ΔE band holds a cluster count within 15% of the ${shipped} shipped primitives`,
        where: `swept ΔE ${min}–${max}`,
        fix: 'If this is a hand-authored palette, the missing plateau means adjacent entries are closer than one JND — review whether the ramp is over-fine. If it is a generated scale, that is expected. Run `ds-loop sweep` for the full curve.',
        data: { shipped, plateauFrom, plateauTo },
      },
    ];
  },
};

function classifyForm(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s.startsWith('#')) return 'hex';
  if (/^-?\d*\.?\d+\s+-?\d*\.?\d+%\s+-?\d*\.?\d+%$/.test(s)) return 'hsl-channels';
  if (s.startsWith('rgb')) return 'rgb()';
  if (s.startsWith('hsl')) return 'hsl()';
  if (s.startsWith('oklch') || s.startsWith('lab') || s.startsWith('color(')) return 'modern';
  return 'other';
}

function dedupe(points: ColorPoint[]): ColorPoint[] {
  const seen = new Set<string>();
  const out: ColorPoint[] = [];
  for (const p of points) {
    const k = normRaw(p.raw);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
