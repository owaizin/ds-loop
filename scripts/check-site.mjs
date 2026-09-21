import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function htmlPages(folder) {
  return readdirSync(resolve(root, folder), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) return [];
    const path = `${folder}/${entry.name}`;
    return entry.isDirectory() ? htmlPages(path) : path.endsWith('.html') ? [path] : [];
  });
}
const pages = htmlPages('site');
let checked = 0;
for (const page of pages) {
  const file = resolve(root, page);
  const html = readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page} has duplicate IDs`);
  for (const [, target] of html.matchAll(/<button\b[^>]*\bdata-copy="([^"]+)"/g)) {
    assert.ok(ids.includes(target), `${page}: missing copy target ${target}`);
    assert.ok(ids.includes(`${target}-status`), `${page}: missing copy feedback ${target}`);
  }
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^[a-z]+:/i.test(raw)) continue;
    const [relative, fragment] = raw.split('#');
    const target = relative ? resolve(dirname(file), relative.split('?')[0]) : file;
    assert.ok(existsSync(target), `${page}: missing ${raw}`);
    if (fragment && extname(target) === '.html') {
      assert.ok(readFileSync(target, 'utf8').includes(`id="${fragment}"`), `${page}: missing anchor ${raw}`);
    }
    checked++;
  }
}
for (const page of [
  'README.md',
  'docs/guide/README.md',
  'docs/guide/install.md',
  'docs/guide/workflow.md',
  'docs/guide/reference.md',
  'docs/guide/output.md',
  'docs/guide/example.md',
]) {
  const file = resolve(root, page);
  for (const [, raw] of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    if (/^[a-z]+:/i.test(raw) || raw.startsWith('#')) continue;
    assert.ok(existsSync(resolve(dirname(file), raw.split('#')[0])), `${page}: missing ${raw}`);
    checked++;
  }
}
console.log(`${checked} local asset, page and documentation links resolve; HTML anchor IDs are unique.`);
