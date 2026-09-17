import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adapterLabel, adaptersFor } from '../adapters/registry.ts';
import { DEFAULT_CONFIG } from '../config/defaults.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { hashConfig } from '../config/schema.ts';
import { type Coverage, buildCoverage, formatCoverage } from '../core/coverage.ts';
import { surveyTree } from '../core/files.ts';
import { changedFiles, resolveSource } from '../core/source.ts';
import { rulesForTarget } from '../rules/registry.ts';
import { type Finding, type RuleTarget, SEVERITY_ORDER, type Severity } from '../rules/types.ts';

export type AuditReport = {
  manifest: {
    tool: 'ds-loop';
    command: 'audit';
    target: string;
    fixtureLabel: string;
    fixtureSha: string;
    adapter: string;
    configHash: string;
    ranAt: string;
  };
  rulesRun: string[];
  findings: Finding[];
  /** what this audit could not read — a clean verdict is only as wide as its coverage */
  coverage: Coverage;
  /** ratios, not counts — a scorecard row that survives codebase growth */
  ratios: Record<string, number>;
  /**
   * `clean` means every rule that could judge did, and found nothing.
   * `issues` means findings survived.
   * `not-checked` means no adapter read the source — never a pass.
   */
  verdict: 'clean' | 'issues' | 'not-checked';
};

/**
 * One-shot deterministic audit. Runs every rule that speaks to `target`,
 * returns severity-ranked findings + scorecard ratios. No LLM, no network.
 */
export function audit(
  targetPath: string,
  opts: {
    target?: RuleTarget | 'all';
    json?: boolean;
    outDir?: string;
    config?: DsOpsConfig;
    severityOverrides?: Record<string, Finding['severity']>;
    /** limit the scan to these files (hook mode) */
    files?: string[];
    /** limit the scan to files changed vs this git ref */
    since?: string;
    /** drop findings weaker than this */
    minSeverity?: Severity;
    /** print nothing when there are no findings at or above minSeverity (hook mode) */
    quiet?: boolean;
    /**
     * Print nothing at all. `quiet` is for the guard hook, which must stay silent
     * on a clean save but speak up on a dirty one; this is for a caller that wants
     * the report as a value and will do its own printing — `scorecard`, a test.
     */
    silent?: boolean;
  } = {},
): AuditReport {
  const config = opts.config ?? DEFAULT_CONFIG;
  const overrides = opts.severityOverrides ?? {};
  const ruleTarget = opts.target ?? 'all';

  const only = [...(opts.files ?? []), ...(opts.since ? changedFiles(opts.since) : [])];
  const { meta, source, live } = resolveSource(targetPath, { only: only.length ? only : undefined });
  const adapters = adaptersFor(source);
  if (adapters.length === 0) {
    // No adapter recognised this tree. That is NOT a clean result, and it used to
    // return before printing the coverage report it most needed. Three outcomes
    // must stay distinguishable: an empty repository, styling in a format nothing
    // reads, and a source that was read but could not be judged. None of them may
    // masquerade as a checked system.
    return noAdapterReport(ruleTarget, meta, source.root, config, opts);
  }

  const values = adapters.flatMap((a) => a.extract(source, config));
  const colors = values.filter((v) => v.provenance.classification === 'color');
  const ctx = { meta, source, config, values, colors };

  const rules = rulesForTarget(ruleTarget);
  const minRank = opts.minSeverity ? SEVERITY_ORDER[opts.minSeverity] : Number.POSITIVE_INFINITY;
  const allFindings = rules
    .flatMap((r) => r.run(ctx))
    .map((f) => (overrides[f.ruleId] ? { ...f, severity: overrides[f.ruleId]! } : f));

  const findings = allFindings
    .filter((f) => SEVERITY_ORDER[f.severity] <= minRank)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const norm = (raw: string) => raw.replace(/\s+/g, ' ').trim().toLowerCase();
  const declared = colors.filter((v) => v.provenance.tokenName !== null);

  // Scope-aware duplication. `literal-colors-per-distinct` counts declarations
  // against distinct values across the whole source, which a themed system
  // inflates for free: light and dark declare every token once each. Measured on
  // a maintained design system, that scored it [redacted] — worse than an ungoverned
  // SaaS repo at 1.486. Counting within a selector scope removes the theme count
  // and leaves the signal the ratio was meant to carry: one value re-typed under
  // several names in the same scope.
  const byScope = new Map<string, string[]>();
  for (const v of declared) {
    const key = `${v.provenance.file}::${v.provenance.selector ?? '(none)'}`;
    const list = byScope.get(key) ?? [];
    list.push(norm(v.raw));
    byScope.set(key, list);
  }
  let scopedDecls = 0;
  let scopedDistinct = 0;
  for (const list of byScope.values()) {
    scopedDecls += list.length;
    scopedDistinct += new Set(list).size;
  }

  // Declarations only. Early calibration rows were measured before a markup adapter existed,
  // so this ratio was declarations-only by construction. Once `tailwind-jsx`
  // shipped, the same name silently began counting use-site literals too: a real
  // app measured [redacted] where its declared palette is [redacted]. That is a different
  // quantity under an unchanged name, which is the one thing a calibration metric
  // may never do. Use-site volume is reported by `token/raw-value-in-markup`.
  const distinctDeclared = new Set(declared.map((v) => norm(v.raw))).size;

  const ratios = {
    // theme-confounded; kept because the calibration corpus quotes it. See row 007.
    'literal-colors-per-distinct': round(declared.length / Math.max(distinctDeclared, 1)),
    // theme-independent: the same measurement taken within each selector scope
    'colors-per-distinct-in-scope': round(scopedDecls / Math.max(scopedDistinct, 1)),
    'ambiguous-share': round(
      values.filter((v) => v.provenance.classification === 'ambiguous').length / Math.max(values.length, 1),
    ),
    // `findings-per-rule` was retired: its denominator is the size of the rule
    // set, so it moved from 0.714 to 0.455 across the corpus when rules were
    // added and nothing about any source changed. It described the tool.
  };

  const coverage = buildCoverage(
    source.root,
    adapters,
    values,
    // unfiltered on purpose: a severity floor may hide a finding, never the fact
    // that a check could not judge this source
    allFindings.map((f) => f.ruleId),
  );

  const report: AuditReport = {
    manifest: {
      tool: 'ds-loop',
      command: 'audit',
      target: ruleTarget,
      fixtureLabel: meta.label,
      fixtureSha: meta.fixtureSha,
      adapter: adapterLabel(adapters),
      configHash: hashConfig(config),
      ranAt: new Date().toISOString(),
    },
    rulesRun: rules.map((r) => r.id),
    findings,
    coverage,
    ratios,
    verdict: findings.length === 0 ? 'clean' : 'issues',
  };

  const suppressed = opts.silent || (opts.quiet && findings.length === 0);
  if (!suppressed) {
    if (opts.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report, { live });
  }

  writeReport(report, meta, opts.outDir);

  return report;
}

