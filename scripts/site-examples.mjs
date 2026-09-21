import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const engineVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const cases = [
  {
    id: 'finding',
    files: {
      'tokens.css':
        ':root {\n  --palette-blue-500: #1da1f2;\n  --brand: var(--palette-blue-500, #1da1f2);\n}\n',
      'Card.tsx':
        'export const Card = () => (\n  <div className="bg-[#1da1f2] p-[13px]">\n    <span className="text-[14px]" />\n  </div>\n);\n',
    },
    match: / {2}\[HIGH\] token\/raw-value-in-markup[\s\S]*?(?=\n\n)/,
  },
  {
    id: 'judgment',
    files: { 'tokens.css': ':root {\n  --ocean: #1da1f2;\n  --link: var(--ocean, #1da1f2);\n}\n' },
    match: / {2}\[LOW\] token\/tier-model-undetectable[\s\S]*?(?=\n\n)/,
  },
  {
    id: 'palette',
    files: {
      'theme.css': ':root {\n  --palette-blue-500: #2456ab;\n}\n',
      'Card.tsx': 'export const Card = () => <div className="bg-white">Account</div>;\n',
      'ds-loop.config.json': `${JSON.stringify({ tokenContexts: [{ files: ['Card.tsx'], tokens: ['theme.css'] }] }, null, 2)}\n`,
    },
    match: / {2}\[MEDIUM\] token\/stock-palette-utility[\s\S]*?(?=\n\n)/,
  },
  {
    id: 'unread',
    files: { 'theme.scss': '$brand: #1da1f2;\n', 'W.vue': '<template><div/></template>\n' },
    match: / {2}✗ not checked[\s\S]*?This is not a clean result\. Nothing was judged\./,
  },
];
const examples = cases.map(({ id, files, match }) => {
  const cwd = mkdtempSync(join(tmpdir(), 'ds-loop-example-'));
  try {
    for (const [name, source] of Object.entries(files)) writeFileSync(join(cwd, name), source);
    let output;
    try {
      output = execFileSync(
        process.execPath,
        ['--experimental-strip-types', '--no-warnings', join(root, 'src/cli.ts'), 'audit', '.'],
        { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      if (error.status !== 1 || !error.stdout) throw error;
      output = error.stdout;
    }
    const excerpt = output.match(match)?.[0];
    if (!excerpt) throw new Error(`Missing engine excerpt: ${id}`);
    return { id, engineVersion, files, output: excerpt };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
const serialized = `${JSON.stringify(examples, null, 2)}\n`;
const target = join(root, 'site/examples.json');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== serialized)
    throw new Error('Website examples are stale. Run npm run site:examples and update the HTML specimens.');
  const html = ['site/reference.html'].map((file) => ({
    file,
    content: readFileSync(join(root, file), 'utf8'),
  }));
  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#x27;');
  for (const example of examples) {
    for (const page of html) {
      if (!page.content.includes(escapeHtml(example.output)))
        throw new Error(`${page.file} differs from actual engine output: ${example.id}`);
    }
  }
  console.log(
    `${examples.length} website examples match engine ${engineVersion} output and the rendered HTML.`,
  );
} else {
  writeFileSync(target, serialized);
}
