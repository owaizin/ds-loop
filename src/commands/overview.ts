import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LoadedConfig } from '../config/load.ts';
import { severityTag, style } from '../core/ansi.ts';
import { formatCoverage } from '../core/coverage.ts';
import { formatNext } from '../core/next.ts';
import { audit } from './audit.ts';

const VERSION: string = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
).version;

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
 * the verdict, the first severity-ranked finding, exceptions, coverage, and next
 * commands. Rule text stays unchanged. The skill entry is a handoff to the user's
 * agent, not an engine interview or an automatic activation.
 */
export function overview(path: string, loaded: LoadedConfig): number {
  const report = audit(path, {
    config: loaded.config,
    severityOverrides: loaded.severityOverrides,
    silent: true,
  });
  const { findings, coverage, verdict } = report;

  console.log(
    `\n  ${style(`ds-loop ${VERSION}`, 'bold')}  ·  ${report.manifest.fixtureLabel}  ·  ${report.manifest.fixtureSha}`,
  );
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
    console.log(`\n  biggest   ${severityTag(top.severity)} ${top.ruleId}`);
    console.log(`            ${top.summary}`);
    console.log(`            ${top.where}`);
  }

  if (report.suppressions.length > 0) {
    console.log('\n  suppressed — exceptions applied to this run');
    for (const s of report.suppressions) {
      console.log(`    ${s.rule} · ${s.value} — ${s.matched} value(s)`);
      console.log(`      ${s.reason}`);
    }
  }

  console.log('\n  scope — what this audit read');
  for (const line of formatCoverage(coverage)) console.log(line);

  const next = formatNext(report.next);
  if (next.length > 0) {
    console.log('');
    for (const line of next) console.log(line);
  }
  console.log(`\n  ds-loop audit ${path} prints every finding · ds-loop --help lists every command`);

  // Installing the package prints nothing, so this is the first place a reader can
  // be told what they have and what to type. Aligned because it is scanned, not read.
  console.log('\n  guided work');
  console.log(`    skill   ${fileURLToPath(new URL('../../skill/SKILL.md', import.meta.url))}`);
  console.log('    run     npx --no-install ds-loop <command>');
  console.log(
    '\n    Ask your coding agent to read that skill, then describe the problem you want\n' +
      '    solved. Installing the package does not start the agent.\n',
  );

  return findings.length > 0 ? 1 : 0;
}
