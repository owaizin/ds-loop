import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';

const rule = 'token/stock-palette-utility';
function project<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-context-'));
  try {
    for (const [file, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const fixture = {
  'app/Card.tsx': '<div className="bg-white" />',
  'app/theme.css': ':root { --ds-blue-500: #175cd3; --ds-color-panel: #ffffff; }',
  'other/theme.css': ':root { --other-color-panel: #ff0000; }',
};
const config = {
  ...DEFAULT_CONFIG,
  tokenContexts: [{ files: ['app/*'], tokens: ['app/theme.css'] }],
};

test('scoped palette check exposes missing context even above its severity floor', () => {
  project(fixture, (dir) => {
    const full = audit(dir, { silent: true });
    assert.ok(full.findings.some((f) => f.ruleId === rule));
    const scoped = audit(dir, { files: [join(dir, 'app/Card.tsx')], minSeverity: 'high', silent: true });
    assert.equal(scoped.findings.length, 0);
    assert.ok(scoped.coverage.couldNotJudge.includes(rule));
    assert.equal(scoped.coverage.complete, false);
  });
});

test('explicit read-only token context enables scoped judgment without judging declarations', () => {
  project(fixture, (dir) => {
    const scoped = audit(dir, { files: [join(dir, 'app/Card.tsx')], config, silent: true });
    const palette = scoped.findings.find((f) => f.ruleId === rule);
    assert.equal(palette?.data?.count, 1);
    assert.ok(palette?.where.includes('app/Card.tsx'));
    assert.ok(!scoped.findings.some((f) => f.ruleId === 'color/semantic-holds-literal'));
    assert.equal(scoped.ratios['literal-colors-per-distinct'], 0);
  });
});

test('unrelated project declarations cannot satisfy an unconfigured scoped palette check', () => {
  project({ ...fixture, 'other/Card.tsx': '<div className="bg-white" />' }, (dir) => {
    const report = audit(dir, { files: [join(dir, 'other/Card.tsx')], config, silent: true });
    const finding = report.findings.find((f) => f.ruleId === rule);
    assert.equal(finding?.data?.notJudged, true);
    assert.ok(report.coverage.couldNotJudge.includes(rule));
  });
});

test('an empty file selection never widens into a full-tree audit', () => {
  project(fixture, (dir) => {
    const report = audit(dir, { files: [], silent: true });
    assert.equal(report.verdict, 'not-checked');
    assert.deepEqual(report.rulesRun, []);
    assert.deepEqual(report.manifest.judgedFiles, []);
    assert.equal(report.coverage.complete, false);
  });
});

test('the first mapping requires explicit context for other full-tree palette consumers', () => {
  project({ ...fixture, 'other/Card.tsx': '<div className="bg-black" />' }, (dir) => {
    const before = audit(dir, { silent: true });
    assert.equal(before.findings.find((f) => f.ruleId === rule)?.data?.count, 2);
    assert.ok(!before.coverage.couldNotJudge.includes(rule));

    const partial = audit(dir, { config, silent: true });
    const findings = partial.findings.filter((f) => f.ruleId === rule);
    assert.equal(findings.find((f) => !f.data?.notJudged)?.data?.count, 1);
    assert.match(findings.find((f) => f.data?.notJudged)?.where ?? '', /other\/Card\.tsx/);
    assert.ok(partial.coverage.couldNotJudge.includes(rule));

    const complete = audit(dir, {
      config: {
        ...config,
        tokenContexts: [...config.tokenContexts, { files: ['other/*'], tokens: ['other/theme.css'] }],
      },
      silent: true,
    });
    assert.equal(complete.findings.find((f) => f.ruleId === rule)?.data?.count, 2);
    assert.ok(!complete.coverage.couldNotJudge.includes(rule));
  });
});

test('--since selects against the target repository and does not conceal invalid refs', () => {
  project(fixture, (dir) => {
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
    git('init');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture');
    const report = audit(dir, { since: 'HEAD', silent: true });
    assert.equal(report.verdict, 'not-checked');
    assert.deepEqual(report.manifest.judgedFiles, []);
    assert.throws(() => audit(dir, { since: 'missing-ref', silent: true }), /cannot compare/);
    writeFileSync(join(dir, 'app/Card.tsx'), '<div className="bg-black" />');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'change consumer');
    const changed = audit(dir, { since: 'HEAD~1', config, silent: true });
    assert.deepEqual(changed.manifest.judgedFiles, [join(dir, 'app/Card.tsx')]);
    assert.equal(changed.findings.find((f) => f.ruleId === rule)?.data?.count, 1);
  });
});

test('context symlinks cannot read a theme outside the audit root', () => {
  project({ 'theme.css': ':root{--ds-color-panel:#ffffff}' }, (outside) => {
    project(fixture, (dir) => {
      symlinkSync(join(outside, 'theme.css'), join(dir, 'linked.css'));
      const report = audit(dir, {
        files: [join(dir, 'app/Card.tsx')],
        silent: true,
        config: { ...DEFAULT_CONFIG, tokenContexts: [{ files: ['app/*'], tokens: ['linked.css'] }] },
      });
      assert.match(report.manifest.tokenContext?.[0]?.error ?? '', /within the audit root/);
      assert.ok(report.coverage.couldNotJudge.includes(rule));
    });
  });
});

test('the CLI coverage gate fails on hidden context limits and succeeds after context is supplied', () => {
  project(fixture, (dir) => {
    const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
    const args = [
      '--experimental-strip-types',
      cli,
      'audit',
      dir,
      '--files',
      join(dir, 'app/Card.tsx'),
      '--min-severity',
      'high',
      '--require-coverage',
      '--json',
    ];
    const before = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
    assert.equal(before.status, 1, before.stderr);
    assert.ok(JSON.parse(before.stdout).coverage.couldNotJudge.includes(rule));
    writeFileSync(join(dir, 'ds-loop.config.json'), JSON.stringify({ tokenContexts: config.tokenContexts }));
    const after = spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
    assert.equal(after.status, 0, after.stderr);
    assert.equal(JSON.parse(after.stdout).coverage.complete, true);
  });
});

test('direct-file targets use their directory for explicit context paths', () => {
  project(fixture, (dir) => {
    const report = audit(join(dir, 'app/Card.tsx'), {
      config: { ...DEFAULT_CONFIG, tokenContexts: [{ files: ['Card.tsx'], tokens: ['theme.css'] }] },
      silent: true,
    });
    assert.equal(report.findings.find((f) => f.ruleId === rule)?.data?.count, 1);
    assert.deepEqual(report.coverage.couldNotJudge, []);
  });
});

test('missing, unsupported or unreadable context cannot establish a palette judgment', () => {
  project(
    { ...fixture, 'tokens.scss': '$brand: red;', 'refs.css': ':root{--surface:var(--base)}' },
    (dir) => {
      for (const token of ['absent.css', 'tokens.scss', 'refs.css']) {
        const report = audit(dir, {
          config: { ...DEFAULT_CONFIG, tokenContexts: [{ files: ['app/*'], tokens: [token] }] },
          files: [join(dir, 'app/Card.tsx')],
          silent: true,
        });
        assert.ok(report.coverage.couldNotJudge.includes(rule), token);
        assert.equal(report.findings.find((f) => f.ruleId === rule)?.data?.notJudged, true, token);
        assert.equal(report.manifest.tokenContext?.[0]?.file, token);
      }
    },
  );
});

test('mixed consumers keep judged counts separate from unavailable checks and retain context attribution', () => {
  project({ ...fixture, 'other/Card.tsx': '<div className="bg-black" />' }, (dir) => {
    const files = [join(dir, 'app/Card.tsx'), join(dir, 'other/Card.tsx')];
    const report = audit(dir, { files, config, silent: true });
    const findings = report.findings.filter((f) => f.ruleId === rule);
    assert.equal(findings.length, 2);
    assert.equal(findings.find((f) => !f.data?.notJudged)?.data?.count, 1);
    assert.ok(report.coverage.couldNotJudge.includes(rule));
    const read = report.manifest.tokenContext?.[0];
    assert.deepEqual(read?.forFiles, ['app/Card.tsx']);
    assert.match(read?.sha256 ?? '', /^[a-f0-9]{64}$/);
    writeFileSync(join(dir, 'app/theme.css'), ':root{--ds-color-panel:#000000}');
    const after = audit(dir, { files, config, silent: true });
    assert.notEqual(after.manifest.tokenContext?.[0]?.sha256, read?.sha256);
  });
});

test('token context mappings load from JSON, affect attribution and reject invalid paths', () => {
  project({}, (dir) => {
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ tokenContexts: config.tokenContexts }));
    assert.deepEqual(loadConfig(path).config.tokenContexts, config.tokenContexts);
    assert.notEqual(hashConfig(loadConfig(path).config), hashConfig(DEFAULT_CONFIG));
    for (const token of ['../outside.css', '/outside.css', 'app/*.css']) {
      writeFileSync(path, JSON.stringify({ tokenContexts: [{ files: ['app/*'], tokens: [token] }] }));
      assert.throws(() => loadConfig(path), /tokenContexts/);
    }
  });
});
