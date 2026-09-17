#!/usr/bin/env node
/**
 * Distribution smoke test — `npm run smoke`.
 *
 * `npm test` exercises the source. It cannot see the published package, and the
 * published package is where this tool has actually broken: Node refuses to strip
 * types under node_modules, so shipping the TypeScript produced a CLI that ran
 * perfectly from a checkout and not at all from an install. Unit tests were green
 * the whole time.
 *
 * So this packs the real tarball, installs it into a temp directory the way a
 * stranger would, and drives the installed binary. Slow on purpose (~20s), and
 * the only thing standing between a refactor and a silently broken `npx`.
 */
import { execFileSync, spawnSync } from 'node:child_process';
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
import { dirname, join, resolve } from 'node:path';

const ROOT = process.cwd();
const checks = [];
let failed = 0;

function check(name, fn) {
  try {
    fn();
    checks.push(`  ok    ${name}`);
  } catch (err) {
    failed++;
    checks.push(`  FAIL  ${name}\n        ${err.message}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const dir = mkdtempSync(join(tmpdir(), 'ds-loop-smoke-'));
process.stdout.write(`\n  packing and installing into ${dir}\n`);

try {
  // 1. build + pack exactly what `npm publish` would send
  const tgz = execFileSync('npm', ['pack', '--silent', '--pack-destination', dir], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .pop();

  execFileSync('npm', ['init', '-y'], { cwd: dir, stdio: 'ignore' });
  execFileSync('npm', ['install', '--silent', join(dir, tgz)], { cwd: dir, stdio: 'ignore' });

  const cli = join(dir, 'node_modules', '.bin', 'ds-loop');
  const run = (args, cwd = dir) => spawnSync(cli, args, { cwd, encoding: 'utf8' });

  check('the installed package has a runnable binary', () => {
    assert(existsSync(cli), `no binary at ${cli}`);
  });

  check('it ships compiled JS, not TypeScript', () => {
    // the whole point: a .ts entry point cannot run from node_modules
    assert(existsSync(join(dir, 'node_modules', 'ds-loop', 'dist', 'cli.js')), 'dist/cli.js missing');
    assert(!existsSync(join(dir, 'node_modules', 'ds-loop', 'src')), 'src/ should not be published');
  });

  check('the installed skill has no missing local Markdown references', () => {
    const skillRoot = join(dir, 'node_modules', 'ds-loop', 'skill');
    function visit(folder) {
      for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (entry.name.endsWith('.md')) {
          for (const match of readFileSync(path, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
            const target = match[1].split('#')[0];
            if (!target || /^[a-z]+:/i.test(target)) continue;
            assert(existsSync(resolve(dirname(path), target)), `${path} links to missing ${target}`);
          }
        }
      }
    }
    visit(skillRoot);
  });

  check('bare invocation prints usage and does not throw', () => {
    const r = run([]);
    assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
    assert(/ds-loop \d+\.\d+\.\d+/.test(r.stdout), 'no version banner in usage');
  });

  check('an empty install is not-checked, and strict coverage fails it', () => {
    const r = run(['audit', '.', '--json']);
    assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
    const report = JSON.parse(r.stdout);
    assert(report.verdict === 'not-checked', `empty install was ${report.verdict}`);
    assert(report.coverage.complete === false, 'an empty install cannot be completely checked');
    const strict = run(['audit', '.', '--json', '--require-coverage']);
    assert(strict.status === 1, `strict coverage should fail, got ${strict.status}`);
    assert(JSON.parse(strict.stdout).verdict === 'not-checked', 'strict mode must retain the report');
  });

  writeFileSync(
    join(dir, 'tokens.css'),
    ':root{--brand:#1da1f2;--brand-hover:#1b95db;--pad:13px}\n.b{color:var(--brand)}\n',
  );

  check('CSS custom properties are read, with a real file:line', () => {
    const r = run(['audit', 'tokens.css']);
    assert(r.status === 1, `expected exit 1 on findings, got ${r.status}`);
    assert(r.stdout.includes('color/semantic-holds-literal'), 'expected the literal-colour rule to fire');
    assert(/tokens\.css:\d+/.test(r.stdout), 'finding carries no file:line');
  });

  writeFileSync(
    join(dir, 'Card.tsx'),
    'export const Card = () => <div className="p-[13px] bg-[#1da1f2]" />;\n',
  );

  check('Tailwind arbitrary values are read from a published install', () => {
    const r = run(['audit', 'Card.tsx']);
    assert(r.status === 1, `expected exit 1, got ${r.status}`);
    assert(r.stdout.includes('token/raw-value-in-markup'), 'expected the markup rule to fire');
  });

  check('both adapters run over one mixed tree', () => {
    const r = run(['audit', '.']);
    const adapters = /adapter ([^\n]+)/.exec(r.stdout)?.[1] ?? '';
    assert(adapters.includes('css-custom-props'), `css adapter absent: ${adapters}`);
    assert(adapters.includes('tailwind-jsx'), `tailwind adapter absent: ${adapters}`);
  });

  check('--json is machine-readable', () => {
    const r = run(['audit', '.', '--json']);
    const report = JSON.parse(r.stdout);
    assert(report.manifest?.tool === 'ds-loop', 'no manifest');
    assert(Array.isArray(report.findings), 'no findings array');
    assert(report.rulesRun.length > 0, 'no rules ran');
  });

  check('--min-severity and --quiet suppress output the hook does not want', () => {
    const r = run(['audit', 'tokens.css', '--min-severity', 'blocking', '--quiet']);
    assert(r.stdout.trim() === '', `expected silence, got: ${r.stdout.slice(0, 80)}`);
    assert(r.status === 0, `expected exit 0 when nothing meets the floor, got ${r.status}`);
  });

  check('guard installs a hook that goes through the launcher, then removes it', () => {
    run(['guard', 'on']);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    const cmd = settings.hooks.PostToolUse[0].hooks[0].command;
    assert(cmd.includes('ds-loop-guard.mjs'), `unexpected hook command: ${cmd}`);
    assert(!cmd.includes('src/cli.ts'), 'hook points at TypeScript — it cannot run from node_modules');
    run(['guard', 'off']);
    const after = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    assert(!after.hooks?.PostToolUse, 'guard off left its hook behind');
  });

  check('the skill launcher works from a published install', () => {
    // regression: skill/bin/ds-loop used to resolve src/cli.ts, which stopped
    // existing the moment the package shipped compiled JS instead
    const shim = join(dir, 'node_modules', 'ds-loop', 'skill', 'bin', 'ds-loop');
    assert(existsSync(shim), 'skill launcher missing from the package');
    const r = spawnSync(shim, ['context', '.'], { cwd: dir, encoding: 'utf8' });
    assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
    assert(/ds-loop context/.test(r.stdout), `unexpected output: ${r.stdout.slice(0, 120)}`);
  });

  check('context reports config, declaration and adapters without analysing', () => {
    const r = run(['context', '.']);
    assert(r.status === 0, `exit ${r.status}: ${r.stderr}`);
    for (const expected of ['config', 'declared', 'adapters']) {
      assert(r.stdout.includes(expected), `context output missing "${expected}"`);
    }
    assert(!/\[HIGH\]|\[MEDIUM\]/.test(r.stdout), 'context should not emit findings');
  });

  check('audit states the scope it covered', () => {
    writeFileSync(join(dir, 'theme.scss'), '$brand: #1da1f2;\n');
    const r = run(['audit', '.']);
    assert(r.stdout.includes('scope — what this audit read'), 'no coverage section');
    assert(/not read at all:.*\.scss/.test(r.stdout), 'an unreadable format should be named');
    const report = JSON.parse(run(['audit', '.', '--json']).stdout);
    assert(report.coverage, 'coverage missing from --json');
    assert(report.coverage.complete === false, 'complete should be false with an unread format');
  });

  check('scorecard appends a row and refuses to call a dirty comparison a delta', () => {
    const first = JSON.parse(run(['scorecard', '.', '--json']).stdout);
    assert(first.row.configHash, 'a row must record its instrument');
    assert(first.previous === null, 'the first row has no predecessor');
    const second = JSON.parse(run(['scorecard', '.', '--json']).stdout);
    assert(second.previous, 'the second row compares against the first');
    assert(second.comparable.clean === true, 'same adapters and config should compare cleanly');
    const lines = readFileSync(join(dir, '.ds-scorecard', 'history.jsonl'), 'utf8')
      .trim()
      .split('\n');
    assert(lines.length === 2, `expected 2 rows, got ${lines.length}`);
  });

  check('an unreadable source is reported as not-checked, never as clean', () => {
    const sub = join(dir, 'unreadable');
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, 'theme.scss'), '$brand: #1da1f2;\n');
    const r = run(['audit', 'unreadable']);
    assert(/not checked/.test(r.stdout), `expected a not-checked verdict, got: ${r.stdout.slice(0, 120)}`);
    assert(!/✓ clean/.test(r.stdout), 'an unread source must never print clean');
    const report = JSON.parse(run(['audit', 'unreadable', '--json']).stdout);
    assert(report.verdict === 'not-checked', `verdict was ${report.verdict}`);
  });

  check('a non-git directory produces no git noise', () => {
    const r = run(['audit', '.']);
    assert(!/fatal:/.test(r.stderr), `git error leaked: ${r.stderr.trim()}`);
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`\n${checks.join('\n')}\n`);
process.stdout.write(
  failed === 0
    ? `\n  ${checks.length} checks passed — the published package runs.\n\n`
    : `\n  ${failed} of ${checks.length} checks failed — the published package is broken.\n\n`,
);
process.exit(failed === 0 ? 0 : 1);
