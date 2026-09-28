import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LoadedConfig } from '../config/load.ts';
import { wordmark } from '../core/ansi.ts';
import { auditSummary } from '../core/audit-summary.ts';
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
 * the verdict, every finding summary, exceptions, coverage, and next
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
  for (const line of wordmark(VERSION)) console.log(line);
  if (loaded.source !== 'defaults') console.log(`  config ${loaded.source}`);
  const guided = [
    '',
    '  guided work',
    `    skill   ${fileURLToPath(new URL('../../skill/SKILL.md', import.meta.url))}`,
    '    run     npx --no-install ds-loop <command>',
    '    Ask your coding agent to read that skill, then describe the problem you want solved.',
    '    Installing the package does not start the agent.',
  ];
  console.log(auditSummary(report, path, guided).join('\n'));
  return report.findings.length > 0 ? 1 : 0;
}
