#!/usr/bin/env node
/**
 * ds-loop guard hook (PostToolUse).
 *
 * Reads the Claude Code hook payload from stdin, and if the edited file is a
 * style file, runs `ds-loop audit` scoped to that one file. High-severity
 * findings are printed to stderr with exit code 2 so the agent sees them as
 * feedback. Anything below `high`, or a clean result, exits 0 silently — the
 * hook must be quiet on every ordinary save.
 *
 * It never blocks: a PostToolUse hook fires after the edit already landed.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// go through the launcher, not the TypeScript directly: in a published install
// the CLI is dist/cli.js, and Node cannot type-strip under node_modules.
const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/ds-loop.mjs');
const STYLE = /\.(css|scss|sass|jsx|tsx)$/i;

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

const payload = readStdin();
const filePath =
  payload?.tool_input?.file_path ?? payload?.tool_input?.path ?? payload?.tool_response?.filePath ?? '';
const cwd = payload?.cwd ?? process.cwd();

if (!filePath || !STYLE.test(filePath)) process.exit(0);

const res = spawnSync(
  process.execPath,
  [CLI, 'audit', cwd, '--files', filePath, '--min-severity', 'high', '--quiet', '--json'],
  { encoding: 'utf8', cwd, timeout: 15_000 },
);

const out = (res.stdout || '').trim();
if (!out) process.exit(0);

let report;
try {
  report = JSON.parse(out);
} catch {
  process.exit(0);
}

const findings = report.findings ?? [];
const coverage = report.coverage ?? null;

/**
 * Coverage notification policy, decided explicitly.
 *
 * Three channels, three jobs:
 *   session setup  `ds-loop context` states the scope limits once, before work.
 *   this hook       reports a coverage CHANGE once — never after every edit.
 *   CI              `audit --require-coverage` makes a green pipeline mean
 *                   "checked and clean" instead of "silent".
 *
 * The hook runs at --min-severity high, which legitimately hides low findings. It
 * must not also hide the fact that part of the source could not be read or judged —
 * but repeating that on every save would train the agent to ignore this channel,
 * which is worse than saying it once. So: signature in, signature compared, report
 * only on first sight or change.
 */
const STATE = 'node_modules/.cache/ds-loop/guard-coverage.json';

function coverageSignature(c) {
  if (!c) return null;
  return JSON.stringify({
    unread: c.unreadFormats ?? {},
    tokenFiles: (c.unreadTokenFiles ?? []).length,
    unconvertible: c.unconvertible?.count ?? 0,
    couldNotJudge: (c.couldNotJudge ?? []).slice().sort(),
  });
}

function coverageChanged(signature) {
  if (!signature) return false;
  const path = resolve(cwd, STATE);
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(path, 'utf8')).signature ?? null;
  } catch {
    /* first run in this checkout */
  }
  if (previous === signature) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ signature, at: new Date().toISOString() }, null, 2)}\n`);
  } catch {
    /* unwritable cache: report this time rather than going silent */
  }
  return true;
}

const notes = [];
if (coverage && !coverage.complete && coverageChanged(coverageSignature(coverage))) {
  const unread = Object.entries(coverage.unreadFormats ?? {});
  const parts = [];
  if (unread.length > 0) parts.push(`${unread.map(([e, n]) => `${n}× ${e}`).join(', ')} unread`);
  if (coverage.unconvertible?.count) parts.push(`${coverage.unconvertible.count} colour(s) unconvertible`);
  if ((coverage.couldNotJudge ?? []).length > 0)
    parts.push(`${coverage.couldNotJudge.join(', ')} could not judge`);
  notes.push(
    `ds-loop coverage — this project is only partly checked: ${parts.join('; ')}.\n` +
      'A clean result from here is clean within that scope. Said once; run `ds-loop context` for the full picture.',
  );
}

if (findings.length === 0) {
  if (notes.length > 0) {
    process.stderr.write(`${notes.join('\n\n')}\n`);
    process.exit(2);
  }
  process.exit(0);
}

const lines = findings.map(
  (f) => `  • [${String(f.severity).toUpperCase()}] ${f.summary}\n    ${f.where}\n    fix: ${f.fix}`,
);
process.stderr.write(
  `ds-loop guard — the edit to ${filePath.split('/').pop()} introduced ${findings.length} design-system issue(s):\n\n${lines.join('\n\n')}\n` +
    (notes.length > 0 ? `\n${notes.join('\n\n')}\n` : ''),
);
process.exit(2);
