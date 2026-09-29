import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LoadedConfig } from '../config/load.ts';
import { auditSummary } from '../core/audit-summary.ts';
import { audit } from './audit.ts';
import { report as writeReport } from './report.ts';

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
 * the verdict, up to three finding groups, exceptions, coverage, and next
 * commands. Rule text stays unchanged. The skill entry is a handoff to the user's
 * agent, not an engine interview or an automatic activation.
 */
export function overview(path: string, loaded: LoadedConfig): number {
  const report = audit(path, {
    config: loaded.config,
    severityOverrides: loaded.severityOverrides,
    silent: true,
  });
  console.log('');
  console.log(`  ds-loop ${VERSION}`);
  if (loaded.source !== 'defaults') console.log(`  config ${loaded.source}`);
  let reportNote = '  Run ds-loop report to save or refresh the visual report.';
  let failed = false;
  if (
    !existsSync(join(process.cwd(), '.ds-scorecard')) &&
    !existsSync(join(process.cwd(), 'ds-loop-report.html'))
  ) {
    try {
      writeReport(path, loaded, { measured: report, silent: true, exclusive: true });
      reportNote = '  wrote ds-loop-report.html — open it in your browser';
    } catch (error) {
      reportNote = `  Report could not be saved: ${(error as Error).message}`;
      failed = true;
    }
  } else if (existsSync(join(process.cwd(), 'ds-loop-report.html'))) {
    reportNote = '  Existing ds-loop-report.html preserved; it may describe an earlier run.';
  }
  const guided = [
    '',
    reportNote,
    '    Look at: findings with source locations; coverage and what was not checked.',
    '    Assessment and plan need your coding agent; they are not generated advice.',
    `    skill   ${fileURLToPath(new URL('../../skill/SKILL.md', import.meta.url))}`,
    '    Ask your coding agent to read the skill and write consult.json for your goal.',
    `    Then run npx --no-install ds-loop report ${path} --consult consult.json.`,
    '    Installing the package does not start the agent.',
  ];
  console.log(auditSummary(report, path, guided, true).join('\n'));
  return failed || report.findings.length > 0 ? 1 : 0;
}
