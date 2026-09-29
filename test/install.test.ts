import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { INSTALL_BLOCK } from '../src/commands/install.ts';

const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
function project(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-install-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function run(dir: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', CLI, 'install', ...args],
    {
      cwd: dir,
      encoding: 'utf8',
    },
  );
}
function write(dir: string, path: string, body: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), body);
}
function read(dir: string, path: string) {
  return readFileSync(join(dir, path), 'utf8');
}

test('install dry-run lists the exact block and writes nothing', () =>
  project((dir) => {
    mkdirSync(join(dir, '.claude'));
    const r = run(dir, '--dry-run');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /detected .claude/);
    assert.match(r.stdout, /CLAUDE.md: would write/);
    assert.ok(r.stdout.includes(INSTALL_BLOCK));
    assert.deepEqual(readdirSync(dir), ['.claude']);
    assert.deepEqual(readdirSync(join(dir, '.claude')), []);
  }));

test('install applies the block and a second run leaves every byte identical', () =>
  project((dir) => {
    mkdirSync(join(dir, '.claude'));
    assert.equal(run(dir).status, 0);
    const before = readFileSync(join(dir, 'CLAUDE.md'));
    assert.equal(before.toString(), `${INSTALL_BLOCK}\n`);
    assert.equal(run(dir).status, 0);
    assert.deepEqual(readFileSync(join(dir, 'CLAUDE.md')), before);
    assert.ok(!existsSync(join(dir, '.claude/settings.json')));
  }));

test('install --agent cursor writes only its rule even when Claude is detected', () =>
  project((dir) => {
    write(dir, 'CLAUDE.md', 'Keep this\n');
    mkdirSync(join(dir, '.claude'));
    assert.equal(run(dir, '--agent', 'cursor').status, 0);
    assert.equal(read(dir, '.cursor/rules/ds-loop.mdc'), `${INSTALL_BLOCK}\n`);
    assert.equal(read(dir, 'CLAUDE.md'), 'Keep this\n');
    const before = read(dir, '.cursor/rules/ds-loop.mdc');
    assert.equal(run(dir, '--agent', 'cursor').status, 0);
    assert.equal(read(dir, '.cursor/rules/ds-loop.mdc'), before);
  }));

test('install appends while preserving every original byte of CLAUDE.md', () =>
  project((dir) => {
    const original = '# Team rules\r\n\r\nKeep café and these trailing spaces  ';
    write(dir, 'CLAUDE.md', original);
    assert.equal(run(dir, '--agent', 'claude').status, 0);
    assert.equal(read(dir, 'CLAUDE.md'), `${original}\n${INSTALL_BLOCK}\n`);
  }));

test('install replaces an older block in place and preserves surrounding content', () =>
  project((dir) => {
    const prefix = '# Before\r\n\r\n';
    const suffix = '\r\n\r\n# After  ';
    write(
      dir,
      'AGENTS.md',
      `${prefix}<!-- ds-loop:start -->\nOld instructions\n<!-- ds-loop:end -->${suffix}`,
    );
    assert.equal(run(dir).status, 0);
    assert.equal(read(dir, 'AGENTS.md'), `${prefix}${INSTALL_BLOCK}${suffix}`);
  }));

test('install with no detected agent reports it and writes nothing even with --guard', () =>
  project((dir) => {
    const r = run(dir, '--guard');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /No agent detected; nothing written/);
    assert.deepEqual(readdirSync(dir), []);
  }));

test('install detects all agent signals and writes one Codex reference', () =>
  project((dir) => {
    for (const path of ['.claude', '.cursor', '.codex']) mkdirSync(join(dir, path));
    write(dir, 'AGENTS.md', '# Existing\n');
    const r = run(dir);
    assert.equal(r.status, 0, r.stderr);
    for (const signal of ['.claude', '.cursor', '.codex', 'AGENTS.md']) assert.ok(r.stdout.includes(signal));
    assert.equal(read(dir, 'AGENTS.md'), `# Existing\n${INSTALL_BLOCK}\n`);
    assert.equal(read(dir, 'CLAUDE.md'), `${INSTALL_BLOCK}\n`);
    assert.equal(read(dir, '.cursor/rules/ds-loop.mdc'), `${INSTALL_BLOCK}\n`);
  }));

test('install --agent all explicitly creates all references without detection', () =>
  project((dir) => {
    assert.equal(run(dir, '--agent', 'all').status, 0);
    for (const path of ['CLAUDE.md', 'AGENTS.md', '.cursor/rules/ds-loop.mdc']) {
      assert.equal(read(dir, path), `${INSTALL_BLOCK}\n`);
    }
  }));

test('install --guard previews exact settings, preserves other hooks and is idempotent', () =>
  project((dir) => {
    const original =
      '{"permissions":{"allow":[]},"hooks":{"PostToolUse":[{"matcher":"Read","hooks":[{"type":"command","command":"echo existing"}]}]}}\n';
    write(dir, '.claude/settings.json', original);
    const preview = run(dir, '--guard', '--dry-run');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /settings.json: would write/);
    assert.equal(read(dir, '.claude/settings.json'), original);
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
    assert.equal(run(dir, '--guard').status, 0);
    const settings = read(dir, '.claude/settings.json');
    assert.ok(preview.stdout.includes(settings.trim()));
    const parsed = JSON.parse(settings);
    assert.deepEqual(parsed.permissions, { allow: [] });
    assert.equal(parsed.hooks.PostToolUse[0].hooks[0].command, 'echo existing');
    assert.match(parsed.hooks.PostToolUse[1].hooks[0].command, /ds-loop-guard.mjs/);
    assert.equal(run(dir, '--guard').status, 0);
    assert.equal(read(dir, '.claude/settings.json'), settings);
  }));

test('install rejects malformed markers before writing any reference', () =>
  project((dir) => {
    write(dir, 'AGENTS.md', '<!-- ds-loop:start -->\nIncomplete block\n');
    const r = run(dir, '--agent', 'all');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Ambiguous ds-loop markers/);
    assert.deepEqual(readdirSync(dir), ['AGENTS.md']);
    assert.equal(read(dir, 'AGENTS.md'), '<!-- ds-loop:start -->\nIncomplete block\n');
  }));

test('install rejects invalid arguments without writes and appears in help', () =>
  project((dir) => {
    for (const args of [['--agent'], ['--agent', 'other'], ['--oops'], ['some-path']]) {
      assert.equal(run(dir, ...args).status, 1);
    }
    assert.deepEqual(readdirSync(dir), []);
    assert.match(run(dir, '--help').stdout, /ds-loop install \[--agent claude\|cursor\|codex\|all\]/);
  }));