/**
 * No adapter recognised the source. Distinguishes an empty tree from styling in an
 * unreadable format, and prints the coverage report either way — the reader needs
 * to know the difference between "nothing to check" and "could not check".
 */
function noAdapterReport(
  target: string,
  meta: { label: string; fixtureSha: string },
  root: string,
  config: DsOpsConfig,
  opts: { json?: boolean; quiet?: boolean; silent?: boolean; outDir?: string },
): AuditReport {
  const coverage = buildCoverage(root, [], [], []);
  const present = surveyTree(root);
  const anyFiles = present.size > 0;

  const report: AuditReport = {
    manifest: {
      tool: 'ds-loop',
      command: 'audit',
      target,
      fixtureLabel: meta.label,
      fixtureSha: meta.fixtureSha,
      adapter: 'none',
      // the real hash, not a placeholder: a not-checked run still happened under a
      // specific configuration, and a report that lies about which is not evidence
      configHash: hashConfig(config),
      ranAt: new Date().toISOString(),
    },
    rulesRun: [],
    findings: [],
    coverage,
    ratios: {},
    verdict: 'not-checked',
  };

  // every verdict leaves through the same door: print, and export when asked.
  // The early return used to skip --out entirely, so a not-checked run produced no
  // artifact at all — the one verdict a reader most needs on disk.
  writeReport(report, meta, opts.outDir);

  if (!opts.silent && !opts.quiet) {
    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`\n  ds-loop audit — ${meta.label}`);
      console.log(
        anyFiles
          ? '\n  ✗ not checked — no adapter reads any styling format found here.\n'
          : '\n  ✗ not checked — nothing to read: no files in scope.\n',
      );
      console.log('  scope — what this audit read');
      for (const line of formatCoverage(coverage)) console.log(line);
      if (anyFiles) {
        const top = [...present.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        console.log(`    formats present: ${top.map(([e, n]) => `${n}× ${e}`).join(', ')}`);
      }
      console.log('\n  This is not a clean result. Nothing was judged.\n');
    }
  }

  return report;
}

function printReport(r: AuditReport, opts: { live: boolean } = { live: false }): void {
  const { manifest: m } = r;
  const scope = opts.live ? 'live scan' : 'fixture';
  console.log(`\n  ds-loop audit — ${m.fixtureLabel}  ·  target: ${m.target}  ·  ${scope}`);
  console.log(`  version ${m.fixtureSha}   adapter ${m.adapter}   config ${m.configHash}`);
  console.log(`  ${r.rulesRun.length} rules run\n`);

  if (r.findings.length === 0) {
    const blind = r.coverage.couldNotJudge.length > 0 || !r.coverage.complete;
    console.log(
      blind
        ? '  ✓ no findings — but the scope below is narrower than the whole source\n'
        : '  ✓ clean — every rule that ran could judge this source, and found nothing\n',
    );
  } else {
    for (const f of r.findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.ruleId}`);
      console.log(`    ${f.summary}`);
      console.log(`    where: ${f.where}`);
      console.log(`    fix:   ${f.fix}\n`);
    }
    const bySev = r.findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `  ${r.findings.length} findings — ` +
        `${bySev.blocking ?? 0} blocking · ${bySev.high ?? 0} high · ${bySev.medium ?? 0} medium · ${bySev.low ?? 0} low`,
    );
  }

  console.log('\n  scope — what this audit read');
  for (const line of formatCoverage(r.coverage)) console.log(line);

  console.log('\n  scorecard ratios');
  for (const [k, v] of Object.entries(r.ratios)) console.log(`    ${k.padEnd(28)} ${v}`);
  console.log('');
}

/** the single export path — used by every verdict, including not-checked */
function writeReport(report: AuditReport, meta: { label: string }, outDir: string | undefined): void {
  if (!outDir) return;
  mkdirSync(outDir, { recursive: true });
  const slug = meta.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  writeFileSync(join(outDir, `${slug}.audit.json`), `${JSON.stringify(report, null, 2)}\n`);
}

const round = (n: number) => Math.round(n * 1000) / 1000;
