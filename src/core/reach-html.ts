import type { AuditReport } from '../commands/audit.ts';
import type { Finding } from '../rules/types.ts';

/** Presentation only: absent measurements must never become zero. */
export function reached(n: number | null | undefined, ratio = false): string {
  return n == null ? 'reached not measured' : `reached ${ratio ? `${(n * 100).toFixed(1)}%` : n}`;
}

export function findingReach(f: Finding): string {
  const d = f.dimensions;
  if (!d) return 'Located occurrences not measured · reached not measured';
  const o = d.occurrences;
  const label =
    d.reached.state === 'no-static-importer'
      ? 'No static importer found'
      : d.reached.state === 'unresolved'
        ? 'importer not determined'
        : d.reached.state;
  const split =
    d.reached.state === 'mixed'
      ? ` · No static importer found: ${o.noStaticImporter ?? 'not measured'} · importer not determined: ${o.unresolved ?? 'not measured'}`
      : '';
  const located = o.all == null ? 'located occurrences not measured' : `${o.all} located occurrences all`;
  return `${label} · ${located} / ${reached(o.reached)}${split}`;
}

export function reachedGroups(findings: Finding[]): number | undefined {
  return findings.length > 0 && findings.every((f) => f.dimensions)
    ? findings.filter((f) => (f.dimensions?.occurrences.reached ?? 0) > 0).length
    : undefined;
}

export function reachLimits(r: AuditReport): string[] {
  return [
    ...new Set([...(r.findingTotals ? [r.findingTotals.basis] : []), ...(r.fileImports?.limits ?? [])]),
  ];
}
