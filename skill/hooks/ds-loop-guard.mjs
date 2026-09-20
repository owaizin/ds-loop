#!/usr/bin/env node
/**
 * ds-loop guard hook (PostToolUse).
 *
 * Reads the Claude Code hook payload from stdin, and if the edited file is a
 * style file, runs `ds-loop audit` scoped to that one file. High-severity
 * findings are printed to stderr with exit code 2 so the agent sees them as
 * feedback. Lower findings are filtered. Audit failures and new project coverage
 * gaps are reported separately; an ordinary checked save exits 0 silently.
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
  // No --quiet: it suppresses the whole report when nothing survives the severity
  // floor, which is exactly when the coverage notice is the only thing left to say.
  // Always take the structured report; this hook decides what to announce.
  [CLI, 'audit', cwd, '--files', filePath, '--min-severity', 'high', '--json'],
  { encoding: 'utf8', cwd, timeout: 15_000 },
);

const out = (res.stdout || '').trim();

function reportUnavailable(reason) {
  process.stderr.write(
    `ds-loop guard — this edit was not checked: ${reason}\nResolve the error, then run an unfiltered ds-loop audit before relying on the result.\n`,
  );
  process.exit(2);
}

if (res.error || res.signal) {
  reportUnavailable(res.error?.message ?? `audit terminated by ${res.signal}`);
}
if (!out) reportUnavailable(res.stderr?.trim() || `audit returned no report (exit ${res.status})`);

let report;
try {
  report = JSON.parse(out);
} catch {
  reportUnavailable('audit returned invalid JSON');
}

if (
  !report ||
  !Array.isArray(report.findings) ||
  !report.coverage ||
  !['clean', 'issues', 'not-checked'].includes(report.verdict)
) {
  reportUnavailable('audit returned an incomplete report');
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

/**
 * PROJECT-scoped coverage only.
 *
 * This hook audits one edited file, so `unconvertible` and `couldNotJudge` describe
 * that file, not the project — keying the signature on them makes alternating edits
 * between two files look like coverage changing back and forth. Formats nothing
 * reads and unread token files are properties of the tree and stable across edits,
 * so they are what this channel reports. Per-file judgement limits below the severity floor require an unfiltered
 * `ds-loop audit .`; `context` runs no rules.
 */
function coverageSignature(c) {
  if (!c) return 'unknown';
  const unread = Object.entries(c.unreadFormats ?? {})
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ext, n]) => `${ext}:${n}`);
  const tokenFiles = (c.unreadTokenFiles ?? []).slice().sort();
  if (unread.length === 0 && tokenFiles.length === 0) return 'complete';
  return JSON.stringify({ unread, tokenFiles });
}

/**
 * Every observed state is recorded, including a complete one. Writing only while
 * incomplete meant a recovery never replaced the old signature, so
 * incomplete -> complete -> the same incomplete state again stayed silent the
 * second time.
 */
function transitionNeedsNotice(signature) {
  const path = resolve(cwd, STATE);
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(path, 'utf8')).signature ?? null;
  } catch {
    /* first run in this checkout */
  }

  if (previous !== signature) {
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify({ signature, at: new Date().toISOString() }, null, 2)}\n`);
    } catch {
      /* unwritable cache: announce this time rather than going silent */
    }
  }

  // announce only when the project's coverage state is newly not-complete
  return previous !== signature && signature !== 'complete' && signature !== 'unknown';
}

const notes = [];
if (coverage && transitionNeedsNotice(coverageSignature(coverage))) {
  const parts = [];
  const unread = Object.entries(coverage.unreadFormats ?? {});
  if (unread.length > 0) parts.push(`${unread.map(([e, n]) => `${n}× ${e}`).join(', ')} unread`);
  const tokenFiles = coverage.unreadTokenFiles ?? [];
  if (tokenFiles.length > 0) parts.push(`${tokenFiles.length} design-token file(s) unread`);
  notes.push(
    `ds-loop coverage — this project is only partly checked: ${parts.join('; ')}.\nA clean result from here is clean within that scope. Said once, on change; run\n\`ds-loop audit .\` unfiltered for rule-judgement limits.`,
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
  `ds-loop guard — the edit to ${filePath.split('/').pop()} has ${findings.length} design-system finding(s):\n\n${lines.join('\n\n')}\n${notes.length > 0 ? `\n${notes.join('\n\n')}\n` : ''}`,
);
process.exit(2);
