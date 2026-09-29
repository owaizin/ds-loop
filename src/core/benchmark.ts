import { readFileSync } from 'node:fs';
import type { AuditReport } from '../commands/audit.ts';
import { comparability } from '../commands/scorecard.ts';
import { BENCHMARK_POLICY } from '../config/benchmark.ts';
import { VALUE_CATEGORIES } from './provenance.ts';
import type { TeamShape } from './team-shape.ts';
import { escapeHtml as esc } from './visual-system.ts';

export type ReferenceSet = 'products' | 'systems';
export type Reference = {
  name: string;
  url: string;
  sha: string;
  set: ReferenceSet;
  license: string;
  scanPath: string;
  date: string;
  ratios: Record<string, number | null>;
  occurrences: Record<string, number>;
  totalValues: number;
  adapters: string;
  configHash: string;
};
// ponytail: application scripts and documentation directory names are structural
// signals, not proof of a package’s audience. --against lets the team correct them.
export function referenceSet(
  shape: TeamShape,
  override?: ReferenceSet,
): { set: ReferenceSet; reason: string } {
  if (override) return { set: override, reason: 'Selected with --against.' };
  const applications = shape.packages.filter(
    (p) =>
      p.application && !/(?:^|\/)(?:docs|examples?|storybook|playground|website|www)(?:\/|$)/.test(p.file),
  );
  if (
    applications.length ||
    shape.productionConsumers.some((name) =>
      shape.packages.some(
        (p) =>
          p.name === name &&
          p.private &&
          !/(?:^|\/)(?:docs|examples?|storybook|playground|website|www)(?:\/|$)/.test(p.file),
      ),
    )
  )
    return {
      set: 'products',
      reason:
        'Application commands or internal production consumers were found in package manifests and imports.',
    };
  if (shape.packages.some((p) => p.private === false && p.exports))
    return {
      set: 'systems',
      reason:
        'A package declares exports and is not private; no internal product application was identified. This is a structural inference, not proof of publication.',
    };
  return {
    set: 'products',
    reason:
      'No publishable shared library was established; products is the fallback. Review the structural facts below.',
  };
}

export function readReferences(): Reference[] {
  const data = JSON.parse(readFileSync(new URL('../../benchmarks/reference.json', import.meta.url), 'utf8'));
  if (data.schemaVersion !== 2 || !Array.isArray(data.references))
    throw new Error('Invalid benchmark reference data');
  for (const r of data.references) {
    if (
      !r ||
      !['products', 'systems'].includes(r.set) ||
      !/^[a-f0-9]{40}$/.test(r.sha) ||
      !['name', 'url', 'license', 'scanPath', 'date', 'adapters', 'configHash'].every(
        (k) => typeof r[k] === 'string',
      ) ||
      !r.ratios ||
      !Object.values(r.ratios).every((n) => n === null || (typeof n === 'number' && Number.isFinite(n))) ||
      !Number.isInteger(r.totalValues) ||
      r.totalValues < 0 ||
      !r.occurrences ||
      !Object.values(r.occurrences).every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0)
    )
      throw new Error('Invalid benchmark reference row');
  }
  return data.references.filter(isMeasurableReference);
}
export const BENCHMARK_KEYS = VALUE_CATEGORIES.map((c) => `style-tokenization-${c}`);

export function measuredDimension(row: Pick<Reference, 'ratios' | 'occurrences'>, key: string): boolean {
  return (
    typeof row.ratios[key] === 'number' &&
    Number.isFinite(row.ratios[key]) &&
    (row.occurrences[key] ?? 0) >= BENCHMARK_POLICY.minOccurrences
  );
}

export function isMeasurableReference(row: Pick<Reference, 'ratios' | 'occurrences'>): boolean {
  return BENCHMARK_KEYS.some((key) => measuredDimension(row, key));
}

