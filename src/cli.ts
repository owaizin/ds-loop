#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from './commands/audit.ts';
import { context } from './commands/context.ts';
import { fix } from './commands/fix.ts';
import { guard } from './commands/guard.ts';
import { overview } from './commands/overview.ts';
import { scan } from './commands/scan.ts';
import { scorecard } from './commands/scorecard.ts';
import { sweep } from './commands/sweep.ts';
import { loadConfig } from './config/load.ts';
import { formatCoverage } from './core/coverage.ts';
import { KNOWN_TARGETS } from './rules/registry.ts';
import type { RuleTarget, Severity } from './rules/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'));

const FIX_USAGE = `
  ds-loop fix <path> [--write] [--config <file.json>]
      Supports token/var-missing-fallback in CSS custom-property declarations.
      Inserts a fallback only when the referenced token has a direct color or
      dimension literal in scope. Skips missing definitions and alias chains.
      Does not migrate JSX utilities or fix other rules. Zero edits is not a clean audit.
      Dry run by default; --write applies eligible edits. No --target option.

      ds-loop fix .                 preview eligible edits
      ds-loop fix . --write         apply them
      ds-loop audit .               re-check findings and coverage
`;

const USAGE = `
ds-loop ${pkg.version} — deterministic token checks and post-edit feedback

  Start here:  ds-loop            verdict for this directory, and what to run next
               ds-loop start      the same, spelled out

  ds-loop audit <path> [--target ${KNOWN_TARGETS.join('|')}] [--json] [--out <dir>] [--require-coverage]
                      [--files <a,b>] [--since <ref>] [--min-severity <sev>] [--quiet] [--config <file>]
      Run every deterministic rule against <path>. <path> is a fixture dir
      (has SOURCE.json) or any dir / .css file (live scan of the working tree).
      --files / --since narrow to changed files. Exit 1 on any surviving finding.
      --require-coverage also exits 1 when part of the source could not be read or
      judged, so a green pipeline means "checked and clean" rather than "silent".

  ds-loop sweep <path> [--out <dir>] [--config <file>]
      Sweep the CIEDE2000 ΔE cutoff across the configured range. Full curve.

  ds-loop scan  <path> [--config <file>]
      Quick look: taxonomy breakdown + palette clusters at the default ΔE.

  ds-loop guard <on|off|status>
      Install / remove a PostToolUse hook in ./.claude/settings.json that runs
      \`ds-loop audit\` on the file after any Edit/Write to a style file and
      surfaces high-severity findings. Preserves other hooks.

  ds-loop context [<path>] [--write-contract]
      What this session is working with: which config loaded, whether the project
      declares a design system, which adapters recognise the tree. No analysis.
      --write-contract starts DESIGN-SYSTEM.md from what the adapters measured,
      with the decisions ds-loop cannot read off code left as TODO. Never
      overwrites an existing file.

  ds-loop scorecard [<path>] [--dry-run] [--json]
      Append one row of ratios to .ds-scorecard/history.jsonl and print the change
      since the last row. A delta is only called a delta when the adapters and the
      config match on both sides — otherwise the instrument moved, not the code.

${FIX_USAGE}
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
  if (cmd === '--help' || cmd === '-h' || rest.includes('--help') || rest.includes('-h')) {
    console.log(cmd === 'fix' ? FIX_USAGE : USAGE);
    return;
  }
  if (cmd === 'fix') {
    for (const arg of rest) {
      if (arg.startsWith('--') && arg !== '--write' && arg !== '--config') {
        throw new Error(`fix does not support ${arg}; run ds-loop fix --help`);
      }
    }
  }
  const loaded = loadConfig(flag(rest, 'config'));
  const { config } = loaded;
  const valueFlags = new Set(['--target', '--out', '--files', '--since', '--min-severity', '--config']);
  const positional = rest.filter((a, i) => !a.startsWith('-') && !valueFlags.has(rest[i - 1] ?? ''));

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
        files: has(rest, 'files') ? list(rest, 'files') : undefined,
        since: flag(rest, 'since'),
        minSeverity: flag(rest, 'min-severity') as Severity | undefined,
        quiet: has(rest, 'quiet'),
      });
      if (report.findings.length > 0) process.exitCode = 1;
      // A zero exit says "no findings", never "sufficiently checked". CI that needs
      // the stronger claim asks for it explicitly, because forcing it would fail
      // every repository containing a format no adapter reads yet.
      if (has(rest, 'require-coverage') && !report.coverage.complete) {
        if (!has(rest, 'quiet')) {
          console.error('\n  coverage is incomplete and --require-coverage was set:');
          for (const line of formatCoverage(report.coverage)) console.error(line);
          console.error('');
        }
        process.exitCode = 1;
      }
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
      context(positional[0] ?? '.', loaded, { writeContract: has(rest, 'write-contract') });
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
      if (!positional[0]) throw new Error('fix needs a path: use ds-loop fix . or ds-loop fix --help');
      fix(positional[0], { write: has(rest, 'write'), config });
      break;
    }
    case 'start':
    case undefined: {
      // A reference manual is the wrong answer to "I installed it, now what". The
      // manual is still one flag away, and every other command prints its own
      // handover, so the loop has an entrance instead of a menu.
      const code = overview(positional[0] ?? '.', loaded);
      if (code !== 0) process.exitCode = code;
      break;
    }
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
