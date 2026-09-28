import type { AuditReport } from '../commands/audit.ts';
import type { Finding } from '../rules/types.ts';
import { severityTag } from './ansi.ts';
import { formatCoverage } from './coverage.ts';
import { auditViewActions, formatNext } from './next.ts';

/** Recorded examples only: some rules retain a sample, not the full hit list. */
export function findingLocations(finding: Finding): string[] {
  const locations: string[] = [];
  const add = (location: string) => {
    if (!locations.includes(location) && locations.length < 3) locations.push(location);
  };
  const visit = (value: unknown): void => {
    if (locations.length === 3 || !value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    if (typeof row.file === 'string' && typeof row.line === 'number') add(`${row.file}:${row.line}`);
    if (typeof row.where === 'string') {
      for (const match of row.where.matchAll(/[^\s;(),]+:\d+/g)) add(match[0]);
    }
    for (const child of Object.values(row)) visit(child);
  };
  visit(finding.data);
  if (!locations.length) {
    for (const match of finding.where.matchAll(/[^\s;(),]+:\d+/g)) add(match[0]);
  }
  return locations;
}

/** Presentation only. Does not mutate findings, severity, coverage or ratios. */
export function auditSummary(report: AuditReport, path: string, beforeNext: string[] = []): string[] {
  const { findings, coverage, manifest: m } = report;
  const lines = [`  ds-loop audit — ${m.fixtureLabel} · target: ${m.target}`];
  if (report.verdict === 'not-checked') {
    lines.push('  ✗ not checked — This is not a clean result. Nothing was judged.');
  } else if (!findings.length) {
    lines.push(
      coverage.complete
        ? '  ✓ clean — every rule that ran could judge this source, and found nothing'
        : '  ✓ no findings — but the scope below is narrower than the whole source',
    );
  } else {
    const total = (severity: string) => findings.filter((f) => f.severity === severity).length;
    lines.push(
      `  ${findings.length} findings — ${total('blocking')} blocking · ${total('high')} high · ${total('medium')} medium · ${total('low')} low`,
    );
  }
  lines.push(
    `  version ${m.fixtureSha}   adapter ${m.adapter}   config ${m.configHash}`,
    `  ${report.rulesRun.length} rules run`,
    '',
    '  scope — what this audit read',
    ...formatCoverage(coverage),
  );
  if (m.judgedFiles)
    lines.push(`    selected files: ${m.judgedFiles.length} — see manifest.judgedFiles in --json`);
  if (m.tokenContext)
    lines.push(
      `    token context: ${m.tokenContext.length} dependency reads — excluded from findings and ratios; details in --all / --json`,
    );
  if (findings.length) {
    lines.push(
      '',
      '  findings — one row per finding group; up to 3 recorded locations (not ranked by frequency)',
    );
    for (const f of findings) {
      const count = typeof f.data?.count === 'number' ? `${f.data.count} hits` : '1 finding';
      const locations = findingLocations(f);
      lines.push(
        `  ${severityTag(f.severity)} ${f.ruleId} · ${f.summary} · ${count} · ${locations.join(', ') || 'no file:line recorded'}`,
      );
    }
  }
  if (report.suppressions.length) {
    lines.push('', '  suppressed — exceptions applied to this run');
    for (const s of report.suppressions)
      lines.push(`    ${s.rule} · ${s.value} — ${s.matched} value(s) · ${s.reason}`);
  }
  if (Object.keys(report.styleInventory).length) {
    lines.push(
      '',
      '  CSS property inventory — extracted, before exceptions and severity filtering',
      '    tokenization = reference-only / (literal + reference + mixed); not reference resolution',
    );
    for (const [category, r] of Object.entries(report.styleInventory)) {
      lines.push(
        `    ${category}: ${r.occurrences} occurrences · ${r.distinctValues} distinct · ${r.literals} literal · ${r.references} reference · ${r.mixed} mixed · ${r.unclassified} unclassified · ${r.excluded} excluded · tokenization ${r.tokenizationRatio === null ? 'not measured' : `${(r.tokenizationRatio * 100).toFixed(1)}%`}`,
      );
    }
  }
  lines.push(...beforeNext, '', ...formatNext(auditViewActions(report.next, path)), '');
  return lines;
}
