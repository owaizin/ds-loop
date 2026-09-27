import { type RawValue, VALUE_CATEGORIES, type ValueCategory } from './provenance.ts';

export type CategoryInventory = {
  occurrences: number;
  distinctValues: number;
  literals: number;
  references: number;
  mixed: number;
  unclassified: number;
  excluded: number;
  /** Complete ranking; human output may show a prefix. Counts are declarations. */
  topFiles: { file: string; occurrences: number }[];
  /** references / (literals + references + mixed); null when no classified candidates. */
  tokenizationRatio: number | null;
};
export type StyleInventory = Partial<Record<ValueCategory, CategoryInventory>>;

export function isStyleLiteral(v: RawValue): boolean {
  return ['color', 'dimension', 'style-literal', 'mixed'].includes(v.provenance.classification);
}

/** Unfiltered extraction inventory, never derived from capped/filtered findings. */
export function styleInventory(values: RawValue[]): StyleInventory {
  const inventory: StyleInventory = {};
  for (const category of VALUE_CATEGORIES) {
    const vs = values.filter((v) => v.provenance.surface === 'style' && v.provenance.category === category);
    if (!vs.length) continue;
    const count = (classification: string) =>
      vs.filter((v) => v.provenance.classification === classification).length;
    const mixed = count('mixed');
    const literals = vs.filter(isStyleLiteral).length - mixed;
    const references = count('reference');
    const denominator = literals + references + mixed;
    const files = new Map<string, number>();
    for (const v of vs) files.set(v.provenance.file, (files.get(v.provenance.file) ?? 0) + 1);
    inventory[category] = {
      occurrences: vs.length,
      distinctValues: new Set(vs.map((v) => v.raw)).size,
      literals,
      references,
      mixed,
      unclassified: count('ambiguous'),
      excluded: count('excluded'),
      topFiles: [...files]
        .map(([file, occurrences]) => ({ file, occurrences }))
        .sort((a, b) => b.occurrences - a.occurrences || a.file.localeCompare(b.file)),
      tokenizationRatio: denominator ? references / denominator : null,
    };
  }
  return inventory;
}
