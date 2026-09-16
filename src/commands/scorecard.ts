import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DsOpsConfig } from '../config/schema.ts';
import { audit } from './audit.ts';

/**
 * `scorecard` — the delta, which is the thing anyone actually buys.
 *
 * A single audit says where a system stands. Two audits a month apart say whether
 * the team is winning, and that is the only number that survives a budget
 * conversation. This appends one row per run to `.ds-scorecard/history.jsonl` and
 * prints the change since the previous row.
 *
 * The honesty requirement comes from a real incident. When the colour adapter
 * learned to parse `oklch()`, every recorded measurement in the calibration corpus
 * became incomparable with the ones after it — the source had not changed, the tool
 * had. So a delta is only reported as a delta when `adapterVersion` and
 * `configHash` match on both sides. Otherwise it is labelled for what it is: a
 * comparison across two different instruments.
 *
 * Append-only, one JSON object per line. No database, no service, no schema
 * migration — a file you can read, diff, and commit.
 */

const DIR = '.ds-scorecard';
const FILE = 'history.jsonl';

export type ScorecardRow = {
  ranAt: string;
  label: string;
  /** upstream SHA for a fixture, `git:<sha>` for a working tree */
  fixtureSha: string;
  /** `css-custom-props@0.2.0 + tailwind-jsx@0.2.0` */
  adapters: string;
  configHash: string;
  ratios: Record<string, number>;
  findings: Record<string, number>;
  findingCount: number;
  /** false when the audit could not read part of the source */
  coverageComplete: boolean;
};

export function scorecard(
  targetPath: string,
  opts: { config?: DsOpsConfig; dryRun?: boolean; json?: boolean; dir?: string } = {},
): { row: ScorecardRow; previous: ScorecardRow | null } {
  // silent, not quiet: `quiet` still prints when a source is dirty, and scorecard
  // does its own printing
  const report = audit(targetPath, { config: opts.config, silent: true });

  const row: ScorecardRow = {
    ranAt: new Date().toISOString(),
    label: report.manifest.fixtureLabel,
    fixtureSha: report.manifest.fixtureSha,
    adapters: report.manifest.adapter,
    configHash: report.manifest.configHash,
    ratios: report.ratios,
    findings: Object.fromEntries(report.findings.map((f) => [f.ruleId, countOf(f)])),
    findingCount: report.findings.length,
    coverageComplete: report.coverage.complete,
  };

  const dir = join(opts.dir ?? process.cwd(), DIR);
  const path = join(dir, FILE);
  const history = readHistory(path).filter((r) => r.label === row.label);
  const previous = history.at(-1) ?? null;

  if (!opts.dryRun) {
    mkdirSync(dir, { recursive: true });
    appendFileSync(path, `${JSON.stringify(row)}\n`);
  }

  if (opts.json) {
    console.log(JSON.stringify({ row, previous, comparable: comparability(previous, row) }, null, 2));
  } else {
    print(row, previous, path, opts.dryRun === true);
  }

  return { row, previous };
}

/** what a finding's headline number is, across the rules that carry different shapes */
function countOf(f: { data?: Record<string, unknown> }): number {
  const d = f.data ?? {};
  for (const key of ['count', 'distinctNames']) {
    if (typeof d[key] === 'number') return d[key] as number;
  }
  for (const key of ['groups', 'pairs', 'hits', 'leaks']) {
    if (Array.isArray(d[key])) return (d[key] as unknown[]).length;
  }
  return 1;
}

function readHistory(path: string): ScorecardRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ScorecardRow];
      } catch {
        return []; // a hand-edited line should not break the run
      }
    });
}

type Comparability = { clean: true } | { clean: false; reason: string; changed: ('adapter' | 'config')[] };

/**
 * Two rows are comparable only when the instrument did not move between them.
 * This is the whole reason the row records `adapters` and `configHash`.
 */
export function comparability(prev: ScorecardRow | null, next: ScorecardRow): Comparability {
  if (!prev) return { clean: true };
  const changed: ('adapter' | 'config')[] = [];
  if (prev.adapters !== next.adapters) changed.push('adapter');
  if (prev.configHash !== next.configHash) changed.push('config');
  if (changed.length === 0) return { clean: true };
  return {
    clean: false,
    changed,
    reason:
      changed.length === 2
        ? 'both the adapters and the config changed since the previous row'
        : changed[0] === 'adapter'
          ? `the adapters changed (${prev.adapters} -> ${next.adapters})`
          : `the config changed (${prev.configHash} -> ${next.configHash})`,
  };
}

function print(row: ScorecardRow, prev: ScorecardRow | null, path: string, dryRun: boolean): void {
  console.log(`\n  ds-loop scorecard — ${row.label}`);
  console.log(`  ${row.fixtureSha}   ${row.adapters}   config ${row.configHash}`);
  console.log(`  ${dryRun ? 'dry run — nothing written' : `appended to ${path}`}\n`);

  const keys = [...new Set([...Object.keys(row.ratios), ...Object.keys(prev?.ratios ?? {})])];

  if (!prev) {
    console.log('  first row for this source — nothing to compare against yet.\n');
    for (const k of keys) console.log(`    ${k.padEnd(30)} ${fmt(row.ratios[k])}`);
    console.log(`\n    ${'findings'.padEnd(30)} ${row.findingCount}`);
    console.log('\n  Run it again after the next change. The delta is the point.\n');
    return;
  }

  const c = comparability(prev, row);
  console.log(`  since ${prev.ranAt.slice(0, 10)}\n`);

  for (const k of keys) {
    const a = prev.ratios[k];
    const b = row.ratios[k];
    console.log(`    ${k.padEnd(30)} ${fmt(a)} → ${fmt(b)}  ${arrow(a, b)}`);
  }

  const rules = [...new Set([...Object.keys(prev.findings), ...Object.keys(row.findings)])].sort();
  if (rules.length > 0) {
    console.log('\n  by rule');
    for (const id of rules) {
      const a = prev.findings[id] ?? 0;
      const b = row.findings[id] ?? 0;
      if (a === b) continue;
      console.log(`    ${id.padEnd(44)} ${a} → ${b}  ${arrow(a, b)}`);
    }
  }

  if (!c.clean) {
    console.log(`\n  ⚠ not a clean comparison — ${c.reason}.`);
    console.log('    The source and the instrument both moved, so this delta cannot be');
    console.log('    attributed to the code. Re-run the earlier point with the current');
    console.log('    adapters before reading anything into it.');
  }

  if (!row.coverageComplete) {
    console.log('\n  note: this audit could not read part of the source — run `audit` for the scope.');
  }
  console.log('');
}

const fmt = (n: number | undefined) => (n === undefined ? '—' : String(n));

/** lower is better for every ratio ds-loop emits, so down is progress */
function arrow(a: number | undefined, b: number | undefined): string {
  if (a === undefined || b === undefined) return '';
  if (a === b) return 'unchanged';
  const delta = Math.round((b - a) * 1000) / 1000;
  return b < a ? `▼ ${Math.abs(delta)}` : `▲ +${delta}`;
}
