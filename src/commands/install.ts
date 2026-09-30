import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { guard } from './guard.ts';

type Agent = 'claude' | 'cursor' | 'codex';
const START = '<!-- ds-loop:start -->';
const END = '<!-- ds-loop:end -->';
const FILES: Record<Agent, string> = {
  claude: 'CLAUDE.md',
  cursor: '.cursor/rules/ds-loop.mdc',
  codex: 'AGENTS.md',
};

// The block is a constant, not a computed path. Resolving the skill from
// `import.meta.url` wrote this machine's absolute checkout path into a file the team
// commits and shares — valid here, broken for every teammate, and different on every
// machine, so a rerun elsewhere rewrote it. Tests compared output against the same
// computed constant, so they agreed with the defect. The install path below is where
// the skill lives after `npm i ds-loop`, on any machine.
export const INSTALL_BLOCK = `${START}
## Design System Loop

Run \`npx ds-loop\` here. It audits this repo's design-system code, prints what it could
and could not check, and names the command to run next.

Agent commands: \`/ds-loop:start\`, \`/ds-loop:diagnose\`, \`/ds-loop:inventory\`,
\`/ds-loop:foundations\`, \`/ds-loop:propose\`, \`/ds-loop:establish\`, \`/ds-loop:transform\`,
\`/ds-loop:component\`, \`/ds-loop:document\`, \`/ds-loop:govern\`, \`/ds-loop:drift\`,
and \`/ds-loop:prove\`. These guide your agent using the existing CLI commands.
Command instructions: \`node_modules/ds-loop/skill/commands/\`

Playbooks and roles: \`node_modules/ds-loop/skill/SKILL.md\`
${END}`;

function withBlock(original: string): string {
  const starts = original.split(START).length - 1;
  const ends = original.split(END).length - 1;
  if (starts === 0 && ends === 0) {
    return `${original}${original && !original.endsWith('\n') ? '\n' : ''}${INSTALL_BLOCK}\n`;
  }
  const start = original.indexOf(START);
  const end = original.indexOf(END);
  if (starts !== 1 || ends !== 1 || end < start) {
    throw new Error('Ambiguous ds-loop markers; repair the marked block before installing.');
  }
  return original.slice(0, start) + INSTALL_BLOCK + original.slice(end + END.length);
}

export function install(opts: { agent?: string; dryRun?: boolean; guard?: boolean } = {}): void {
  if (opts.agent !== undefined && !['claude', 'cursor', 'codex', 'all'].includes(opts.agent)) {
    throw new Error('--agent must be claude, cursor, codex or all');
  }
  const signals: [Agent, string, boolean][] = [
    ['claude', '.claude', true],
    ['cursor', '.cursor', true],
    ['codex', 'AGENTS.md', false],
    ['codex', '.codex', true],
  ];
  const found = signals.filter(([, path, directory]) => {
    if (!existsSync(path)) return false;
    const stat = statSync(path);
    return directory ? stat.isDirectory() : stat.isFile();
  });
  console.log(`  ds-loop install: detected ${found.map(([, path]) => path).join(', ') || 'no agents'}.`);
  const agents: Agent[] =
    opts.agent === 'all'
      ? ['claude', 'cursor', 'codex']
      : opts.agent
        ? [opts.agent as Agent]
        : [...new Set(found.map(([agent]) => agent))];
  if (agents.length === 0) {
    // A plain repository is the ordinary first run, not an error: nobody has a
    // `.claude/` directory before they have a reason for one. Naming the exact
    // commands turns the dead end into a choice; guessing an agent and writing
    // to someone's repository on that guess is the thing this command must not do.
    console.log('  No agent detected, so nothing was written. Pick the one you use:');
    for (const [agent, path] of Object.entries(FILES))
      console.log(`    ds-loop install --agent ${agent.padEnd(6)}   writes ${path}`);
    return;
  }
  console.log(`  Selected agents: ${agents.join(', ')}${opts.agent ? ' (explicit --agent)' : ''}.`);
  // Plan every reference before changing any file; malformed markers must not
  // leave an earlier agent half-installed.
  const plans = agents.map((agent) => {
    const path = FILES[agent];
    const original = existsSync(path) ? readFileSync(path, 'utf8') : '';
    return { path, original, updated: withBlock(original) };
  });
  for (const plan of plans) {
    console.log(
      `\n  ${plan.path}: ${plan.original === plan.updated ? 'unchanged' : opts.dryRun ? 'would write' : 'will write'}`,
    );
    console.log(INSTALL_BLOCK);
  }
  if (!opts.dryRun) {
    for (const plan of plans) {
      if (plan.original === plan.updated) continue;
      mkdirSync(dirname(join(process.cwd(), plan.path)), { recursive: true });
      writeFileSync(plan.path, plan.updated);
    }
  }
  if (opts.guard) guard('on', { dryRun: opts.dryRun });
  else console.log('\n  ds-loop guard on is available for post-edit feedback; install it with --guard.');
}
