#!/usr/bin/env -S node --experimental-strip-types
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/commands/audit.ts';
import { planFixes } from '../src/commands/fix.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { withCheckout } from './checkout.mjs';
import { diff, measure } from './precision-measure.mjs';

// Unit tests assert the engine agrees with itself. This asserts what it says about
// public code nobody here wrote has not moved without a reason. Dev-only network access.
//
//   npm run precision                    verify every pinned repo; exit 1 on any change
//   npm run precision -- --update        re-record, after hand-checking what moved
//   --repo=<name>  --cache=<local clone>
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'benchmarks/precision.json');
const data = JSON.parse(readFileSync(path, 'utf8'));
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const update = process.argv.includes('--update');
const cache = arg('cache');
const selected = arg('repo');
const rows = selected ? data.repos.filter((r) => r.name === selected) : data.repos;
if (!rows.length) throw new Error('No matching repo');
if (cache && rows.length !== 1) throw new Error('--cache requires --repo');

let failed = 0;
for (const row of rows) {
  console.error(`Measuring ${row.name} at ${row.sha.slice(0, 7)}`);
  const measured = withCheckout(row, { cache }, (dir) => {
    const target = join(dir, row.scanPath);
    const report = audit(target, { config: DEFAULT_CONFIG, silent: true });
    return measure(report, planFixes(target, DEFAULT_CONFIG).length);
  });
  if (update) {
    row.measured = measured;
    row.date = new Date().toISOString().slice(0, 10);
    continue;
  }
  const changes = row.measured ? diff(row.measured, measured) : ['not recorded yet: run with --update'];
  if (changes.length === 0) {
    console.log(`  ok    ${row.name}`);
    continue;
  }
  failed++;
  console.log(`  FAIL  ${row.name}: ${changes.length} change(s) since ${row.date ?? 'never'}`);
  for (const change of changes) console.log(`        ${change}`);
}
if (update) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  recorded ${rows.length} repo(s). Say in the commit what moved and what you hand-checked.`);
} else if (failed) {
  console.log(
    `\n  ${failed} repo(s) moved. If the change is intended, hand-check a sample of what moved,\n  then re-record with --update and explain it in the commit. Otherwise it is a regression.`,
  );
  process.exit(1);
}
