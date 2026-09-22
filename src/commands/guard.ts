import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chip, rail, railStep } from '../core/ansi.ts';

/**
 * `guard on` installs a PostToolUse hook in the project's .claude/settings.json.
 * After any Edit/Write to a style file, the hook runs `ds-loop audit` scoped to
 * that file and surfaces high-severity findings back to the agent. Other hooks
 * in the file are left untouched.
 *
 * Deterministic checks nag; they never block. A PostToolUse hook cannot undo the
 * edit anyway — it just adds a note.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HOOK_SCRIPT = join(REPO_ROOT, 'skill', 'hooks', 'ds-loop-guard.mjs');
const HOOK_COMMAND = `node ${JSON.stringify(HOOK_SCRIPT)}`;
const MATCHER = 'Edit|Write|MultiEdit';

type HookEntry = { type: string; command: string };
type Matcher = { matcher?: string; hooks: HookEntry[] };
type Settings = { hooks?: Record<string, Matcher[]> } & Record<string, unknown>;

function settingsPath(): string {
  return join(process.cwd(), '.claude', 'settings.json');
}

function readSettings(): Settings {
  const p = settingsPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Settings;
  } catch {
    throw new Error(`${p} is not valid JSON — fix it by hand before running guard`);
  }
}

function isOurs(h: HookEntry): boolean {
  return h.command.includes('ds-loop-guard.mjs');
}

export function guard(action: 'on' | 'off' | 'status'): void {
  const p = settingsPath();
  const settings = readSettings();
  const postToolUse = settings.hooks?.PostToolUse ?? [];
  const installed = postToolUse.some((m) => m.hooks?.some(isOurs));

  const say = (lines: string[]) => {
    for (const line of lines) console.log(line);
  };

  if (action === 'status') {
    console.log(`\n  ${chip('ds-loop guard')}`);
    say(railStep('settings', `${p}${existsSync(p) ? '' : ' (does not exist yet)'}`));
    say(railStep(`installed: ${installed ? 'yes' : 'no'}`, installed ? HOOK_COMMAND : undefined));
    console.log(`  ${rail.close()}\n`);
    return;
  }

  if (action === 'off') {
    if (!installed) {
      console.log('  ds-loop guard: not installed, nothing to remove.');
      return;
    }
    const cleaned = postToolUse
      .map((m) => ({ ...m, hooks: m.hooks.filter((h) => !isOurs(h)) }))
      .filter((m) => m.hooks.length > 0);
    // rebuild without PostToolUse, then put it back only if anything survived —
    // an empty `"PostToolUse": []` left behind is noise in someone's settings
    const { PostToolUse: _removed, ...otherEvents } = settings.hooks ?? {};
    settings.hooks = cleaned.length > 0 ? { ...otherEvents, PostToolUse: cleaned } : otherEvents;
    write(settings);
    console.log('  ds-loop guard: removed. Other hooks left in place.');
    return;
  }

  // action === 'on'
  if (installed) {
    console.log('  ds-loop guard: already installed. `guard off` to remove.');
    return;
  }
  const entry: Matcher = { matcher: MATCHER, hooks: [{ type: 'command', command: HOOK_COMMAND }] };
  settings.hooks = { ...settings.hooks, PostToolUse: [...postToolUse, entry] };
  write(settings);
  console.log(`\n  ${chip('ds-loop guard')}`);
  say(railStep('Hook installed', p));
  say(
    railStep(
      'Reports high-severity findings after an Edit/Write to a .css / .jsx / .tsx file',
      'It never blocks the edit.',
    ),
  );
  say(railStep('Restart the agent session for the hook to take effect'));
  console.log(`  ${rail.close()}\n`);
}

function write(settings: Settings): void {
  const dir = join(process.cwd(), '.claude');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`);
}
