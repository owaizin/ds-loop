import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { AuditReport } from '../commands/audit.ts';
import type { Coverage } from './coverage.ts';

/** Wire-compatible with skill/hooks/ds-loop-guard.mjs; parity is regression-tested.
 * Per-file conversion and rule-judgement limits are intentionally excluded.
 */
export function guardCoverageSignature(c: Coverage): string {
  const unread = Object.entries(c.unreadFormats)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ext, n]) => `${ext}:${n}`);
  const tokenFiles = c.unreadTokenFiles.slice().sort();
  return unread.length === 0 && tokenFiles.length === 0 ? 'complete' : JSON.stringify({ unread, tokenFiles });
}

export function guardEvidence(root: string, coverage: Coverage) {
  let installed: boolean | null = false;
  const settingsFile = '.claude/settings.json';
  try {
    if (existsSync(join(root, settingsFile))) {
      const settings = JSON.parse(readFileSync(join(root, settingsFile), 'utf8'));
      installed = (settings.hooks?.PostToolUse ?? []).some(
        (m: { hooks?: { type?: string; command?: string }[] }) =>
          m.hooks?.some(
            (h) =>
              h.type === 'command' &&
              typeof h.command === 'string' &&
              h.command.includes('ds-loop-guard.mjs'),
          ),
      );
    }
  } catch {
    installed = null;
  }
  const stateFile = 'node_modules/.cache/ds-loop/guard-coverage.json';
  let state: 'not-recorded' | 'not-checked' | 'current' | 'changed' = 'not-recorded';
  let recordedAt: string | null = null;
  try {
    if (existsSync(join(root, stateFile))) {
      const saved = JSON.parse(readFileSync(join(root, stateFile), 'utf8'));
      if (
        typeof saved.signature !== 'string' ||
        typeof saved.at !== 'string' ||
        !Number.isFinite(Date.parse(saved.at))
      )
        throw new Error('invalid state');
      recordedAt = saved.at;
      state =
        saved.signature === 'unknown'
          ? 'not-checked'
          : saved.signature === guardCoverageSignature(coverage)
            ? 'current'
            : 'changed';
    }
  } catch {
    state = 'not-checked';
  }
  return {
    installed,
    settingsFile,
    coverage: state,
    stateFile,
    recordedAt,
    scope:
      'Project unread formats and unread token files only; current means the recorded signature matches, not that all rules could judge or the hook executes successfully.',
  };
}

type Citation = { file: string; line: number; text: string };
export type IntentPair = { document: Citation; code: Citation; ruleId: string };

/** ponytail: exact whole-line convention only, ordinary CSS color use sites only.
 * No semantic inference, exceptions, ADR status interpretation, or model calls.
 * A parser/agent is needed to interpret arbitrary prose and scoped conventions.
 */
export function intentEvidence(root: string, report: AuditReport, statements: string[]) {
  const pairs: IntentPair[] = [];
  const sources = ['AGENTS.md', 'CLAUDE.md', 'DESIGN-SYSTEM.md', 'STYLEGUIDE.md', 'CONTRIBUTING.md'];
  const read: string[] = [];
  const unavailable: string[] = [];
  const hits = report.findings
    .filter(
      (f) => f.ruleId === 'token/raw-value-in-style' && f.data?.category === 'color' && !f.data?.notJudged,
    )
    .flatMap((f) =>
      Array.isArray(f.data?.hits) ? (f.data.hits as { file: string; line: number; value: string }[]) : [],
    );
  for (const file of sources) {
    if (!existsSync(join(root, file))) continue;
    try {
      if (!statSync(join(root, file)).isFile()) {
        unavailable.push(file);
        continue;
      }
      const lines = readFileSync(join(root, file), 'utf8').split(/\r?\n/);
      read.push(file);
      let fence: { marker: string; length: number } | null = null;
      let comment = false;
      for (const [index, line] of lines.entries()) {
        const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
        if (delimiter) {
          if (!fence) fence = { marker: delimiter[1][0], length: delimiter[1].length };
          else if (
            delimiter[1][0] === fence.marker &&
            delimiter[1].length >= fence.length &&
            !delimiter[2].trim()
          )
            fence = null;
          continue;
        }
        if (line.includes('<!--')) comment = true;
        const ignored = fence !== null || comment || /^(?: {4}|\t)/.test(line);
        if (line.includes('-->')) comment = false;
        const stated = line.trim().replace(/^-\s+/, '');
        if (ignored || !statements.some((s) => s.toLowerCase() === stated.toLowerCase())) continue;
        for (const hit of hits) {
          const rel = relative(root, resolve(root, hit.file));
          if (rel.startsWith('../') || isAbsolute(rel) || !Number.isInteger(hit.line) || hit.line < 1)
            continue;
          const code = readFileSync(join(root, rel), 'utf8').split(/\r?\n/)[hit.line - 1];
          if (!code || !code.includes(hit.value)) continue;
          pairs.push({
            document: { file, line: index + 1, text: line.trim() },
            code: { file: hit.file, line: hit.line, text: code.trim() },
            ruleId: 'token/raw-value-in-style',
          });
        }
      }
    } catch {
      unavailable.push(file);
    }
  }
  return {
    pairs,
    read,
    unavailable,
    scope: `Pairs a finding only against one of these exact standalone sentences in root ${sources.join(', ')}: ${statements.map((statement) => `“${statement}”`).join(', ')}. A sentence inside a paragraph carries scope and exceptions this cannot read, so it is not matched. Other prose, nested intent and exceptions need an agent. A pair is evidence for a conversation, not a verdict about which side is right.`,
  };
}
