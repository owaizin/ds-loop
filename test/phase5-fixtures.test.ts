import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { test } from 'node:test';

test('public Phase 5 fixture files retain their recorded upstream package bytes', () => {
  for (const name of ['sanity-token-json', 'fontsource-scss']) {
    const root = join('fixtures', name);
    const meta = JSON.parse(readFileSync(join(root, 'SOURCE.json'), 'utf8'));
    for (const [upstream, digest] of Object.entries(meta.fileSha256)) {
      const bytes = readFileSync(join(root, meta.path, basename(upstream)));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, `${name}/${upstream}`);
    }
  }
});
