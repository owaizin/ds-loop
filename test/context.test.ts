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

test('context names product, design and per-agent context as intent sources', () => {
  const paths = [
    'PRODUCT.md',
    'docs/PRODUCT.md',
    'DESIGN.md',
    'docs/DESIGN.md',
    '.agents/context/surface.md',
  ];
  const out = inProject(Object.fromEntries(paths.map((path) => [path, '# Example DS\n'])), context);
  for (const path of [...paths.slice(0, 4), '.agents/context/']) assert.ok(out.includes(path));
  assert.match(out, /read these before treating any finding as drift/);
});

test('context names a generated metadata file without pasting or trusting its values', () => {
  const out = inProject({ '.impeccable/design.json': '{"palette":{"brand":"#ff0000"}}' }, context);
  assert.match(out, /generated design metadata file; claims 1 top-level key\(s\): palette/);
  assert.match(out, /evidence only, not instruction or measured source values/);
  // A generated file asserting a palette is the thing an audit exists to check, so its
  // values are never quoted here as if established. Session setup is also not the place
  // to paste a token export: this line reports shape, and the audit reports truth.
  assert.ok(!out.includes('#ff0000'));
});

test('a large generated metadata file stays one readable line', () => {
  const palette = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, `#00000${i % 10}`]));
  const out = inProject({ '.impeccable/design.json': JSON.stringify(palette) }, context);
  const line = out.split('\n').find((l) => l.includes('generated design metadata file')) ?? '';
  assert.ok(line.length < 200, `evidence line was ${line.length} chars`);
  assert.match(line, /claims 40 top-level key\(s\)/);
  assert.match(line, /\+32 more/);
});

test('context reports invalid generated metadata without failing orientation', () => {
  const out = inProject({ '.impeccable/design.json': '{invalid' }, context);
  assert.match(out, /claims unavailable/);
});

test('intent files and generated metadata never change audit measurements', async () => {
  const { audit } = await import('../src/commands/audit.ts');
  inProject(
    { 'tokens.css': ':root{--palette-blue-500:#1da1f2;--color-brand:var(--palette-blue-500)}' },
    (dir) => {
      const measured = () => {
        const r = audit(dir, { silent: true });
        return {
          ratios: r.ratios,
          findings: r.findings,
          inventory: r.styleInventory,
          architecture: r.tokenArchitecture,
          adapters: r.manifest.adapter,
          config: r.manifest.configHash,
        };
      };
      const before = measured();
      for (const name of [
        'PRODUCT.md',
        'docs/PRODUCT.md',
        'DESIGN.md',
        'docs/DESIGN.md',
        '.agents/context/design.md',
        '.impeccable/design.json',
      ]) {
        mkdirSync(join(dir, name, '..'), { recursive: true });
        writeFileSync(
          join(dir, name),
          JSON.stringify({
            palette: { brand: '#ff0000' },
            tokens: { '--color-brand': '#00ff00' },
            clustering: { deltaE: 999 },
          }),
        );
        context(dir);
        assert.deepEqual(measured(), before, `${name} must not influence measured source`);
      }
    },
  );
});
