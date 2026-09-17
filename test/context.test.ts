import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * `context` has one job that matters: say what declares this system's intent, so a
 * finding can be judged as drift rather than as a convention nobody wrote down.
 *
 * It failed that job on a real checkout. A drawer pilot spent three paragraphs
 * arguing that a radius convention might not exist, while the repository's own
 * AGENTS.md said "strict scale — no others allowed" and named the exact utilities
 * never to use. `context` reported only `docs/decisions/`, because agent
 * instruction files were not in the list it searched — which in 2026 is the first
 * place a team writes the rule an agent is about to break.
 */

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.ts');

function context(dir: string): string {
  return execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', CLI, 'context', '.'],
    {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
}

function inProject<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-context-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('context finds intent in agent instruction files', () => {
  const out = inProject(
    {
      'tokens.css': ':root{--palette-blue-500:#1da1f2;}\n',
      'AGENTS.md': '# Rules\n\n**Never** use `rounded-lg`. Strict scale: 0/2/4/8/999px.\n',
    },
    context,
  );
  assert.match(out, /declared\s+AGENTS\.md/, 'AGENTS.md is where an agent-facing rule lives');
  assert.doesNotMatch(out, /none found/);
});

test('context lists every intent source it finds, files and directories together', () => {
  const out = inProject(
    {
      'tokens.css': ':root{--palette-blue-500:#1da1f2;}\n',
      'AGENTS.md': '# a\n',
      'CLAUDE.md': '# b\n',
      '.cursorrules': 'no rounded-lg\n',
      'docs/decisions/0001-radius.md': '# decided\n',
      'CONTRIBUTING.md': '# c\n',
    },
    context,
  );
  for (const expected of ['AGENTS.md', 'CLAUDE.md', '.cursorrules', 'docs/decisions/', 'CONTRIBUTING.md']) {
    assert.ok(out.includes(expected), `context should list ${expected}`);
  }
});

test('context does not claim absence of conventions when it finds no file', () => {
  const out = inProject({ 'tokens.css': ':root{--brand:#1da1f2;}\n' }, context);
  assert.match(out, /none found in \d+ usual places/);
  // the overclaim this replaced: "nothing states what this system intends"
  assert.match(out, /not the same as "this team has no conventions"/);
  assert.match(out, /a convention you\s+have not found is not a convention that does not exist/);
});

test('context names the unfiltered audit as the only channel for judgement limits', () => {
  // the hook filters at high severity and context runs no rules, so nothing else
  // will tell the agent which checks could not judge this source
  const out = inProject({ 'tokens.css': ':root{--brand:#1da1f2;--accent:var(--brand)}\n' }, context);
  assert.match(out, /not covered here/);
  assert.match(out, /audit \. --json` unfiltered/);
});
