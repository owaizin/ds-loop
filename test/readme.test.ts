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

/** Decode text from HTML code blocks without treating escaped tags as markup. */
function decodeHtml(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, name: string) => {
    if (name.startsWith('#')) {
      return String.fromCodePoint(
        name[1]?.toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1)),
      );
    }
    return named[name.toLowerCase()] ?? entity;
  });
}

/** Every marked Markdown fence or HTML pre/code block must be extractable. */
function extractVerified(text: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const re =
    /<!--\s*verified:\s*([a-z0-9-]+)\s*-->\s*(?:```[a-z]*\n([\s\S]*?)```|<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>)/g;
  for (const m of text.matchAll(re)) {
    const body = m[2] ?? decodeHtml(m[3]!);
    if (blocks.has(m[1]!)) assert.equal(blocks.get(m[1]!), body, `conflicting samples: ${m[1]}`);
    blocks.set(m[1]!, body);
  }
  for (const marker of text.matchAll(/<!--\s*verified:\s*([a-z0-9-]+)\s*-->/g)) {
    assert.ok(blocks.has(marker[1]!), `verified marker has no extractable sample: ${marker[1]}`);
  }
  return blocks;
}

function verifiedBlocks(): Map<string, string> {
  return extractVerified(
    ['README.md', 'docs/guide/output.md', 'docs/site/landing-copy.md']
      .map((file) => readFileSync(join(ROOT, file), 'utf8'))
      .join('\n'),
  );
}

test('verified samples: HTML entities and Markdown fences preserve output text', () => {
  const blocks = extractVerified(
    '<!-- verified: html -->\n<pre class="output"><code>0 &lt; 1 &amp; &#x27;x&#39; &quot;y&quot;</code></pre>\n' +
      '<!-- verified: markdown -->\n```text\nreal output\n```',
  );
  assert.equal(blocks.get('html'), `0 < 1 & 'x' "y"`);
  assert.equal(blocks.get('markdown'), 'real output\n');
  assert.throws(() => extractVerified('<!-- verified: missing -->'), /no extractable sample/);
});

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** every line of the documented block must appear in the real output */
function assertBlockIsReal(id: string, documented: string, actual: string): void {
  const haystack = norm(actual);
  const skip = /^(since |appended to |version |ds-loop scorecard —)/;

  let cursor = 0;
  for (const raw of documented.split('\n')) {
    const line = raw.trim();
    if (line === '' || skip.test(line)) continue;
    // `…` marks truncation: check the part that is actually claimed
    const claim = norm(line.split('…')[0] ?? '');
    if (claim.length < 8) continue;
    const position = haystack.indexOf(claim, cursor);
    assert.ok(
      position >= 0,
      `README block "${id}" claims a line the real output does not contain:\n  claimed: ${claim}\n  Either the output changed and the README is stale, or the sample was never real.\n  actual output:\n${actual.replace(/^/gm, '    ')}`,
    );
    cursor = position + claim.length;
  }
}

test('verified samples reject reordered and spliced claims', () => {
  const actual = 'first finding; second finding; third finding';
  assert.throws(() => assertBlockIsReal('reordered', 'third finding\nfirst finding', actual));
  assert.throws(() => assertBlockIsReal('spliced', 'first finding; third finding', actual));
  assertBlockIsReal('truncated', 'first finding…\nthird finding', actual);
});

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
    { 'theme.less': '@brand: #1da1f2;\n', 'W.vue': '<template><div/></template>\n' },
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

for (const id of ['audit-css-inventory', 'audit-css-suggestion']) {
  test(`guide: ${id} is a verbatim excerpt of real CSS audit output`, () => {
    const block = verifiedBlocks().get(id);
    assert.ok(block, `missing verified block: ${id}`);
    const actual = run(
      ['audit', 'fixtures/css-audit-example', ...(id === 'audit-css-suggestion' ? ['--all'] : [])],
      ROOT,
    );
    assert.ok(actual.includes(block.trimEnd()), `${id} must remain a contiguous, verbatim excerpt`);
  });
}

for (const [id, args] of [
  ['start-css-showcase', ['start', 'fixtures/css-audit-example']],
  ['landing-css-showcase', ['start', 'fixtures/css-audit-example']],
  ['consumers-example', ['consumers', 'fixtures/example-workspace', '--scope', '@example/ui']],
] as const) {
  test(`README: ${id} is a contiguous excerpt of the real command`, () => {
    const block = verifiedBlocks().get(id);
    assert.ok(block, `missing verified block: ${id}`);
    const actual =
      args[0] === 'start'
        ? inTemp({}, (dir) => run(['start', join(ROOT, args[1])], dir))
        : run([...args], ROOT);
    assert.ok(actual.includes(block.trimEnd()), `${id} differs from real output`);
  });
}

for (const [command, output, ids] of [
  ['report', 'scratch/phase-1/css-report.html', ['report-css-example', 'guide-report-css-example']],
  [
    'dashboard',
    'scratch/phase-2/dashboard-empty.html',
    ['dashboard-css-example', 'guide-dashboard-css-example'],
  ],
] as const) {
  test(`documentation: ${command} output is real in README and guide`, () => {
    inTemp({}, (dir) => {
      const actual = run([command, join(ROOT, 'fixtures/css-audit-example'), '--out', output], dir);
      for (const id of ids) {
        const block = verifiedBlocks().get(id);
        assert.ok(block, `missing verified block: ${id}`);
        assertBlockIsReal(id, block, actual);
      }
    });
  });
}

test('every verified documentation block is registered in this file', () => {
  // an unregistered `verified:` block is an unchecked claim wearing a badge
  const registered = new Set([
    'guide-report-css-example',
    'guide-dashboard-css-example',
    'report-css-example',
    'dashboard-css-example',
    'start-css-showcase',
    'landing-css-showcase',
    'consumers-example',
    'audit-radix',
    'audit-markup',
    'audit-not-checked',
    'scorecard-delta',
    'audit-css-inventory',
    'audit-css-suggestion',
  ]);
  for (const id of verifiedBlocks().keys()) {
    assert.ok(registered.has(id), `README block "${id}" is marked verified but nothing checks it`);
  }
  for (const id of registered) {
    assert.ok(verifiedBlocks().has(id), `registered sample is missing: ${id}`);
  }
});
