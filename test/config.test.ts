import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { hashConfig } from '../src/config/schema.ts';

test('hashConfig distinguishes configs that differ anywhere, at any depth', () => {
  // regression: the first version passed a property allowlist to JSON.stringify,
  // so every config hashed to the same constant and the threshold leg of the
  // attribution model silently did nothing
  const base = DEFAULT_CONFIG;
  const deeper = { ...base, clustering: { ...base.clustering, deltaE: base.clustering.deltaE + 0.8 } };
  assert.notEqual(hashConfig(base), hashConfig(deeper), 'a changed threshold must change the hash');

  const taxonomyChanged = {
    ...base,
    taxonomy: { ...base.taxonomy, shadowAlphaCeiling: base.taxonomy.shadowAlphaCeiling + 0.1 },
  };
  assert.notEqual(hashConfig(base), hashConfig(taxonomyChanged));

  const listChanged = {
    ...base,
    taxonomy: { ...base.taxonomy, scaleUtilities: [...base.taxonomy.scaleUtilities, 'grid-cols'] },
  };
  assert.notEqual(hashConfig(base), hashConfig(listChanged));

  // and it must not depend on key order
  const reordered = { sweep: base.sweep, taxonomy: base.taxonomy, clustering: base.clustering };
  assert.equal(hashConfig(base), hashConfig(reordered as typeof base), 'key order must not matter');
  assert.equal(hashConfig(base), hashConfig(structuredClone(base)));
});
