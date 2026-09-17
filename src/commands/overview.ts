import type { LoadedConfig } from '../config/load.ts';
import { formatNext } from '../core/next.ts';
import { audit } from './audit.ts';

/**
 * What `ds-loop` says when it is run with no arguments — and what `ds-loop start`
 * says on purpose.
 *
 * It used to print the full manual: seven commands, every flag, no order, no
 * recommendation. That is a reference, and a reference is the wrong thing to hand
 * someone who has just installed the package and wants to know whether their token
 * layer is in trouble. The manual moved to `--help`, where a reference belongs.
 *
 * This runs the real audit — same rules, same coverage accounting — and prints
 * four things: the verdict, the single biggest finding, how wide the reading was,
 * and the next command. Nothing here is a new measurement or a softened rule
 * summary; the biggest finding is printed in the rule's own words.
 */
export function overview(path: string, loaded: LoadedConfig): number {
  const report = audit(path, {
    config: loaded.config,
    severityOverrides: loaded.severityOverrides,
    silent: true,
  });
  const { findings, coverage, verdict } = report;

  console.log(`\n  ds-loop ${report.manifest.fixtureLabel}  ·  ${report.manifest.fixtureSha}`);
  if (loaded.source !== 'defaults') console.log(`  config ${loaded.source}`);
  console.log('');

  if (verdict === 'not-checked') {
    console.log('  ✗ not checked — no adapter reads any styling format found here.');
    console.log('    This is not a clean result. Nothing was judged.');
  } else if (findings.length === 0) {
    console.log(
      coverage.complete
        ? '  ✓ clean — every rule that ran could judge this source, and found nothing'
        : '  ✓ no findings — but the scope below is narrower than the whole source',
    );
  } else {
    const bySev = findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `  ${findings.length} findings — ${bySev.blocking ?? 0} blocking · ${bySev.high ?? 0} high · ` +
        `${bySev.medium ?? 0} medium · ${bySev.low ?? 0} low`,
    );
    // findings arrive severity-ranked, so the first one is the biggest
    const top = findings[0]!;
    console.log(`\n  biggest   [${top.severity.toUpperCase()}] ${top.ruleId}`);
    console.log(`            ${top.summary}`);
    console.log(`            ${top.where}`);
  }

  const unread = Object.entries(coverage.unreadFormats);
  console.log(`\n  read      ${report.manifest.adapter === 'none' ? 'nothing' : report.manifest.adapter}`);
  if (unread.length > 0) {
    console.log(
      `  unread    ${unread.map(([ext, n]) => `${n}× ${ext}`).join(', ')} — no adapter reads these`,
    );
  }
  if (coverage.couldNotJudge.length > 0) {
    console.log(`  unjudged  ${coverage.couldNotJudge.join(', ')}`);
  }

  const next = formatNext(report.next);
  if (next.length > 0) {
    console.log('');
    for (const line of next) console.log(line);
  }
  console.log(`\n  ds-loop audit ${path} prints every finding · ds-loop --help lists every command\n`);

  return findings.length > 0 ? 1 : 0;
}
