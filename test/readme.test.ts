import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The README's sample outputs must be real.
 *
 * This exists because of a specific near-miss: a sample was *composed from memory*
 * and presented under the words "real output". It was plausible, it was wrong, and
 * it was caught by accident rather than by any check. A second sample carried an
 * invented date and numbers that had never been produced by anything.
 *
 * A promise not to do that again is worth nothing. A failing build is worth
 * something. So every block in the README marked
 *
 *     <!-- verified: <id> -->
 *
 * is reproduced here by running the real command, and every line of the block must
 * appear in the real output. Lines are matched after whitespace normalisation, so
 * the README may wrap for readability; a trailing `…` marks deliberate truncation
 * and only the prefix is checked.
 *
 * Adding a sample without registering it here fails too — an unregistered verified
 * block is an unchecked claim.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'src', 'cli.ts');

function run(args: string[], cwd: string): string {
  try {
    return execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', CLI, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    // audit exits 1 on findings; the output is still what we are checking
    const e = err as { stdout?: string };
    return e.stdout ?? '';
  }
}

/** every ```-fenced block preceded by `<!-- verified: id -->` */
function verifiedBlocks(): Map<string, string> {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  const blocks = new Map<string, string>();
  const re = /<!--\s*verified:\s*([a-z0-9-]+)\s*-->\s*\n```[a-z]*\n([\s\S]*?)```/g;
  for (const m of readme.matchAll(re)) blocks.set(m[1]!, m[2]!);
  return blocks;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** every line of the documented block must appear in the real output */
function assertBlockIsReal(id: string, documented: string, actual: string): void {
  const haystack = norm(actual);
  const skip = /^(since |appended to |version |ds-loop scorecard —)/;

  for (const raw of documented.split('\n')) {
    const line = raw.trim();
    if (line === '' || skip.test(line)) continue;
    // `…` marks truncation: check the part that is actually claimed
    const claim = norm(line.split('…')[0] ?? '');
    if (claim.length < 8) continue;
    assert.ok(
      haystack.includes(claim),
      `README block "${id}" claims a line the real output does not contain:\n` +
        `  claimed: ${claim}\n` +
        '  Either the output changed and the README is stale, or the sample was never real.\n' +
        `  actual output:\n${actual.replace(/^/gm, '    ')}`,
    );
  }
}

function inTemp<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-readme-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('README: the Radix audit sample is real output', () => {
  const block = verifiedBlocks().get('audit-radix');
  assert.ok(block, 'the audit-radix block is missing from README.md');
  assertBlockIsReal('audit-radix', block, run(['audit', 'fixtures/radix-colors'], ROOT));
});

test('README: the markup-rule sample is real output', () => {
  const block = verifiedBlocks().get('audit-markup');
  assert.ok(block, 'the audit-markup block is missing from README.md');
  const actual = inTemp(
    {
      'tokens.css':
        ':root {\n  --palette-blue-500: #1da1f2;\n  --brand: var(--palette-blue-500, #1da1f2);\n}\n',
      'Card.tsx':
        'export const Card = () => (\n  <div className="bg-[#1da1f2] p-[13px]">\n    <span className="text-[14px]" />\n  </div>\n);\n',
    },
    (dir) => run(['audit', '.'], dir),
  );
  assertBlockIsReal('audit-markup', block, actual);
});

test('README: the not-checked sample is real output', () => {
  const block = verifiedBlocks().get('audit-not-checked');
  assert.ok(block, 'the audit-not-checked block is missing from README.md');
  const actual = inTemp(
    { 'theme.scss': '$brand: #1da1f2;\n', 'W.vue': '<template><div/></template>\n' },
    (dir) => run(['audit', '.'], dir),
  );
  assertBlockIsReal('audit-not-checked', block, actual);
});

test('README: the scorecard delta is real output', () => {
  const block = verifiedBlocks().get('scorecard-delta');
  assert.ok(block, 'the scorecard-delta block is missing from README.md');
  const before =
    ':root {\n  --brand: #1da1f2;\n  --accent: #1da1f2;\n  --link: #1da1f2;\n  --brand-hover: #1b95db;\n}\n';
  const after =
    ':root {\n  --palette-blue-500: #1da1f2;\n  --palette-blue-600: #1b95db;\n' +
    '  --brand: var(--palette-blue-500, #1da1f2);\n  --accent: var(--brand, #1da1f2);\n' +
    '  --link: var(--brand, #1da1f2);\n  --brand-hover: var(--palette-blue-600, #1b95db);\n}\n';

  const actual = inTemp({ 'tokens.css': before }, (dir) => {
    run(['scorecard', '.'], dir);
    writeFileSync(join(dir, 'tokens.css'), after);
    return run(['scorecard', '.'], dir);
  });
  assertBlockIsReal('scorecard-delta', block, actual);
});

test('every verified block in the README is registered in this file', () => {
  // an unregistered `verified:` block is an unchecked claim wearing a badge
  const registered = new Set(['audit-radix', 'audit-markup', 'audit-not-checked', 'scorecard-delta']);
  for (const id of verifiedBlocks().keys()) {
    assert.ok(registered.has(id), `README block "${id}" is marked verified but nothing checks it`);
  }
  assert.equal(verifiedBlocks().size, registered.size);
});
