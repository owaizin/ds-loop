import type { DsOpsConfig } from '../config/schema.ts';
import type { Finding, Rule, RuleContext } from './types.ts';

export type Tier = 'primitive' | 'semantic' | 'component' | 'unknown';

/**
 * The three-tier model (primitive → semantic → component). Reference direction
 * is strictly downward: component tokens reference semantic tokens, semantic
 * tokens reference primitives. Anything else is tier leakage.
 *
 * Tier detection is by name convention and therefore a judgment call about the
 * target — every pattern is config (`taxonomy.*Pattern`, `semanticNamespaces`).
 */
export function isPrimitiveName(tokenName: string | null, cfg: DsOpsConfig): boolean {
  if (tokenName == null) return false;
  const name = tokenName.toLowerCase();
  // a category token (--chart-1, --subject-3) is named for its colour by design:
  // the colour IS the identity. It matches the trailing-number branch of
  // primitivePattern but is not a palette step.
  if (cfg.taxonomy.categoryTokenHints.some((h) => new RegExp(`(^|-)${h}(-|\\d|$)`).test(name))) {
    return false;
  }
  return new RegExp(cfg.taxonomy.primitivePattern, 'i').test(name);
}

export function classifyTier(tokenName: string | null, cfg: DsOpsConfig): Tier {
  if (!tokenName) return 'unknown';
  const name = tokenName.toLowerCase();
  const t = cfg.taxonomy;
  // order matters: a token in a semantic namespace (--ns-color-bg-skeleton) is
  // semantic even though "skeleton" is a widget word. Component tokens name the
  // widget right after the --ns- prefix (--ns-button-padding).
  if (isPrimitiveName(name, cfg)) return 'primitive';
  // A semantic namespace has to OPEN the name, either at the first segment
  // (--color-action-bg, Tailwind v4's own shape) or right after a brand prefix
  // (--ds-color-bg). It may not arrive at the end: --panel-radius names a panel,
  // not the radius namespace, and stripping the first segment unconditionally
  // turned every --<widget>-<namespace> token into a semantic one. Measured on a
  // real repo: 2 of 3 "high" tier findings were component tokens promoted this way.
  const bare = name.replace(/^--/, '');
  const afterPrefix = bare.includes('-') ? bare.slice(bare.indexOf('-') + 1) : '';
  const opensWith = (s: string, ns: string) => s.startsWith(`${ns}-`);
  if (t.semanticNamespaces.some((ns) => opensWith(bare, ns) || bare === ns || opensWith(afterPrefix, ns))) {
    return 'semantic';
  }
  if (new RegExp(t.componentPattern, 'i').test(name)) return 'component';
  return 'unknown';
}

const RANK: Record<Tier, number> = { primitive: 0, semantic: 1, component: 2, unknown: -1 };

/** allowed: strictly one tier down, or same-tier aliasing */
function isAllowedReference(from: Tier, to: Tier): boolean {
  if (from === 'unknown' || to === 'unknown') return true; // can't judge
  if (from === to) return true; // aliasing within a tier is fine
  return RANK[from] - RANK[to] === 1; // exactly one step down
}

/**
 * A token references the wrong tier: skips a tier (component → primitive),
 * or points upward (semantic → component). Breaks theme propagation and
 * rebrand — the value is right but the contract is broken.
 */
export const tierLeakageRule: Rule = {
  id: 'token/tier-leakage',
  title: 'Token references across tiers in the wrong direction',
  impact:
    'Theme propagation is already broken: the value is right today and a theme swap or rebrand will not reach it.',
  targets: ['tokens', 'color', 'spacing', 'typography', 'elevation', 'motion'],
  run(ctx: RuleContext): Finding[] {
    const refs = ctx.values.filter((v) => v.provenance.classification === 'reference' && v.refs);
    const leaks: { token: string; tier: Tier; target: string; targetTier: Tier; where: string }[] = [];
    for (const v of refs) {
      const from = classifyTier(v.provenance.tokenName, ctx.config);
      for (const target of v.refs ?? []) {
        const to = classifyTier(target, ctx.config);
        if (!isAllowedReference(from, to)) {
          leaks.push({
            token: v.provenance.tokenName ?? '(inline)',
            tier: from,
            target,
            targetTier: to,
            where: `${v.provenance.file}:${v.provenance.line}`,
          });
        }
      }
    }
    if (leaks.length === 0) return [];
    const skips = leaks.filter((l) => l.tier === 'component' && l.targetTier === 'primitive');
    return [
      {
        ruleId: this.id,
        severity: 'high',
        summary: `${leaks.length} cross-tier reference(s) break the downward-only rule${skips.length ? ` (${skips.length} component → primitive tier skips)` : ''}`,
        where: leaks
          .slice(0, 8)
          .map((l) => `${l.token} [${l.tier}] → ${l.target} [${l.targetTier}] (${l.where})`)
          .join('; '),
        fix: 'Route through the tier below: a component token references a semantic token, a semantic token references a primitive. Add the missing semantic token if none fits.',
        data: { count: leaks.length, tierSkips: skips.length, leaks: leaks.slice(0, 40) },
      },
    ];
  },
};

/**
 * The tier rules judge by naming convention. When almost no token matches any
 * convention, `token/tier-leakage` has nothing to compare and returns nothing —
 * which a reader takes as a pass. This says so out loud instead.
 *
 * Measured on real repos: one classified 0 of 17 referencing tokens, another
 * 2 of 71. Both looked like clean tier checks and neither had been checked.
 */
