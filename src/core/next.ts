import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AuditReport } from '../commands/audit.ts';
import { planFixes } from '../commands/fix.ts';
import type { DsOpsConfig } from '../config/schema.ts';

/**
 * The next command, named by the command that just ran.
 *
 * Every exit used to end on scorecard ratios — the one number that means nothing
 * on a first run, in the strongest position on the screen — and nothing anywhere
 * mentioned that `fix` could repair a subset of what the audit had just found. A
 * reader who installed the package and typed `ds-loop` got seven commands and
 * their flags, in no order, with no recommendation.
 *
 * So: each action is derived from what this run actually observed, never from a
 * template. `fix` is offered only when the fixer can really act (the count a rule
 * reports is not the count `fix` can edit), a baseline is offered only when no
 * history exists, and the guard is offered only when it is not already installed.
 * When there is nothing to do, that is what it says.
 *
 * This names commands. It does not restate findings in other words: the rule text
 * stays exactly as the rule wrote it.
 */
export type NextAction = {
  command: string;
  /** why this, now — one line, in the tool's own vocabulary */
  why: string;
};

export type NextContext = {
  /** the directory the command ran against, for locating state files */
  root: string;
  /** the path spelling to put in suggested commands, as the user typed it */
  path: string;
  config: DsOpsConfig;
};

const SCORECARD = join('.ds-scorecard', 'history.jsonl');

/** rows in the append-only scorecard history for this source, 0 when absent */
function historyRows(root: string): number {
  const file = join(root, SCORECARD);
  if (!existsSync(file)) return 0;
  try {
    return readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

/** is the edit-time hook already installed in this project? */
function guardInstalled(root: string): boolean {
  const file = join(root, '.claude', 'settings.json');
  if (!existsSync(file)) return false;
  try {
    return /ds-loop-guard\.mjs/.test(readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
}

export function nextAfterAudit(report: AuditReport, ctx: NextContext): NextAction[] {
  const actions: NextAction[] = [];
  const p = ctx.path;

  if (report.verdict === 'not-checked') {
    // the one case where more auditing is useless: no adapter read anything
    actions.push({
      command: `ds-loop context ${p}`,
      why: 'which formats are here, and which of them any adapter can read',
    });
    return actions;
  }

  let fixable = 0;
  try {
    fixable = planFixes(ctx.path, ctx.config).length;
  } catch {
    fixable = 0; // a path this fixer cannot read is not a reason to fail the audit
  }

  if (fixable > 0) {
    actions.push({
      command: `ds-loop fix ${p}`,
      why: `${fixable} mechanical edit(s) — provable from the code, dry run until --write`,
    });
  }
  if (report.findings.length > 0) {
    // the honest division of labour: the fixer takes what is provable, every other
    // finding is a decision, and saying so is more useful than a command that
    // cannot act on it
    actions.push({
      command: 'decide on the rest',
      why:
        fixable > 0
          ? 'each remaining finding states its choice on its fix line'
          : `nothing here is mechanically provable — all ${report.findings.length} findings state their choice on the fix line`,
    });
  }

  const rows = historyRows(ctx.root);
  actions.push({
    command: `ds-loop scorecard ${p}`,
    why:
      rows === 0
        ? 'pin these ratios as run 1 — a ratio only says something against a previous row'
        : `compare against ${rows} recorded row(s)`,
  });

  if (!guardInstalled(ctx.root)) {
    actions.push({
      command: 'ds-loop guard on',
      why: 'report high-severity findings after each Claude Code edit (never blocks)',
    });
  }

  return actions;
}

export function nextAfterScan(ctx: NextContext): NextAction[] {
  return [
    {
      command: `ds-loop audit ${ctx.path}`,
      why: 'scan counts and clusters; audit is what applies the rules',
    },
    {
      command: `ds-loop sweep ${ctx.path}`,
      why: 'the ΔE curve for this palette, before trusting the default cutoff',
    },
  ];
}

export function nextAfterSweep(ctx: NextContext): NextAction[] {
  return [
    {
      command: 'set clustering.deltaE in your config',
      why: 'the plateau above is this source’s answer; the default is uncalibrated',
    },
    { command: `ds-loop audit ${ctx.path}`, why: 'run the rules at the cutoff you chose' },
  ];
}

/** printable block, or nothing when there is genuinely no next step */
export function formatNext(actions: NextAction[]): string[] {
  if (actions.length === 0) return [];
  const width = Math.max(...actions.map((a) => a.command.length));
  return ['  next', ...actions.map((a) => `    ${a.command.padEnd(width)}   ${a.why}`)];
}
