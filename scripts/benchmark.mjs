#!/usr/bin/env -S node --experimental-strip-types
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptersFor } from '../src/adapters/registry.ts';
import { audit } from '../src/commands/audit.ts';
import { BENCHMARK_POLICY } from '../src/config/benchmark.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { benchmarkMeasurement, isMeasurableReference } from '../src/core/benchmark.ts';
import { resolveSource } from '../src/core/source.ts';

// Dev-only network access. Every Git mutation is confined to a fresh OS temp directory.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = process.argv.find((a) => a.startsWith('--data='))?.slice(7);
const path = dataPath ? resolve(dataPath) : join(root, 'benchmarks/reference.json');
const data = JSON.parse(readFileSync(path, 'utf8'));
const verify = process.argv.includes('--verify');
const pin = process.argv.includes('--pin');
if (verify && pin) throw new Error('--verify cannot update pins');
const stable = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const cache = process.argv.find((a) => a.startsWith('--cache='))?.slice(8);
const selected = process.argv.find((a) => a.startsWith('--repo='))?.slice(7);
const measuredRows = [...data.references, ...(data.unmeasurable ?? []), ...(data.pendingMeasurements ?? [])];
const pool = pin ? [...measuredRows, ...(data.candidates ?? [])] : measuredRows;
const rows = selected ? pool.filter((r) => r.name === selected) : pool;
if (cache && rows.length !== 1 && !verify)
  throw new Error('--cache requires --repo when measuring multiple references');
if (!rows.length) throw new Error('No matching reference');
for (const row of verify ? rows.slice(0, 1) : rows) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-benchmark-'));
  const git = (...args) =>
    execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    console.error(`Measuring ${row.name}`);
    git('init', '--quiet');
    git('remote', 'add', 'origin', row.url);
    if (pin && !row.sha) row.sha = git('ls-remote', 'origin', 'HEAD').split(/\s/)[0];
    if (!/^[a-f0-9]{40}$/.test(row.sha)) throw new Error(`Invalid pin: ${row.name}`);
    git('fetch', '--quiet', '--depth=1', cache ? resolve(cache) : 'origin', row.sha);
    git('checkout', '--quiet', '--detach', 'FETCH_HEAD');
    for (const file of [row.scanPath, row.licenseFile]) {
      if (typeof file !== 'string' || file.startsWith('/') || file.split(/[\\/]/).includes('..'))
        throw new Error('Reference paths must stay inside the checkout');
    }
    const licenseText = readFileSync(join(dir, row.licenseFile), 'utf8');
    const markers = {
      MIT: /Permission is hereby granted, free of charge/i,
      'Apache-2.0': /Apache License/i,
      'BSD-3-Clause': /Redistribution and use in source and binary forms/i,
    };
    if (!markers[row.license]?.test(licenseText)) throw new Error(`License needs review: ${row.name}`);
    const report = audit(join(dir, row.scanPath), { config: DEFAULT_CONFIG, silent: true });
    const measured = {
      ...benchmarkMeasurement(report),
      totalValues: (() => {
        const { source } = resolveSource(join(dir, row.scanPath));
        return adaptersFor(source, DEFAULT_CONFIG).flatMap((a) => a.extract(source, DEFAULT_CONFIG)).length;
      })(),
      adapters: report.manifest.adapter,
      configHash: report.manifest.configHash,
    };
    if (pin && !Object.keys(report.ratios).some((k) => k.startsWith('style-tokenization-')))
      throw new Error(`No tokenization measured: ${row.name}`);
    const eligible = isMeasurableReference(measured);
    const unread = Object.keys(report.coverage.unreadFormats).join(', ');
    const manifests = [dir, join(dir, row.scanPath)]
      .flatMap((scope) => {
        try {
          return [readFileSync(join(scope, 'package.json'), 'utf8')];
        } catch {
          return [];
        }
      })
      .join('\n');
    const cssInJs = /"(?:@mui\/|@material-ui\/|@chakra-ui\/|@emotion\/|styled-components)/.test(manifests);
    const reason =
      (data.unmeasurable?.includes(row) ? row.reason : undefined) ??
      (cssInJs
        ? `Styles use CSS-in-JS dependencies (including MUI/Chakra/Emotion where present), which no adapter reads; no dimension reaches ${BENCHMARK_POLICY.minOccurrences} classified occurrences.`
        : unread
          ? `Likely unread styles: ${unread}; no dimension reaches ${BENCHMARK_POLICY.minOccurrences} classified occurrences.`
          : `No dimension reaches ${BENCHMARK_POLICY.minOccurrences} classified occurrences. No unread format identified; CSS-in-JS and inline style objects are possible coverage gaps.`);
    if (pin && !eligible) throw new Error(`Refusing to promote ${row.name}: ${reason}`);
    if (verify) {
      for (const key of ['ratios', 'occurrences', 'totalValues', 'adapters', 'configHash']) {
        if (stable(row[key]) !== stable(measured[key])) throw new Error(`${row.name}: ${key} drifted`);
      }
      console.error(`Verified ${row.name} at ${row.sha}`);
    } else {
      Object.assign(row, measured, {
        previousMeasurement: undefined,
        measurementStatus: undefined,
        date: new Date().toISOString().slice(0, 10),
        coverage: report.coverage,
      });
      data.references = data.references.filter((r) => r.name !== row.name);
      data.unmeasurable = (data.unmeasurable ?? []).filter((r) => r.name !== row.name);
      if (eligible) {
        row.reason = undefined;
        data.references.push(row);
      } else {
        row.reason = reason;
        data.unmeasurable.push(row);
        console.error(`Excluded ${row.name}: ${reason}`);
      }
      data.pendingMeasurements = (data.pendingMeasurements ?? []).filter((r) => r.name !== row.name);
      data.candidates = (data.candidates ?? []).filter((r) => r.name !== row.name);
      data.schemaVersion = 2;
      writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