export const tierModelUndetectableRule: Rule = {
  id: 'token/tier-model-undetectable',
  title: 'Tier model cannot be detected from token names, so the tier check did not run',
  impact:
    'A clean `token/tier-leakage` result in this source means nothing was checked, not that nothing is wrong — the strongest silent-pass this tool can produce.',
  targets: ['tokens'],
  run(ctx: RuleContext): Finding[] {
    const refs = ctx.values.filter((v) => v.provenance.classification === 'reference');
    if (refs.length === 0) return [];

    const classified = refs.filter((v) => classifyTier(v.provenance.tokenName, ctx.config) !== 'unknown');
    const coverage = classified.length / refs.length;
    const floor = ctx.config.taxonomy.tierCoverageFloor;
    if (coverage >= floor) return [];

    const examples = refs
      .filter((v) => classifyTier(v.provenance.tokenName, ctx.config) === 'unknown')
      .slice(0, 6)
      .map((v) => v.provenance.tokenName)
      .filter(Boolean);

    return [
      {
        ruleId: this.id,
        severity: 'low',
        summary: `only ${classified.length} of ${refs.length} referencing token(s) match a tier pattern (${round(coverage)} < floor ${floor}) — tier checks could not judge this source`,
        where: examples.join(', '),
        fix: 'Set taxonomy.primitivePattern, semanticNamespaces and componentPattern to this source\'s naming convention, then re-run. Until then treat a clean token/tier-leakage result as "not checked", not "passed".',
        data: { references: refs.length, classified: classified.length, coverage: round(coverage), floor },
      },
    ];
  },
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A semantic token whose name encodes appearance (a colour name, a size word,
 * a generic qualifier) rather than intent. `color.action.blue` is a primitive
 * with extra steps.
 */
export const semanticAppearanceNameRule: Rule = {
  id: 'token/semantic-name-describes-appearance',
  title: 'Semantic token name encodes appearance, not intent',
  impact:
    "The name locks in today's colour: when the brand changes, either the token lies about its value or every consumer is renamed.",
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const reserved = ctx.config.taxonomy.reservedSemanticTerms.map((t) => t.toLowerCase());
    const hits: { token: string; term: string; category: boolean }[] = [];
    const seen = new Set<string>();
    for (const v of ctx.values) {
      const name = v.provenance.tokenName;
      if (!name || seen.has(name)) continue;
      if (classifyTier(name, ctx.config) !== 'semantic') continue;
      const lower = name.toLowerCase();
      const term = reserved.find((t) => new RegExp(`(^|-)${t}(-|$)`).test(lower));
      if (term) {
        seen.add(name);
        hits.push({ token: name, term, category: /(^|-)category(-|$)/.test(lower) });
      }
    }
    if (hits.length === 0) return [];
    const categoryOnly = hits.every((h) => h.category);
    return [
      {
        ruleId: this.id,
        severity: categoryOnly ? 'low' : 'medium',
        summary: `${hits.length} semantic token(s) carry an appearance term in the name`,
        where: hits
          .slice(0, 8)
          .map((h) => `${h.token} (${h.term})${h.category ? ' — category token' : ''}`)
          .join('; '),
        fix: categoryOnly
          ? 'Category / chart-series tokens are a common sanctioned exception — the colour name IS the identity. Record this deviation in DESIGN-SYSTEM.md so it is not re-flagged.'
          : 'Rename to describe intent (color.action.primary, not color.action.blue). Keep the colour name only on category / chart-series tokens.',
        data: { hits },
      },
    ];
  },
};

// var(--x) with nothing after the token name — no fallback. A var() WITH a
// fallback has a comma before the ')', so this pattern can't match it.
// ponytail: regex, not a CSS parser. The "no fallback" shape is unambiguous;
// deeply nested fallback chains it doesn't need to understand.
const VAR_NO_FALLBACK = /var\(\s*(--[\w-]+)\s*\)/g;

/**
 * A `var(--token)` reference with no fallback. If the token is ever undefined —
 * wrong import order, a consumer that didn't load the token file, a theme that
 * dropped a mode-specific value — the property silently resolves to nothing.
 * Salesforce SLDS requires a fallback on every reference for exactly this.
 * https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules
 */
export const varMissingFallbackRule: Rule = {
  id: 'token/var-missing-fallback',
  title: 'var() reference has no fallback value',
  impact:
    'If the token is ever undefined — wrong import order, a consumer that never loaded the token file — the property resolves to nothing and the element renders unstyled.',
  targets: ['tokens', 'color', 'spacing', 'typography', 'elevation', 'motion'],
  run(ctx: RuleContext): Finding[] {
    const hits: { token: string; ref: string; where: string }[] = [];
    for (const v of ctx.values) {
      if (v.provenance.classification !== 'reference') continue;
      for (const m of v.raw.matchAll(VAR_NO_FALLBACK)) {
        // a var() sitting after a comma is itself a fallback — the author already
        // gave the outer reference a fallback path, don't nag about the leaf.
        const before = v.raw.slice(0, m.index).trimEnd();
        if (before.endsWith(',')) continue;
        hits.push({
          token: v.provenance.tokenName ?? '(inline)',
          ref: m[1]!,
          where: `${v.provenance.file}:${v.provenance.line}`,
        });
      }
    }
    if (hits.length === 0) return [];
    return [
      {
        ruleId: this.id,
        severity: 'low',
        summary: `${hits.length} var() reference(s) have no fallback value`,
        where: hits
          .slice(0, 8)
          .map((h) => `${h.token}: var(${h.ref}) at ${h.where}`)
          .join('; '),
        fix: 'Add a fallback: var(--token, <value>) — the base-theme value, so a missing token degrades to something sane instead of nothing.',
        data: { count: hits.length, hits: hits.slice(0, 40) },
      },
    ];
  },
};
