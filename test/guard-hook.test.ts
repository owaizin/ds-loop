import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The guard hook's coverage-notification policy, under test.
 *
 * Both failures these cover were shipped and reproduced by a reviewer, not by this
 * suite — the test count did not move when the policy was written, which gave it no
 * protection at all:
 *
 *   1. `--quiet` suppressed the whole report when nothing survived the severity
 *      floor, so the coverage branch was unreachable in the one case it exists for.
 *   2. The cache was written only while coverage was incomplete, so a recovery never
 *      replaced the old signature and `incomplete -> complete -> incomplete` stayed
 *      silent the second time.
 *
 * A third case is covered pre-emptively: the hook audits one file, so a signature
 * built from file-scoped facts would make alternating edits look like the project's
 * coverage flapping.
 */

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'skill', 'hooks', 'ds-loop-guard.mjs');
const STATE = join('node_modules', '.cache', 'ds-loop', 'guard-coverage.json');

type Run = { stderr: string; status: number | null; noticed: boolean };

function edit(dir: string, file: string): Run {
  const payload = JSON.stringify({ tool_input: { file_path: join(dir, file) }, cwd: dir });
  const res = spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8', cwd: dir });
  const stderr = res.stderr ?? '';
  return { stderr, status: res.status, noticed: /ds-loop coverage —/.test(stderr) };
}

function inProject<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-hook-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// a project whose styling is partly unreadable, and whose tokens are all clean, so
// nothing survives --min-severity high. Coverage is the only thing left to report.
const PARTLY_UNREADABLE = {
  'tokens.css': ':root{--palette-blue-500:#1da1f2;}\n',
  'theme.scss': '$brand: #1da1f2;\n',
  'other.css': ':root{--palette-blue-600:#1b95db;}\n',
};

test('guard: incomplete coverage is announced even when no finding survives the floor', () => {
  inProject(PARTLY_UNREADABLE, (dir) => {
    const first = edit(dir, 'tokens.css');
    assert.ok(first.noticed, `expected a coverage notice, got stderr: ${first.stderr || '(empty)'}`);
    assert.match(first.stderr, /\.scss/, 'the notice should name the unread format');
    assert.equal(first.status, 2, 'a notice reaches the agent as hook feedback');
    assert.ok(existsSync(join(dir, STATE)), 'the observed state must be recorded');
  });
});

test('guard: the same coverage state is not announced twice', () => {
  inProject(PARTLY_UNREADABLE, (dir) => {
    assert.ok(edit(dir, 'tokens.css').noticed, 'first sight announces');
    const second = edit(dir, 'tokens.css');
    const third = edit(dir, 'tokens.css');
    assert.ok(!second.noticed, 'repeating it per save trains the agent to ignore the channel');
    assert.ok(!third.noticed);
    assert.equal(second.status, 0, 'silent means a clean exit');
  });
});

test('guard: a recovered-then-returning coverage gap is announced again', () => {
  inProject(PARTLY_UNREADABLE, (dir) => {
    assert.ok(edit(dir, 'tokens.css').noticed, 'incomplete A announces');

    // the gap is closed
    rmSync(join(dir, 'theme.scss'));
    const recovered = edit(dir, 'tokens.css');
    assert.ok(!recovered.noticed, 'becoming complete is not itself a warning');

    // and returns — the bug was that this stayed silent, because the cache only
    // ever recorded incomplete states
    writeFileSync(join(dir, 'theme.scss'), '$brand: #1da1f2;\n');
    const returned = edit(dir, 'tokens.css');
    assert.ok(returned.noticed, 'the gap coming back is a change and must be announced');
  });
});

test('guard: a different coverage gap is announced as a change', () => {
  inProject(PARTLY_UNREADABLE, (dir) => {
    assert.ok(edit(dir, 'tokens.css').noticed);
    writeFileSync(join(dir, 'Widget.vue'), '<template><div/></template>\n');
    const changed = edit(dir, 'tokens.css');
    assert.ok(changed.noticed, 'a new unread format is a different state');
    assert.match(changed.stderr, /\.vue/);
  });
});

test('guard: alternating files with different coverage profiles does not flap', () => {
  // The first version of this test used two ordinary palette files, which never
  // exercised the distinction that caused the flapping. These two differ in exactly
  // the file-scoped facts the signature must ignore: `odd.css` holds an
  // unconvertible colour and a reference whose name matches no tier convention;
  // `plain.css` holds neither.
  inProject(
    {
      'odd.css': ':root{--weird:lab(52% 40 60);--brand:#1da1f2;--accent:var(--brand)}\n',
      'plain.css': ':root{--palette-blue-500:#1da1f2;}\n',
      'theme.scss': '$brand: #1da1f2;\n',
    },
    (dir) => {
      const first = edit(dir, 'odd.css');
      assert.ok(first.noticed, 'first sight announces the project format gap');

      for (const file of ['plain.css', 'odd.css', 'plain.css', 'odd.css']) {
        const r = edit(dir, file);
        assert.ok(
          !r.noticed,
          `editing ${file} re-announced project coverage — the signature is not project-scoped`,
        );
      }
    },
  );
});

test('guard: file-scoped judgement limits are NOT delivered by this channel', () => {
  // Documenting the truth rather than a hope. `token/tier-model-undetectable` is
  // low severity and the hook filters at high, so it cannot arrive here — and
  // `context` runs no rules, so it cannot supply it either. The only channel is an
  // unfiltered `audit`, which the skill's setup step now requires explicitly.
  // If this test ever fails, the hook policy widened and the docs must change with it.
  inProject({ 'tokens.css': ':root{--brand:#1da1f2;--accent:var(--brand)}\n' }, (dir) => {
    const r = edit(dir, 'tokens.css');
    assert.doesNotMatch(
      r.stderr,
      /tier-model-undetectable/,
      'the hook filters at high severity; claiming otherwise in docs was the bug',
    );

    // and the limit is genuinely there, in an unfiltered run
    const audit = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--no-warnings',
        join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.ts'),
        'audit',
        '.',
        '--json',
      ],
      { cwd: dir, encoding: 'utf8' },
    );
    const report = JSON.parse(audit.stdout);
    assert.deepEqual(report.coverage.couldNotJudge, ['token/tier-model-undetectable']);
  });
});

test('guard: a fully readable project never mentions coverage', () => {
  inProject({ 'tokens.css': ':root{--palette-blue-500:#1da1f2;}\n' }, (dir) => {
    const r = edit(dir, 'tokens.css');
    assert.ok(!r.noticed, `complete coverage should say nothing, got: ${r.stderr}`);
    assert.equal(r.status, 0);
  });
});

test('guard: findings still reach the agent, with the notice alongside', () => {
  inProject({ ...PARTLY_UNREADABLE, 'drift.css': ':root{--brand:#1da1f2;}\n' }, (dir) => {
    const r = edit(dir, 'drift.css');
    assert.match(r.stderr, /design-system issue\(s\)/, 'the finding must be reported');
    assert.ok(r.noticed, 'and the first coverage notice rides along with it');
    assert.equal(r.status, 2);
  });
});

test('guard: a non-style file is ignored entirely', () => {
  inProject(PARTLY_UNREADABLE, (dir) => {
    writeFileSync(join(dir, 'notes.md'), '# hi\n');
    const r = edit(dir, 'notes.md');
    assert.equal(r.stderr, '', 'nothing to say about a file the tool does not read');
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, STATE)), 'and no state written for an ignored file');
  });
});
