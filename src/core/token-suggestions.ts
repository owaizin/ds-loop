import { type Rgba, parseColor, rgbaToLab } from '../color/convert.ts';
import { ciede2000 } from '../color/delta-e.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { type Tier, classifyTier } from '../rules/tier.ts';
import type { RuleContext } from '../rules/types.ts';
import type { Provenance, RawValue } from './provenance.ts';

export type TokenCandidate = {
  token: string;
  value: string;
  match: 'exact' | 'nearest';
  distance: number;
  metric: 'ΔE' | 'px' | 'identity';
  tier: Tier;
  aliasChain: string[];
  declarations: Provenance[];
  preferred: boolean;
};
export type TokenSuggestion = {
  value: string;
  file: string;
  line: number;
  property: string;
  status: 'exact' | 'nearest' | 'ambiguous' | 'no-token' | 'not-checked';
  candidates: TokenCandidate[];
  limits: string[];
};
export type FindingSuggestion = {
  basis: string;
  /** Shared by use sites consulting the same declaration set; not repeated per hit. */
  resolutionLimits: { files: string[]; details: string[] }[];
  values: TokenSuggestion[];
};
const BASIS =
  'Value candidates only; cascade, mode, semantic role and replacement safety are not established. No automatic replacement.';
const clean = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s*!important\s*$/i, '')
    .trim();
const literalKey = (s: string) => clean(s).replace(/\s+/g, ' ').toLowerCase();

/** Only declared dependencies and selected declarations are consulted; never scan an unrelated theme. */
function declarationsFor(ctx: RuleContext, site: RawValue): { values: RawValue[]; limits: string[] } {
  const declared = ctx.values.filter((v) => v.provenance.tokenName !== null);
  if (!ctx.tokenContext?.required) return { values: declared, limits: [] };
  const local = declared.filter((v) => v.provenance.file === site.provenance.file);
  const entry = ctx.tokenContext.byFile.get(site.provenance.file);
  if (entry?.errors.length) return { values: [], limits: entry.errors };
  if (!entry && !local.length)
    return {
      values: [],
      limits: ['Token context unavailable for this scoped use site; configure tokenContexts.'],
    };
  // Context and local extraction may contain the same declaration. Deduplicate
  // that record only, never distinct declarations that share a name or value.
  const all = [...local, ...(entry?.values ?? [])];
  const seen = new Set<string>();
  return {
    values: all.filter((v) => {
      const key = JSON.stringify([v.provenance, v.raw]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    limits: [],
  };
}

type Resolved = { value: string; declarations: Provenance[]; aliasChain: string[] };
function resolver(values: RawValue[]) {
  const byName = new Map<string, RawValue[]>();
  for (const value of values) {
    const name = value.provenance.tokenName;
    if (!name) continue;
    const group = byName.get(name) ?? [];
    group.push(value);
    byName.set(name, group);
  }
  const limits = new Set<string>();
  // ponytail: whole-value var() alias chains only, not computed CSS, substitution
  // inside recipes, or cascade resolution. Fallbacks do not prove a missing token
  // is absent at runtime. A CSS evaluator with consumer context is the upgrade.
  function resolve(v: RawValue, path: string[]): Resolved[] {
    const name = v.provenance.tokenName!;
    if (path.includes(name)) {
      limits.add(`Alias cycle: ${[...path, name].join(' → ')}`);
      return [];
    }
    const raw = clean(v.raw);
    const alias = wholeAlias(raw);
    if (!alias) {
      if (/var\s*\(/i.test(raw)) {
        limits.add(`Unresolved expression: ${name}`);
        return [];
      }
      return [{ value: raw, declarations: [v.provenance], aliasChain: [name] }];
    }
    const targets = byName.get(alias);
    if (!targets?.length) {
      limits.add(`Missing alias target: ${name} → ${alias} (fallback not assumed active)`);
      return [];
    }
    return targets.flatMap((target) =>
      resolve(target, [...path, name]).map((r) => ({
        ...r,
        declarations: [v.provenance, ...r.declarations],
        aliasChain: [name, ...r.aliasChain],
      })),
    );
  }
  const resolved = values.flatMap((v) => resolve(v, []));
  return { resolved, limits: [...limits], byName };
}

/** A trailing second function or expression is not a whole-value alias. */
function wholeAlias(value: string): string | null {
  const opening = value.match(/^var\(\s*(--[\w-]+)\s*(?=[,)])/);
  if (!opening) return null;
  let depth = 0;
  for (let i = 3; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') {
      depth--;
      if (depth === 0) return i === value.length - 1 ? opening[1] : null;
    }
  }
  return null;
}

type Normal =
  | { kind: 'color'; rgba: Rgba; precise: boolean }
  | { kind: 'length'; value: number; unit: string };
function normalize(raw: string, cfg: DsOpsConfig): Normal | null {
  const s = clean(raw).toLowerCase();
  // Strict RGB parsing avoids the legacy converter's percentage/rounding losses
  // when claiming identity. Approximate color conversions are nearest-only.
  if (/^#[\da-f]{3}(?:[\da-f]|[\da-f]{3}|[\da-f]{5})?$/i.test(s)) {
    const rgba = parseColor(s);
    if (rgba) return { kind: 'color', rgba, precise: true };
  }
  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,/\s]+/).filter(Boolean);
    if (
      (parts.length === 3 || parts.length === 4) &&
      parts.every((p) => /^[+-]?(?:\d*\.\d+|\d+)%?$/.test(p))
    ) {
      const channel = (p: string) =>
        Math.min(255, Math.max(0, Number.parseFloat(p) * (p.endsWith('%') ? 255 / 100 : 1)));
      const alpha = parts[3] ?? '1';
      const rgba = {
        r: channel(parts[0]),
        g: channel(parts[1]),
        b: channel(parts[2]),
        a: Math.min(1, Math.max(0, Number.parseFloat(alpha) / (alpha.endsWith('%') ? 100 : 1))),
      };
      return { kind: 'color', rgba, precise: true };
    }
    return null;
  }
  if (/^(?:hsla?|oklch)\([\d\s.,%/+\-deg]+\)$/.test(s)) {
    const rgba = parseColor(s);
    if (rgba && Object.values(rgba).every(Number.isFinite)) return { kind: 'color', rgba, precise: false };
  }
  const length = s.match(/^([+-]?(?:\d*\.\d+|\d+))(px|rem|em|vh|vw|ch|ex|%)$/);
  if (length) {
    const unit = length[2];
    return {
      kind: 'length',
      value: Number(length[1]) * (unit === 'rem' ? cfg.suggestions.rootFontSize : 1),
      unit: unit === 'rem' ? 'px' : unit,
    };
  }
  return null;
}

