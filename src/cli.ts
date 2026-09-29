#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from './commands/audit.ts';
import { consumers } from './commands/consumers.ts';
import { context } from './commands/context.ts';
import { dashboard } from './commands/dashboard.ts';
import { decide } from './commands/decide.ts';
import { fix } from './commands/fix.ts';
import { guard } from './commands/guard.ts';
import { impact } from './commands/impact.ts';
import { install } from './commands/install.ts';
import { overview } from './commands/overview.ts';
import { report } from './commands/report.ts';
import { scan } from './commands/scan.ts';
import { scorecard } from './commands/scorecard.ts';
import { sweep } from './commands/sweep.ts';
import { loadConfig } from './config/load.ts';
import { formatCoverage } from './core/coverage.ts';
import { writeAuditHtml } from './core/report-html.ts';
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

  dashboard [path] [--out <file.html>] [--against products|systems]
      Save today’s state and saved trends (default: ds-loop-dashboard.html).

  report [path] [--consult <file.json>] [--out <file.html>] [--against products|systems]
      Save a self-contained consulting report (default: ds-loop-report.html).

  Start here:  ds-loop            read this directory, save a first report, and name the next step
               ds-loop start      the same, spelled out

  ds-loop install [--agent claude|cursor|codex|all] [--dry-run] [--guard]
      Detect agents and append a companion skill reference to their project instructions.
      Preview exact blocks with --dry-run; --guard opts into Claude post-edit feedback.

  Orient yourself

  ds-loop context [<path>] [--write-contract]
      What this session is working with: which config loaded, whether the project
      declares a design system, which adapters recognise the tree. No analysis.
      --write-contract starts DESIGN-SYSTEM.md from what the adapters measured,
      with the decisions ds-loop cannot read off code left as TODO. Never
      overwrites an existing file.

  Inspect code and component usage

  ds-loop audit <path> [--target ${KNOWN_TARGETS.join('|')}] [--json] [--all] [--out <dir>] [--html <file>] [--require-coverage]
                      [--files <a,b>] [--since <ref>] [--min-severity <sev>] [--quiet] [--config <file>]
      Run every deterministic rule against <path>. <path> is a fixture dir
      (has SOURCE.json) or any dir / .css file (live scan of the working tree).
      --files / --since narrow to changed files. Exit 1 on any surviving finding.
      --all prints full finding details; the default is a summary.
      --html <file> writes a self-contained visual report of this same audit.
      Reads scorecard history from cwd; does not append a row. Exit status is unchanged.
      --require-coverage also exits 1 when part of the source could not be read or
      judged, so a green pipeline means "checked and clean" rather than "silent".

  ds-loop impact <package/subpath|Export|package#Export> [path] [--json]
      Locate every direct static import; separate production from stories/tests.
      No static import found is never a deletion-safety claim.

  ds-loop decide [path] --decision <text> --alternatives <text> --evidence <refs> --owner <name>
      Append a Markdown record in docs/decisions/. Evidence refs are comma-separated.
      Optional: --date YYYY-MM-DD --status accepted|proposed --problem <text>
      --consequences <text> --reconsider <text> --json

  ds-loop consumers [<path>] [--scope <@org>] [--json] [--html <file>]
      Which workspace package imports which shared package: specifiers, named
      imports, counts and file:line samples; stories and tests counted apart.
      Also lists exported subpaths no other package imports in production code.
      --html <file> writes the same map as a self-contained architecture diagram.

  Compare measurements

  ds-loop scan  <path> [--config <file>]
      Quick look: taxonomy breakdown + palette clusters at the default ΔE.

  ds-loop sweep <path> [--out <dir>] [--config <file>]
      Sweep the CIEDE2000 ΔE cutoff across the configured range. Full curve.

  ds-loop scorecard [<path>] [--dry-run] [--json]
      Append one row of ratios to .ds-scorecard/history.jsonl and print the change
      since the last row. A delta is only called a delta when the adapters and the
      config match on both sides — otherwise the instrument moved, not the code.

  Add edit feedback or preview a fix

  ds-loop guard <on|off|status>
      Install / remove a PostToolUse hook in ./.claude/settings.json that runs
      \`ds-loop audit\` on the file after any Edit/Write to a style file and
      surfaces high-severity findings. Preserves other hooks.

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
  if (cmd === 'install') {
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === '--agent') {
        if (!rest[i + 1] || rest[i + 1].startsWith('-')) throw new Error('--agent needs a value');
        i++;
      } else if (arg !== '--dry-run' && arg !== '--guard') {
        throw new Error(`install does not support ${arg}; run ds-loop install --help`);
      }
    }
    install({ agent: flag(rest, 'agent'), dryRun: has(rest, 'dry-run'), guard: has(rest, 'guard') });
    return;
  }
  const loaded = loadConfig(flag(rest, 'config'));
  const { config } = loaded;
  const valueFlags = new Set([
    '--decision',
    '--alternatives',
    '--evidence',
    '--owner',
    '--date',
    '--status',
    '--problem',
    '--consequences',
    '--reconsider',
    '--target',
    '--out',
    '--html',
    '--files',
    '--since',
    '--min-severity',
    '--config',
    '--scope',
    '--consult',
    '--against',
  ]);
  const positional = rest.filter((a, i) => !a.startsWith('-') && !valueFlags.has(rest[i - 1] ?? ''));

  const against = flag(rest, 'against');
  if ((has(rest, 'against') || against !== undefined) && against !== 'products' && against !== 'systems')
    throw new Error('--against must be products or systems');
  if (has(rest, 'against') && cmd !== 'report' && cmd !== 'dashboard')
    throw new Error('--against is supported by report and dashboard');
  const referenceOverride = against === 'products' || against === 'systems' ? against : undefined;
  switch (cmd) {
    case 'impact': {
      impact(positional[0] ?? '', positional[1] ?? '.', { json: has(rest, 'json') });
      break;
    }
    case 'decide': {
      const required = (name: string) => {
        const value = flag(rest, name);
        if (!value || value.startsWith('--')) throw new Error(`--${name} needs a value`);
        return value;
      };
      for (const name of ['date', 'status', 'problem', 'consequences', 'reconsider'])
        if (has(rest, name)) required(name);
      const file = decide(positional[0] ?? '.', {
        decision: required('decision'),
        alternatives: required('alternatives'),
        evidence: required('evidence')
          .split(',')
          .map((s) => s.trim()),
        owner: required('owner'),
        date: flag(rest, 'date'),
        status: flag(rest, 'status') as 'accepted' | 'proposed' | undefined,
        problem: flag(rest, 'problem'),
        consequences: flag(rest, 'consequences'),
        reconsider: flag(rest, 'reconsider'),
      });
      console.log(has(rest, 'json') ? JSON.stringify({ file }) : `Decision recorded: ${file}`);
      break;
    }
    case 'dashboard': {
      if (has(rest, 'out') && (!flag(rest, 'out') || flag(rest, 'out')!.startsWith('-')))
        throw new Error('--out needs a file path');
      dashboard(positional[0] ?? '.', loaded, {
        against: referenceOverride,
        out: flag(rest, 'out'),
        configPath: flag(rest, 'config'),
      });
      break;
    }
    case 'report': {
      for (const name of ['consult', 'out'])
        if (has(rest, name) && (!flag(rest, name) || flag(rest, name)!.startsWith('-')))
          throw new Error(`--${name} needs a file path`);
      report(positional[0] ?? '.', loaded, {
        against: referenceOverride,
        consult: flag(rest, 'consult'),
        out: flag(rest, 'out'),
      });
      break;
    }
    case 'audit': {
      if (has(rest, 'html') && (!flag(rest, 'html') || flag(rest, 'html')!.startsWith('-'))) {
        throw new Error('--html needs a file path, e.g. --html ds-loop-report.html');
      }
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
        all: has(rest, 'all'),
        outDir: flag(rest, 'out'),
        config,
        severityOverrides: loaded.severityOverrides,
        files: has(rest, 'files') ? list(rest, 'files') : undefined,
        since: flag(rest, 'since'),
        minSeverity: flag(rest, 'min-severity') as Severity | undefined,
        quiet: has(rest, 'quiet'),
      });
      if (has(rest, 'html')) console.error(`  HTML report: ${writeAuditHtml(report, flag(rest, 'html'))}`);
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
    case 'consumers': {
      consumers(positional[0] ?? '.', {
        scope: flag(rest, 'scope'),
        json: has(rest, 'json'),
        html: flag(rest, 'html'),
      });
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
  console.error('  next\n    ds-loop context .   inspect configuration and supported formats\n');
  process.exitCode = 1;
}
