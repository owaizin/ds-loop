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

/**
 * Which lines of this file the working tree changed against HEAD.
 *
 * Without this the hook reports every high finding in the edited file, so
 * touching one line of a legacy stylesheet returns its pre-existing debt as
 * though this edit caused it. That trains a reader to ignore the hook, and it
 * invites an agent to widen a small task into a cleanup nobody asked for.
 *
 * Returns null — meaning "cannot attribute" — for an untracked file, outside a
 * repository, or any git failure. A wrong attribution is worse than none.
 */
function changedLineRanges(file, dir) {
  try {
    const r = spawnSync('git', ['diff', '-U0', 'HEAD', '--', file], {
      encoding: 'utf8',
      cwd: dir,
      timeout: 5_000,
    });
    if (r.error || r.status !== 0 || typeof r.stdout !== 'string') return null;
    // an edit that git reports no diff for is already committed; nothing is new
    const ranges = [];
    for (const m of r.stdout.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      if (count > 0) ranges.push([start, start + count - 1]);
    }
    return ranges;
  } catch {
    return null;
  }
}

/**
 * `where` is a formatted string — a token name, a `file:line`, or a count — so
 * a line is available for some findings and not others. No line means the
 * attribution is unknown, which is said rather than guessed.
 */
function attribute(finding, ranges) {
  if (ranges === null) return 'unknown';
  const lines = [...String(finding.where ?? '').matchAll(/:(\d+)\b/g)].map((m) => Number(m[1]));
  if (lines.length === 0) return 'unknown';
  const touched = lines.filter((l) => ranges.some(([a, b]) => l >= a && l <= b));
  if (touched.length === 0) return 'pre-existing';
  // Most rules count several values into one finding, so a mixed finding is the
  // normal case, not an edge. Calling it `new` would report a mostly-legacy
  // finding as freshly caused — the same cry-wolf failure at smaller scale.
  // ponytail: attribution is per finding, not per value inside it; per-value
  // needs a structured line on Finding rather than parsing `where`.
  return touched.length === lines.length ? 'new' : 'partly new';
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

const ranges = changedLineRanges(filePath, cwd);
const tagged = findings.map((f) => ({ f, basis: attribute(f, ranges) }));

const lines = tagged.map(
  ({ f, basis }) =>
    `  • [${String(f.severity).toUpperCase()}] [${basis}] ${f.summary}\n    ${f.where}\n    fix: ${f.fix}`,
);

// A label with no instruction is decoration: state what each basis licenses.
const bases = new Set(tagged.map((t) => t.basis));
if (bases.has('pre-existing')) {
  notes.push(
    'ds-loop attribution — [pre-existing] findings sit on lines this edit did not\ntouch. Report them; do not treat them as regressions of this change, and do not\nwiden the task to repair them without asking.',
  );
}
if (bases.has('partly new')) {
  notes.push(
    'ds-loop attribution — [partly new] counts values from lines this edit touched\nand lines it did not. Repair what this change introduced; the rest is existing\nwork to raise, not to absorb.',
  );
}
if (bases.has('unknown')) {
  notes.push(
    'ds-loop attribution — [unknown] means this finding names no line, or the file\nis untracked, so it may predate this session. Treat it as pre-existing until\nchecked.',
  );
}

process.stderr.write(
  `ds-loop guard — the edit to ${filePath.split('/').pop()} has ${findings.length} design-system finding(s):\n\n${lines.join('\n\n')}\n${notes.length > 0 ? `\n${notes.join('\n\n')}\n` : ''}`,
);
process.exit(2);
