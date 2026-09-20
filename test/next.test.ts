import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Every exit names the next command.
 *
 * The product failure this covers was not a wrong number — it was a user who
 * installed the package, typed `ds-loop`, got seven commands and their flags, and
 * had no idea what to do. Meanwhile `audit` ended on scorecard ratios, which mean
 * nothing until a second run exists, and nothing anywhere mentioned that `fix`
 * could repair a subset of the findings just printed.
 *
 * So these tests assert the handover, not the wording: a `next` block exists, it
 * is the last thing printed, it offers `fix` only when the fixer can really act,
 * it offers a baseline only when no history exists, and it stays quiet about the
 * guard once the guard is installed.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'src', 'cli.ts');

function run(args: string[], cwd: string): { out: string; status: number | null } {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', CLI, ...args], {
    cwd,
    encoding: 'utf8',
  });
  return { out: r.stdout, status: r.status };
}

function inTree<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-next-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      const abs = join(dir, name);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** a source whose only finding is the one `fix` can actually repair */
const FIXABLE = {
  'tokens.css': ':root{--palette-blue-500:#1da1f2;--brand:var(--palette-blue-500)}\n',
};
/** findings, none of them mechanically provable */
const JUDGEMENT_ONLY = { 'tokens.css': ':root{--brand:#1da1f2;--accent:#1da1f2}\n' };

test('audit ends on the handover, not on the ratios', () => {
  inTree(JUDGEMENT_ONLY, (dir) => {
    const { out } = run(['audit', '.'], dir);
    const blocks = out.trimEnd().split('\n\n');
    const last = blocks.at(-1) ?? '';
    assert.match(last, /^ {2}next$/m, `the last block should be the handover, got:\n${last}`);
    // the ratios are kept — they are the comparison instrument, just not the last word
    assert.match(out, /scorecard ratios/);
    assert.ok(
      out.indexOf('scorecard ratios') < out.indexOf('  next'),
      'ratios must come before the handover',
    );
  });
});

test('fix is offered only when the fixer can act, with its real edit count', () => {
  inTree(FIXABLE, (dir) => {
    const { out } = run(['audit', '.'], dir);
    assert.match(out, /ds-loop fix \.\s+1 mechanical edit\(s\)/, `expected a fix row, got:\n${out}`);
  });
  inTree(JUDGEMENT_ONLY, (dir) => {
    const { out } = run(['audit', '.'], dir);
    assert.doesNotMatch(
      out,
      /mechanical edit\(s\)/,
      'offering `fix` where it cannot act is the same broken promise as no guidance at all',
    );
    assert.match(out, /nothing here is mechanically provable/);
  });
});

test('the baseline row knows whether history exists', () => {
  inTree(JUDGEMENT_ONLY, (dir) => {
    assert.match(run(['audit', '.'], dir).out, /pin these ratios as run 1/);
    run(['scorecard', '.'], dir);
    const after = run(['audit', '.'], dir).out;
    assert.match(after, /compare against 1 recorded row/, `expected a comparison row, got:\n${after}`);
  });
});

test('the guard row disappears once the guard is installed', () => {
  inTree(JUDGEMENT_ONLY, (dir) => {
    assert.match(run(['audit', '.'], dir).out, /ds-loop guard on/);
    run(['guard', 'on'], dir);
    assert.doesNotMatch(
      run(['audit', '.'], dir).out,
      /ds-loop guard on/,
      'recommending something already done is noise',
    );
  });
});

test('a not-checked source is sent to context, not to more auditing', () => {
  inTree({ 'theme.scss': '$brand: #1da1f2;\n' }, (dir) => {
    const { out } = run(['audit', '.'], dir);
    assert.match(out, /not checked/);
    assert.match(out, /ds-loop context \./);
    assert.doesNotMatch(out, /mechanical edit\(s\)/);
  });
});

test('the bare command audits this directory instead of printing the manual', () => {
  inTree(JUDGEMENT_ONLY, (dir) => {
    const { out, status } = run([], dir);
    assert.match(out, /2 findings —/, `expected a verdict, got:\n${out}`);
    assert.match(out, /biggest\s+\[HIGH\] color\/semantic-holds-literal/);
    assert.match(out, /^ {2}next$/m);
    assert.doesNotMatch(out, /--require-coverage/, 'the flag manual belongs to --help');
    assert.equal(status, 1, 'findings exist, so the exit code says so');
  });
});

test('--help still prints the whole manual, and names the entrance first', () => {
  inTree(JUDGEMENT_ONLY, (dir) => {
    const { out, status } = run(['--help'], dir);
    assert.match(out, /Start here: {2}ds-loop\b/);
    assert.match(out, /--require-coverage/, 'the reference must stay complete');
    assert.equal(status, 0);
  });
});

test('`start` is the spelled-out entrance and matches the bare command', () => {
  inTree(FIXABLE, (dir) => {
    const bare = run([], dir).out;
    const start = run(['start', '.'], dir).out;
    const strip = (s: string) => s.replace(/ds-loop [\w.-]+ {2}·.*/g, '');
    assert.equal(strip(start), strip(bare));
  });
});

test('the report carries the handover for an agent reading --json', () => {
  inTree(FIXABLE, (dir) => {
    // audit exits 1 on findings, so read stdout rather than trusting a zero exit
    const report = JSON.parse(run(['audit', '.', '--json'], dir).out);
    assert.ok(Array.isArray(report.next) && report.next.length > 0, 'report.next must be populated');
    const fixRow = report.next.find((a: { command: string }) => a.command.startsWith('ds-loop fix'));
    assert.ok(fixRow, `expected a fix action in ${JSON.stringify(report.next)}`);
    assert.match(fixRow.why, /1 mechanical edit/);
  });
});

test('the overview retains matched exceptions even when they produce a clean verdict', () => {
  inTree(
    {
      'tokens.css': ':root{--color-surface-raised:#ffffff}',
      'ds-loop.config.json': JSON.stringify({
        ignore: [
          {
            rule: 'color/semantic-holds-literal',
            value: '--color-surface-raised',
            reason: 'Fixed export for a single-theme consumer.',
          },
        ],
      }),
    },
    (dir) => {
      const { out, status } = run([], dir);
      assert.equal(status, 0);
      assert.match(out, /suppressed/);
      assert.match(out, /color\/semantic-holds-literal/);
      assert.match(out, /Fixed export for a single-theme consumer/);
    },
  );
});

test('the overview names unread token files and color conversion gaps', () => {
  inTree(
    { 'tokens.css': ':root{--palette-blue-500:color(display-p3 0 0 1)}', 'tokens.json': '{}' },
    (dir) => {
      const { out } = run([], dir);
      assert.match(out, /tokens.json/);
      assert.match(out, /1 colour value\(s\) this version cannot convert/);
      assert.doesNotMatch(out, /✓ clean/);
    },
  );
});

test('the overview provides a real skill entry and separates activation from installation', () => {
  inTree({}, (dir) => {
    const { out } = run([], dir);
    assert.ok(out.includes(join(ROOT, 'skill', 'SKILL.md')));
    assert.match(out, /coding agent/);
    assert.match(out, /does not start/);
    assert.match(out, /npx --no-install ds-loop/);
  });
});
