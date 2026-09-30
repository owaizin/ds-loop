/**
 * What the precision snapshot records about one audit of a real repository.
 *
 * Counts only: never paths, values or timestamps, so the snapshot holds nothing
 * machine-local and nothing a public repository did not already publish. Each field
 * is here because a defect once moved it while every unit test stayed green: the
 * reachability label fired on zero files, the benchmark could never compare, and 224
 * of 242 PostHog cards could never be located.
 */
export function measure(report, fixEdits) {
  const tally = (items, key) => {
    const out = {};
    for (const item of items) {
      const k = key(item);
      out[k] = (out[k] ?? 0) + 1;
    }
    return sorted(out);
  };
  const rules = {};
  for (const f of report.findings) {
    const key = `${f.severity} ${f.ruleId}`;
    rules[key] ??= { cards: 0, located: 0 };
    const row = rules[key];
    row.cards += 1;
    row.located += f.dimensions?.occurrences.all ?? 0;
  }
  const locations = report.findings.flatMap((f) => f.dimensions?.locations ?? []);
  return {
    instrument: {
      adapters: report.manifest.adapter,
      configHash: report.manifest.configHash,
      fileImports: report.fileImports?.version ?? null,
    },
    verdict: report.verdict,
    coverage: {
      complete: report.coverage.complete,
      unreadFormats: sorted(report.coverage.unreadFormats),
      couldNotJudge: [...new Set(report.coverage.couldNotJudge)].sort(),
      unconvertibleColours: report.coverage.unconvertible.count,
    },
    findings: sorted(rules),
    reachability: {
      cards: tally(report.findings, (f) => f.dimensions?.reached.state ?? 'no-dimensions'),
      locations: tally(locations, (l) => l.reached.state),
      files: tally(Object.values(report.fileImports?.files ?? {}), (f) => f.state),
      totals: { ...report.findingTotals, basis: undefined },
    },
    ratios: sorted(
      Object.fromEntries(
        Object.entries(report.ratios).filter(
          ([k]) => k.startsWith('style-tokenization-') && !k.includes(':'),
        ),
      ),
    ),
    fixEdits,
  };
}

/** Every leaf that differs, as `path: before → after`. Absent on one side counts as a difference. */
export function diff(before, after, path = '') {
  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((k) => diff(before[k], after[k], path ? `${path}.${k}` : k));
  }
  const a = JSON.stringify(before);
  const b = JSON.stringify(after);
  return a === b ? [] : [`${path}: ${a ?? 'absent'} → ${b ?? 'absent'}`];
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
