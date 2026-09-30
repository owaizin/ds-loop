import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { DsOpsConfig } from '../config/schema.ts';
import type { Finding } from '../rules/types.ts';
import type { FileImports, FileReach } from './file-imports.ts';
import { listFiles } from './files.ts';
import type { RawValue } from './provenance.ts';
import { applyIgnores } from './suppress.ts';

export type FindingDimensions = {
  reached: { state: FileReach['state'] | 'mixed'; basis: string };
  declaredIntentional: {
    state: 'recorded' | 'partial' | 'not-recorded';
    records: { source: string; reason: string }[];
  };
  domainValue: { state: 'hint-matched' | 'partial' | 'not-established'; hints: string[]; basis: string };
  occurrences: {
    all: number | null;
    reached: number | null;
    noStaticImporter: number | null;
    unresolved: number | null;
  };
  locations: {
    file: string;
    line: number;
    value: string;
    reached: Pick<FileReach, 'state' | 'basis'>;
    declaredIntentional: { source: string; reason: string }[];
    domainHints: string[];
  }[];
};

/** A prose evidence reference is not approval. Only explicit Covers selectors establish intent. */
export function decisionSelectors(root: string) {
  return listFiles(join(root, 'docs', 'decisions'), ['.md']).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    if (!/^Status: accepted\s*$/m.test(text)) return [];
    const block = text.match(/^## Covers\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] ?? '';
    return block.split('\n').flatMap((line) => {
      const match = line.match(/^- (\{.*\})\s*$/);
      if (!match) return [];
      try {
        const selector = JSON.parse(match[1]);
        if (
          typeof selector.rule !== 'string' ||
          !Array.isArray(selector.files) ||
          !selector.files.length ||
          selector.files.some((f: unknown) => typeof f !== 'string' || !f || f.includes('*')) ||
          (selector.value !== undefined && typeof selector.value !== 'string')
        )
          return [];
        return [
          {
            ...selector,
            reason: text.match(/^# (.+)$/m)?.[1] ?? 'Recorded decision',
            source: relative(root, file),
          },
        ];
      } catch {
        return [];
      }
    });
  });
}

export function annotateFindings(
  findings: Finding[],
  graph: FileImports,
  config: DsOpsConfig,
  root: string,
): Finding[] {
  const decisions = decisionSelectors(root);
  return findings.map((finding) => {
    const evidence = finding.evidence?.length ? finding.evidence : singleLocation(finding, graph);
    const locations = evidence.map((v) => {
      const records = [
        ...config.ignore.flatMap((entry, i) =>
          applyIgnores(finding.ruleId, [v], [entry]).suppressions.length
            ? [{ source: `config.ignore[${i}]`, reason: entry.reason }]
            : [],
        ),
        ...decisions.flatMap((entry) =>
          applyIgnores(finding.ruleId, [v], [entry]).suppressions.length
            ? [{ source: entry.source, reason: entry.reason }]
            : [],
        ),
      ];
      return {
        file: v.provenance.file,
        line: v.provenance.line,
        value: v.raw,
        reached: {
          state: graph.files[v.provenance.file]?.state ?? 'unresolved',
          basis: graph.files[v.provenance.file]?.basis ?? 'File is outside the import graph.',
        },
        declaredIntentional: records,
        domainHints: domainHints(v, config),
      };
    });
    const states = new Set(locations.map((l) => l.reached.state));
    const reached = locations.filter((l) => l.reached.state === 'reached').length;
    const intentional = locations.filter((l) => l.declaredIntentional.length).length;
    const domain = locations.filter((l) => l.domainHints.length).length;
    const dimensions: FindingDimensions = {
      reached: {
        state: states.size > 1 ? 'mixed' : (locations[0]?.reached.state ?? 'unresolved'),
        basis: locations.length
          ? 'Per-location static importer evidence; mixed groups retain every occurrence.'
          : 'This aggregate has no complete source locations; file membership is unresolved.',
      },
      declaredIntentional: {
        state: intentional ? (intentional === locations.length ? 'recorded' : 'partial') : 'not-recorded',
        records: [
          ...new Map(locations.flatMap((l) => l.declaredIntentional).map((r) => [r.source, r])).values(),
        ],
      },
      domainValue: {
        state: domain ? (domain === locations.length ? 'hint-matched' : 'partial') : 'not-established',
        hints: [...new Set(locations.flatMap((l) => l.domainHints))],
        basis:
          'Configured nonColorTokenHints matched color token names or selectors. A hint is declared context, not inferred product intent.',
      },
      occurrences: {
        all: locations.length || null,
        reached: locations.length ? reached : null,
        noStaticImporter: locations.length
          ? locations.filter((l) => l.reached.state === 'no-static-importer').length
          : null,
        unresolved: locations.length
          ? locations.filter((l) => l.reached.state === 'unresolved').length
          : null,
      },
      locations,
    };
    return { ...finding, dimensions };
  });
}

/** Only an exact, graph-backed file:line is provenance; display lists are never parsed. */
function singleLocation(finding: Finding, graph: FileImports): RawValue[] {
  const match = /^([^\r\n:;]+):([1-9]\d*)$/.exec(finding.where);
  if (
    !match ||
    match[0] !== finding.where ||
    !Object.hasOwn(graph.files, match[1]) ||
    !Number.isSafeInteger(Number(match[2]))
  )
    return [];
  // Synthesised solely for file/rule exception matching. No extracted value, token,
  // adapter or source revision is known; this stays local, never finding.evidence.
  return [
    {
      raw: '',
      provenance: {
        file: match[1],
        line: Number(match[2]),
        selector: null,
        property: '',
        tokenName: null,
        surface: null,
        category: null,
        classification: 'ambiguous',
        reason: 'Location synthesised from an exact finding file:line; no value was extracted.',
        fixtureSha: '',
        adapterId: '',
        adapterVersion: '',
      },
    },
  ];
}

function domainHints(value: RawValue, config: DsOpsConfig): string[] {
  if (value.provenance.category !== 'color' && value.provenance.classification !== 'color') return [];
  const role = `${value.provenance.tokenName ?? ''} ${value.provenance.selector ?? ''}`.toLowerCase();
  return config.taxonomy.nonColorTokenHints.filter((hint) => role.includes(hint.toLowerCase()));
}

export function dimensionTotals(findings: Finding[]) {
  return {
    all: findings.length,
    reached: findings.filter((f) => (f.dimensions?.occurrences.reached ?? 0) > 0).length,
    noStaticImporter: findings.filter((f) => f.dimensions?.reached.state === 'no-static-importer').length,
    unresolved: findings.filter((f) => !f.dimensions || f.dimensions.reached.state === 'unresolved').length,
    basis:
      'Finding groups with at least one reached location; mixed groups count once. Totals do not partition occurrences.',
  };
}

export function formatDimensions(findings: Finding[]): string[] {
  const total = dimensionTotals(findings);
  return [
    `  Finding evidence: ${total.all} all · ${total.reached} in files with a static importer`,
    ...findings.flatMap((f) => {
      const d = f.dimensions;
      if (!d) return [];
      const label = d.reached.state === 'no-static-importer' ? 'No static importer found' : d.reached.state;
      return [
        `    ${f.ruleId}: ${label} · ${d.occurrences.all ?? 'unresolved'} occurrences all / ${d.occurrences.reached ?? 'unresolved'} reached`,
        ...d.declaredIntentional.records.map((r) => `      Declared intentional: ${r.source} — ${r.reason}`),
        ...(d.domainValue.hints.length
          ? [`      Domain value hints: ${d.domainValue.hints.join(', ')}`]
          : []),
      ];
    }),
  ];
}
