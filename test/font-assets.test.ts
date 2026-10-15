import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ASSESSMENT_CSS } from '../src/core/assessment-assets.ts';
import { VISUAL_CSS } from '../src/core/visual-system.ts';

test('exported report fonts match pinned licensed subsets and carry their notices', () => {
  const manifest = JSON.parse(readFileSync('licenses/fonts.json', 'utf8'));
  for (const [name, css, count] of [
    ['inter', ASSESSMENT_CSS, 7],
    ['manrope', VISUAL_CSS, 1],
  ] as const) {
    assert.ok(css.includes(readFileSync(`licenses/${name}-OFL.txt`, 'utf8')));
    const hashes = [...css.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)].map((m) =>
      createHash('sha256').update(Buffer.from(m[1], 'base64')).digest('hex'),
    );
    assert.equal(hashes.length, count);
    assert.deepEqual(hashes.sort(), Object.values(manifest[name].sha256).sort());
  }
  assert.doesNotMatch(ASSESSMENT_CSS, /data:image\//);
});
