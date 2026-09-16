#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from './commands/audit.ts';
import { context } from './commands/context.ts';
import { fix } from './commands/fix.ts';
import { guard } from './commands/guard.ts';
import { scan } from './commands/scan.ts';
import { scorecard } from './commands/scorecard.ts';
import { sweep } from './commands/sweep.ts';
import { loadConfig } from './config/load.ts';
import { KNOWN_TARGETS } from './rules/registry.ts';
import type { RuleTarget, Severity } from './rules/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'));

const USAGE = `
ds-loop ${pkg.version} — audit, scaffold, and guardrail a design system from its code

  ds-loop audit <path> [--target ${KNOWN_TARGETS.join('|')}] [--json] [--out <dir>]
                      [--files <a,b>] [--since <ref>] [--min-severity <sev>] [--quiet] [--config <file>]
      Run every deterministic rule against <path>. <path> is a fixture dir
      (has SOURCE.json) or any dir / .css file (live scan of the working tree).
      --files / --since narrow to changed files. Exit 1 on any surviving finding.

  ds-loop sweep <path> [--out <dir>] [--config <file>]
      Sweep the CIEDE2000 ΔE cutoff across the configured range. Full curve.

  ds-loop scan  <path> [--config <file>]
      Quick look: taxonomy breakdown + palette clusters at the default ΔE.

  ds-loop guard <on|off|status>
      Install / remove a PostToolUse hook in ./.claude/settings.json that runs
      \`ds-loop audit\` on the file after any Edit/Write to a style file and
      surfaces high-severity findings. Preserves other hooks.

  ds-loop context [<path>]
      What this session is working with: which config loaded, whether the project
      declares a design system, which adapters recognise the tree. No analysis.

  ds-loop scorecard [<path>] [--dry-run] [--json]
      Append one row of ratios to .ds-scorecard/history.jsonl and print the change
      since the last row. A delta is only called a delta when the adapters and the
      config match on both sides — otherwise the instrument moved, not the code.

  ds-loop fix <path> [--write]
      Apply the mechanical fixes only — where the correct edit is provable from
      the code. v0: inserts a fallback into \`var(--x)\` using the literal value
      of --x. Dry run unless --write.
`;

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
function has(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
function list(argv: string[], name: string): string[] {
  const v = flag(argv, name);
  return v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

function main(argv: string[]): void {
  const [cmd, ...rest] = argv;
  const loaded = loadConfig(flag(rest, 'config'));
  const { config } = loaded;
  const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));

  switch (cmd) {
    case 'audit': {
      const auditPath = positional[0] ?? '.'; // no path means "this directory"
      const target = (flag(rest, 'target') ?? 'all') as RuleTarget | 'all';
      if (!KNOWN_TARGETS.includes(target)) {
        throw new Error(`unknown target '${target}'. one of: ${KNOWN_TARGETS.join(', ')}`);
      }
      // never on stdout in --json mode: the whole point of --json is that a
      // pipeline can parse it
      if (loaded.source !== 'defaults' && !has(rest, 'quiet') && !has(rest, 'json')) {
        console.log(`  config: ${loaded.source}`);
      }
      const report = audit(auditPath, {
        target,
        json: has(rest, 'json'),
        outDir: flag(rest, 'out'),
        config,
        severityOverrides: loaded.severityOverrides,
        files: list(rest, 'files'),
        since: flag(rest, 'since'),
        minSeverity: flag(rest, 'min-severity') as Severity | undefined,
        quiet: has(rest, 'quiet'),
      });
      if (report.findings.length > 0) process.exitCode = 1;
      break;
    }
    case 'sweep': {
      if (!positional[0]) throw new Error('sweep needs a path');
      sweep(positional[0], { outDir: flag(rest, 'out'), config });
      break;
    }
    case 'scan': {
      scan(positional[0] ?? '.', config);
      break;
    }
    case 'guard': {
      const action = positional[0] ?? 'status';
      if (!['on', 'off', 'status'].includes(action)) {
        throw new Error(`guard needs one of: on, off, status`);
      }
      guard(action as 'on' | 'off' | 'status');
      break;
    }
    case 'context': {
      context(positional[0] ?? '.', loaded);
      break;
    }
    case 'scorecard': {
      scorecard(positional[0] ?? '.', {
        config,
        dryRun: has(rest, 'dry-run'),
        json: has(rest, 'json'),
      });
      break;
    }
    case 'fix': {
      if (!positional[0]) throw new Error('fix needs a path');
      fix(positional[0], { write: has(rest, 'write'), config });
      break;
    }
    case undefined:
    case '-h':
    case '--help':
      console.log(USAGE);
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      console.log(USAGE);
      process.exitCode = 1;
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`\n  error: ${(err as Error).message}\n`);
  process.exitCode = 1;
}