/** Null explicitly means not measured; counts exclude ambiguous and excluded values. */
export function benchmarkMeasurement(run: Pick<AuditReport, 'ratios' | 'styleInventory'>) {
  const ratios: Reference['ratios'] = {};
  const occurrences: Reference['occurrences'] = {};
  for (const category of VALUE_CATEGORIES) {
    const key = `style-tokenization-${category}`;
    const inventory = run.styleInventory[category];
    const count = inventory ? inventory.literals + inventory.references + inventory.mixed : 0;
    occurrences[key] = count;
    ratios[key] = count >= BENCHMARK_POLICY.minOccurrences ? (run.ratios[key] ?? null) : null;
  }
  return { ratios, occurrences };
}

export type Dimension = {
  key: string;
  team?: number;
  status: string;
  min?: number;
  max?: number;
  median?: number;
  references: string[];
};
export function compareReferences(
  run: Pick<AuditReport, 'ratios' | 'manifest'>,
  references: Reference[],
  set: ReferenceSet,
): Dimension[] {
  const rows = references.filter((r) => r.set === set && isMeasurableReference(r));
  const keys = BENCHMARK_KEYS;
  return keys.map((key) => {
    const team = run.ratios[key];
    const available = rows.filter((r) => measuredDimension(r, key));
    const base = { key, team, references: available.map((r) => r.name) };
    if (team === undefined) return { ...base, status: 'not checked' };
    if (available.length < BENCHMARK_POLICY.minContributors)
      return { ...base, status: 'too few reference repos to state a range' };
    if (
      available.some(
        (r) =>
          !comparability(r, { adapters: run.manifest.adapter, configHash: run.manifest.configHash }).clean,
      )
    )
      return { ...base, status: 'not comparable — instrument differs' };
    const values = available.map((r) => r.ratios[key]!).sort((a, b) => a - b);
    const min = values[0];
    const max = values[values.length - 1];
    const middle = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    return {
      ...base,
      min,
      max,
      median,
      status: team < min ? 'below range' : team > max ? 'above range' : 'in range',
    };
  });
}

export function benchmarkHtml(
  run: Pick<AuditReport, 'ratios' | 'manifest'>,
  shape: TeamShape,
  against?: ReferenceSet,
  references: Reference[] = readReferences(),
): string {
  const selected = referenceSet(shape, against);
  const rows = references.filter((r) => r.set === selected.set);
  const number = (n: number | undefined) => (n === undefined ? '—' : String(n));
  return `<section aria-label="Public reference benchmark"><h2>Compared with public ${selected.set}</h2><p>${esc(selected.reason)} Override with <code>--against products|systems</code>.</p><p>Ratios are reference-only values / (literal + reference + mixed values), from 0 to 1. Ranges are observations, not targets or grades. ${rows.length} measured reference repositories. ${BENCHMARK_POLICY.minOccurrences} classified occurrences per dimension and ${BENCHMARK_POLICY.minContributors} contributing repos are required. Partial adapter coverage limits every comparison. If any contributing reference uses a different instrument, the dimension has no numeric comparison.</p><div class="table-wrap"><table><thead><tr><th>Dimension</th><th>Your ratio</th><th>Reference range</th><th>Median</th><th>Comparison</th><th>Contributing sources</th></tr></thead><tbody>${compareReferences(
    run,
    references,
    selected.set,
  )
    .map(
      (d) =>
        `<tr><th>${esc(d.key.replace('style-tokenization-', '').replace('color', 'Colour'))} tokenization</th><td>${d.team === undefined ? 'not checked' : d.status.startsWith('not comparable') ? '—' : number(d.team)}</td><td>${d.min === undefined ? '—' : `${number(d.min)}–${number(d.max)}`}</td><td>${number(d.median)}</td><td>${esc(d.status)}</td><td>${d.references.length} reference repos: ${esc(d.references.join(', ') || 'none')}</td></tr>`,
    )
    .join(
      '',
    )}</tbody></table></div><details><summary>Reference sources and measured scope</summary><ul>${rows.map((r) => `<li>${esc(r.name)} · ${esc(r.license)} · ${esc(r.sha)} · ${esc(r.scanPath)} · ${esc(r.date)}<br>${esc(r.url)}<br>${esc(r.adapters)} · config ${esc(r.configHash)}</li>`).join('') || '<li>not checked — this set has no measured references.</li>'}</ul></details></section>`;
}