function match(
  value: string,
  token: string,
  cfg: DsOpsConfig,
): Pick<TokenCandidate, 'match' | 'distance' | 'metric'> | null {
  const a = normalize(value, cfg);
  const b = normalize(token, cfg);
  if (a?.kind === 'color' && b?.kind === 'color') {
    // ΔE does not account for transparency or compositing. Never compare alpha
    // differences using a background guessed by the engine.
    if (a.rgba.a !== b.rgba.a) return null;
    if (
      (a.precise && b.precise && ['r', 'g', 'b'].every((k) => a.rgba[k as 'r'] === b.rgba[k as 'r'])) ||
      literalKey(value) === literalKey(token)
    )
      return { match: 'exact', distance: 0, metric: 'identity' };
    const distance = ciede2000(rgbaToLab(a.rgba), rgbaToLab(b.rgba));
    return Number.isFinite(distance) && distance <= cfg.clustering.deltaE
      ? { match: 'nearest', distance, metric: 'ΔE' }
      : null;
  }
  if (a?.kind === 'length' && b?.kind === 'length' && a.unit === b.unit) {
    const distance = Math.abs(a.value - b.value);
    if (distance === 0) return { match: 'exact', distance, metric: 'identity' };
    return a.unit === 'px' && distance <= cfg.suggestions.lengthTolerancePx
      ? { match: 'nearest', distance, metric: 'px' }
      : null;
  }
  // Non-scalar recipes are not made equivalent by whitespace rewriting or math.
  // Exact recipe identity is useful only if the declaration adapter actually read it.
  if (!a && !b && clean(value) === clean(token) && !/var\s*\(/i.test(value))
    return { match: 'exact', distance: 0, metric: 'identity' };
  return null;
}

export function suggestTokens(ctx: RuleContext, sites: RawValue[]): FindingSuggestion {
  const cache = new Map<string, ReturnType<typeof resolver>>();
  const values: TokenSuggestion[] = sites.map((site) => {
    const base = {
      value: site.raw,
      file: site.provenance.file,
      line: site.provenance.line,
      property: site.provenance.property,
    };
    const source = declarationsFor(ctx, site);
    if (source.limits.length)
      return { ...base, status: 'not-checked', candidates: [], limits: source.limits };
    const key = ctx.tokenContext?.required ? site.provenance.file : '*';
    let tokens = cache.get(key);
    if (!tokens) {
      tokens = resolver(source.values);
      cache.set(key, tokens);
    }
    const candidates: TokenCandidate[] = [];
    for (const token of tokens.resolved) {
      const found = match(site.raw, token.value, ctx.config);
      if (!found) continue;
      candidates.push({
        token: token.aliasChain[0],
        value: token.value,
        ...found,
        tier: classifyTier(token.aliasChain[0], ctx.config),
        aliasChain: token.aliasChain,
        declarations: token.declarations,
        preferred: false,
      });
    }
    candidates.sort(
      (a, b) =>
        Number(b.match === 'exact') - Number(a.match === 'exact') ||
        a.distance - b.distance ||
        a.token.localeCompare(b.token) ||
        JSON.stringify(a.declarations).localeCompare(JSON.stringify(b.declarations)),
    );
    const exact = candidates.filter((c) => c.match === 'exact');
    const pool = exact.length ? exact : candidates.filter((c) => c.distance === candidates[0]?.distance);
    const aliases = pool.filter(
      (c) => c.tier === 'semantic' || (c.aliasChain.length > 1 && c.tier !== 'component'),
    );
    const preferred = aliases.length ? aliases : pool;
    for (const c of preferred) c.preferred = true;
    // A single matching definition does not authorize choosing it over other
    // modes/overrides of the same name, including unresolved definitions.
    const conditional = preferred.some((c) =>
      c.aliasChain.some((name) => (tokens!.byName.get(name)?.length ?? 0) > 1),
    );
    return {
      ...base,
      status:
        preferred.length === 0
          ? 'no-token'
          : preferred.length > 1 || conditional
            ? 'ambiguous'
            : preferred[0].match,
      candidates,
      limits: [
        ...(tokens.limits.length ? ['Some declarations unresolved; see suggestion.resolutionLimits.'] : []),
        ...(conditional
          ? ['Multiple declarations along the candidate alias chain; cascade/mode unresolved.']
          : []),
        ...(/rem\b/i.test(site.raw) || candidates.some((c) => /rem\b/i.test(c.value))
          ? [
              `rem normalization assumes rootFontSize=${ctx.config.suggestions.rootFontSize}px; computed root not measured.`,
            ]
          : []),
      ],
    };
  });
  return {
    basis: BASIS,
    values,
    resolutionLimits: [...cache]
      .filter(([, r]) => r.limits.length)
      .map(([key, r]) => ({
        files: key === '*' ? [...new Set(sites.map((s) => s.provenance.file))] : [key],
        details: r.limits,
      })),
  };
}

/** Backward-compatible direct-value view; collisions never overwrite or select a token. */
export function alreadyDeclared(ctx: RuleContext, sites: RawValue[]): { value: string; token: string }[] {
  return sites.flatMap((site) => {
    const ds = declarationsFor(ctx, site).values.filter(
      (v) => v.provenance.classification !== 'reference' && literalKey(v.raw) === literalKey(site.raw),
    );
    return ds.length === 1 ? [{ value: site.raw, token: ds[0].provenance.tokenName! }] : [];
  });
}

export function formatSuggestion(suggestion: FindingSuggestion): string {
  const groups = new Map<string, TokenSuggestion>();
  for (const value of suggestion.values) {
    const key = JSON.stringify([value.value, value.status, value.candidates, value.limits]);
    if (!groups.has(key)) groups.set(key, value);
  }
  const values = [...groups.values()];
  const text = values
    .slice(0, 6)
    .map((v) => {
      const names = v.candidates
        .filter((c) => c.preferred)
        .map(
          (c) =>
            `${c.token}${c.match === 'nearest' ? ` (${c.metric} ${Number(c.distance.toFixed(4))})` : ''}`,
        );
      return `${v.value}: ${v.status === 'no-token' ? 'no token within supported matching scope/tolerances' : v.status}${names.length ? ` — ${names.slice(0, 6).join(', ')}${names.length > 6 ? `; +${names.length - 6} candidates` : ''}` : ''}`;
    })
    .join('; ');
  return `${text}${values.length > 6 ? `; +${values.length - 6} value groups` : ''}. ${suggestion.resolutionLimits.length ? 'Some token declarations could not be resolved. ' : ''}${suggestion.basis} Full candidates, alias provenance and resolution limits in --json.`;
}
