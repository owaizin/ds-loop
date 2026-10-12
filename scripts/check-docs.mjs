import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
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
console.log(`${checked} local documentation links resolve.`);
