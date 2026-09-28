import { DEFAULT_CONFIG } from '../config/defaults.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { type RawValue, VALUE_CATEGORIES, type ValueCategory } from './provenance.ts';
export type CategoryEvidence = {
  category: ValueCategory;
  source: 'usage' | 'name';
  file?: string;
  line?: number;
  property?: string;
  pattern?: string;
};
function matches(value: string, patterns: Partial<Record<ValueCategory, string>>): ValueCategory[] {
  return VALUE_CATEGORIES.filter(
    (c) => patterns[c] !== undefined && new RegExp(patterns[c]!, 'i').test(value),
  );
}
export function siteCategory(site: RawValue, config: DsOpsConfig): ValueCategory | null {
  if (site.provenance.category) return site.provenance.category;
  if (site.provenance.classification === 'color') return 'color';
  if (site.provenance.surface !== 'markup') return null;
  // text-[var(--x)] can mean colour or type. Do not infer a role from an overloaded prefix.
  if (site.refs?.length && config.taxonomy.colorUtilities.includes(site.provenance.property)) return null;
  const categories = matches(
    site.provenance.property,
    config.suggestions.utilityPatterns ?? DEFAULT_CONFIG.suggestions.utilityPatterns!,
  );
  return categories.length === 1 ? categories[0] : null;
}
/** Propagate measured use through declaration references. No source rescanning or cascade claims. */
export function categoryResolver(values: RawValue[], config: DsOpsConfig) {
  const declarations = values.filter((v) => v.provenance.tokenName !== null);
  const dependencies = new Map<string, Set<string>>();
  for (const v of declarations) {
    const refs = dependencies.get(v.provenance.tokenName!) ?? new Set<string>();
    for (const ref of v.refs ?? []) refs.add(ref);
    dependencies.set(v.provenance.tokenName!, refs);
  }
  const usage = new Map<string, Map<string, CategoryEvidence>>();
  for (const v of values.filter((v) => v.provenance.tokenName === null)) {
    const category = siteCategory(v, config);
    if (!category) continue;
    const evidence: CategoryEvidence = {
      category,
      source: 'usage',
      file: v.provenance.file,
      line: v.provenance.line,
      property: v.provenance.property,
    };
    const key = JSON.stringify(evidence);
    const seen = new Set<string>();
    const pending = [...(v.refs ?? [])];
    while (pending.length) {
      const name = pending.pop()!;
      if (seen.has(name)) continue;
      seen.add(name);
      const entries = usage.get(name) ?? new Map<string, CategoryEvidence>();
      entries.set(key, evidence);
      usage.set(name, entries);
      pending.push(...(dependencies.get(name) ?? []));
    }
  }
  const patterns = config.suggestions.categoryPatterns ?? DEFAULT_CONFIG.suggestions.categoryPatterns!;
  return (name: string): CategoryEvidence[] => {
    const observed = usage.get(name);
    if (observed?.size) return [...observed.values()];
    return matches(name, patterns).map((category) => ({
      category,
      source: 'name',
      pattern: patterns[category],
    }));
  };
}
