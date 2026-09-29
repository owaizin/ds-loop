import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { declarations } from '../adapters/css-rule-bodies.ts';
import { adapterLabel, adaptersFor } from '../adapters/registry.ts';
import { loadConfig } from '../config/load.ts';
import { hashConfig } from '../config/schema.ts';
import { type ContractDrift, contractDrift, contractMeasurements } from '../core/contract-drift.ts';
import { guardEvidence, intentEvidence } from '../core/doctor-evidence.ts';
import { filesInScope } from '../core/files.ts';
import { resolveSource } from '../core/source.ts';
import { audit } from './audit.ts';

export type DoctorReport = {
  status: 'checked' | 'not-checked';
  root: string;
  error?: string;
  contract: ContractDrift;
  config: {
    source: string;
    status: 'checked' | 'not-checked';
    observations: { key: string; pattern: string; evidence: string }[];
  };
  guard: ReturnType<typeof guardEvidence>;
  intent: ReturnType<typeof intentEvidence>;
};

/** Read-only evidence. Even execution failures are reported, never a CI gate. */
export function doctor(
  target: string,
  opts: { json?: boolean; silent?: boolean; configPath?: string } = {},
): DoctorReport {
  let result: DoctorReport;
  try {
    const { source } = resolveSource(target);
    const loaded = loadConfig(opts.configPath, source.root);
    const adapters = adaptersFor(source, loaded.config);
    const values = adapters.flatMap((a) => a.extract(source, loaded.config));
    const report = audit(target, {
      config: loaded.config,
      severityOverrides: loaded.severityOverrides,
      silent: true,
    });
    const file = join(source.root, 'DESIGN-SYSTEM.md');
    let contract: ContractDrift;
    try {
      contract = contractDrift(existsSync(file) ? readFileSync(file, 'utf8') : null, {
        adapters: adapterLabel(adapters),
        configHash: hashConfig(loaded.config),
        measurements: contractMeasurements(values),
      });
    } catch {
      contract = { status: 'not-checked', reason: 'DESIGN-SYSTEM.md could not be read.', changes: [] };
    }
    // Naming evidence is wider than classified values: e.g. Primer's
    // --opacity-step: 15% is a real declaration the color adapter omits.
    const cssNames = filesInScope(source.root, ['.css'], source.only).flatMap((file) =>
      declarations(readFileSync(file, 'utf8'), true)
        .filter((d) => d.property.startsWith('--'))
        .map((d) => d.property),
    );
    const names = [
      ...cssNames,
      ...values.flatMap((v) => (v.provenance.tokenName === null ? [] : [v.provenance.tokenName])),
    ];
    const observations: DoctorReport['config']['observations'] = [];
    if (names.length) {
      for (const key of ['primitivePattern', 'componentPattern', 'upstreamPattern'] as const) {
        const pattern = loaded.config.taxonomy[key];
        const matches = (name: string) => {
          const regex = new RegExp(pattern!, 'i');
          const normalized = name.toLowerCase().replace(/^\$/, '').replaceAll('.', '-');
          return (
            regex.test(name) ||
            (key !== 'upstreamPattern' &&
              (regex.test(normalized) ||
                (key === 'componentPattern' &&
                  !normalized.startsWith('--') &&
                  regex.test(`--${normalized}`))))
          );
        };
        if (pattern && !names.some(matches))
          observations.push({
            key,
            pattern,
            evidence:
              'No extracted token declaration matches. Unread sources or external upstreams may contain matches; this does not prove the pattern is wrong.',
          });
      }
      for (const namespace of loaded.config.taxonomy.semanticNamespaces) {
        if (
          !names.some((name) => {
            const bare = name.toLowerCase().replace(/^\$/, '').replaceAll('.', '-').replace(/^--/, '');
            const afterPrefix = bare.includes('-') ? bare.slice(bare.indexOf('-') + 1) : '';
            return (
              bare === namespace ||
              bare.startsWith(`${namespace}-`) ||
              afterPrefix.startsWith(`${namespace}-`)
            );
          })
        )
          observations.push({
            key: 'semanticNamespaces',
            pattern: namespace,
            evidence:
              'No extracted token name opens with these namespaces (with or without a brand prefix); this does not prove the configuration is wrong.',
          });
      }
    }
    result = {
      status: 'checked',
      root: source.root,
      contract,
      config: { source: loaded.source, status: names.length ? 'checked' : 'not-checked', observations },
      guard: guardEvidence(source.root, report.coverage),
      intent: intentEvidence(source.root, report, loaded.config.taxonomy.conventionStatements),
    };
  } catch (error) {
    result = {
      status: 'not-checked',
      root: target,
      error: (error as Error).message,
      contract: { status: 'not-checked', reason: 'Measurement could not complete.', changes: [] },
      config: { source: opts.configPath ?? 'not checked', status: 'not-checked', observations: [] },
      guard: {
        installed: null,
        settingsFile: '.claude/settings.json',
        coverage: 'not-checked',
        stateFile: 'node_modules/.cache/ds-loop/guard-coverage.json',
        recordedAt: null,
        scope: 'Measurement could not complete.',
      },
      intent: { pairs: [], read: [], unavailable: [], scope: 'Measurement could not complete.' },
    };
  }
  if (!opts.silent) {
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else print(result);
  }
  return result;
}

function print(r: DoctorReport): void {
  console.log(`\n  ds-loop doctor — ${r.root}`);
  if (r.error) console.log(`  not checked: ${r.error}`);
  console.log(
    `\n  contract: ${r.contract.status}${r.contract.recordedAt ? ` (recorded ${r.contract.recordedAt})` : ''}`,
  );
  console.log(`    ${r.contract.reason}`);
  for (const c of r.contract.changes)
    console.log(
      `    ${c.measurement}: ${c.before ?? 'not measured'} → ${c.after ?? 'not measured'}${c.delta === undefined ? '' : ` (delta ${c.delta})`}`,
    );
  console.log(`\n  config: ${r.config.source} — ${r.config.status}`);
  if (r.config.status === 'not-checked') console.log('    No declaration-name comparison available.');
  else if (!r.config.observations.length)
    console.log('    No unmatched naming patterns in the extracted declarations.');
  // Grouped, because one caveat repeated per pattern is not nine pieces of evidence.
  // Primer printed the same twenty words nine times in a thirty-four line report, which
  // buries the two lines above it that a reader came for.
  for (const [key, group] of groupBy(r.config.observations, (o) => o.key)) {
    console.log(`    ${key}: ${group.map((o) => o.pattern).join(', ')}`);
    console.log(`      ${group[0]!.evidence}`);
  }
  console.log(
    `\n  guard: ${r.guard.installed === null ? 'not checked' : r.guard.installed ? 'installed' : 'not installed'}; recorded coverage ${r.guard.coverage}`,
  );
  console.log(`    ${r.guard.scope}`);
  console.log(
    `\n  intent/code pairs: ${r.intent.pairs.length ? 'review together' : 'none established (not a pass)'}`,
  );
  for (const p of r.intent.pairs) {
    console.log(`    document ${p.document.file}:${p.document.line} — ${p.document.text}`);
    console.log(`    code     ${p.code.file}:${p.code.line} — ${p.code.text}`);
  }
  console.log(`    ${r.intent.scope}`);
  if (r.intent.unavailable.length)
    console.log(`    Unreadable intent sources: ${r.intent.unavailable.join(', ')}`);
  console.log('\n  next: ds-loop audit . --json   inspect findings and coverage unfiltered\n');
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}
