import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { REPORT_SCRIPT } from '../src/core/report-html-assets.ts';

const cli = resolve('src/cli.ts');
test('HTML flag preserves real verdicts, JSON, exit codes and audit metadata', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds-html-'));
  const run = (args: string[]) =>
    spawnSync(process.execPath, ['--experimental-strip-types', cli, 'audit', '.', ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
  try {
    for (const [css, verdict, status] of [
      ['', 'not-checked', 0],
      [':root { --space-1: 4px; }', 'clean', 0],
      ['.button { padding: 17px; }', 'issues', 1],
    ] as const) {
      if (css) writeFileSync(join(dir, 'tokens.css'), css);
      const output = join(dir, 'report.html');
      const result = run(['--json', '--html', output]);
      assert.equal(result.status, status, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.verdict, verdict);
      assert.ok(result.stderr.includes(output));
      const html = readFileSync(output, 'utf8');
      const embedded = JSON.parse(
        html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1],
      );
      assert.deepEqual(embedded.report, report);
    }
    const filtered = JSON.parse(
      run(['--json', '--min-severity', 'blocking', '--html', join(dir, 'filtered.html')]).stdout,
    );
    assert.equal(filtered.manifest.minSeverity, 'blocking');
    assert.equal(filtered.findings.length, 0);
    assert.equal(filtered.styleInventory.spacing.occurrences, 1);
    assert.equal(run(['--html']).status, 1);
    assert.match(run(['--html', '--quiet']).stderr, /needs a file path/);
    new Script(REPORT_SCRIPT); // shipped inline JavaScript must parse without a bundler
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
