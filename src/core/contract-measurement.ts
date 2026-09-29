import { join } from 'node:path';
import { ADAPTERS, adaptersFor } from '../adapters/registry.ts';
import type { SourceRef } from '../adapters/types.ts';
import { BENCHMARK_POLICY } from '../config/benchmark.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { analyseConsumers } from './consumers.ts';
import { buildCoverage, formatCoverage } from './coverage.ts';
import { listFiles } from './files.ts';
import type { RawValue } from './provenance.ts';
import { VALUE_CATEGORIES } from './provenance.ts';
import { styleInventory } from './style-inventory.ts';

/** The benchmark sample floor applies to each ratio's own denominator. */
export function contractRatios(values: RawValue[]): Record<string, number | null> {
  const inventory = styleInventory(values);
  return Object.fromEntries(
    VALUE_CATEGORIES.map((category) => {
      const row = inventory[category];
      return [
        `style-tokenization-${category}`,
        row && row.literals + row.references + row.mixed >= BENCHMARK_POLICY.minOccurrences
          ? row.tokenizationRatio
          : null,
      ];
    }),
  );
}

export function packageContract(source: SourceRef, config: DsOpsConfig): string {
  const consumers = analyseConsumers(source.root);
  if (!consumers.packages.length) return '';
  const lines = [
    '## Workspace packages',
    '',
    `Ratios need at least ${BENCHMARK_POLICY.minOccurrences} classified occurrences per dimension (the benchmark sample floor).`,
    'Shared-component share uses production shared + local JSX occurrences and the same floor; external and unresolved components are excluded.',
    'These are source occurrences, not runtime adoption. Missing or smaller samples are not measured.',
    '',
  ];
  for (const pkg of consumers.packages) {
    const root = join(source.root, pkg.dir);
    const nested = consumers.packages.filter((p) => p.dir.startsWith(`${pkg.dir}/`));
    const scoped = {
      ...source,
      root,
      only: listFiles(root, [...new Set(ADAPTERS.flatMap((a) => a.extensions))]).filter(
        (file) => !nested.some((p) => file.startsWith(`${join(source.root, p.dir)}/`)),
      ),
    };
    const adapters = adaptersFor(scoped, config);
    const values = adapters.flatMap((a) => a.extract(scoped, config));
    const usage = consumers.consumers.find((c) => c.dir === pkg.dir)?.usage.production;
    const share =
      usage && usage.shared.elements + usage.local.elements >= BENCHMARK_POLICY.minOccurrences
        ? usage.sharedComponentShare
        : null;
    lines.push(
      `### ${pkg.name} (${pkg.dir})`,
      '',
      adapters.length
        ? `Adapters: ${adapters.map((a) => `${a.id}@${a.version}`).join(' + ')}`
        : 'not checked — no adapter reads this package.',
      '',
      '| measurement | ratio |',
      '| --- | --- |',
    );
    for (const [key, value] of Object.entries({ ...contractRatios(values), 'shared-component-share': share }))
      lines.push(`| ${key} | ${value === null ? 'not measured — absent or below sample floor' : value} |`);
    lines.push(
      '',
      'Extraction scope (rules not run):',
      '```text',
      ...formatCoverage({ ...buildCoverage(root, adapters, values, []), complete: false }),
      '```',
      '',
    );
  }
  lines.push(...consumers.limits.map((limit) => `- ${limit}`), '');
  return `${lines.join('\n')}\n`;
}
