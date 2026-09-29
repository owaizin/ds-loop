import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { LoadedConfig } from '../config/load.ts';
import { analyseConsumers } from '../core/consumers.ts';
import { renderDashboardHtml } from '../core/dashboard-html.ts';
import { audit } from './audit.ts';
import { scorecardRow } from './scorecard.ts';

/** A fresh state plus saved history. Never appends a scorecard row. */
export function dashboard(
  path: string,
  loaded: LoadedConfig,
  opts: { out?: string; historyDir?: string; configPath?: string } = {},
): string {
  const target = resolve(path);
  const root = statSync(target).isDirectory() ? target : dirname(target);
  const measured = audit(path, {
    config: loaded.config,
    severityOverrides: loaded.severityOverrides,
    silent: true,
  });
  const consumers = analyseConsumers(root);
  const historyPath = resolve(opts.historyDir ?? process.cwd(), '.ds-scorecard/history.jsonl');
  const history = existsSync(historyPath) ? readFileSync(historyPath, 'utf8') : '';
  const html = renderDashboardHtml(measured, scorecardRow(measured, consumers), consumers, history, path);
  const output = resolve(opts.out ?? 'ds-loop-dashboard.html');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, html);
  // Remember the target/config for guard refresh, including custom output paths.
  const registry = resolve('node_modules/.cache/ds-loop/dashboards.json');
  let entries: { target: string; out: string; config?: string }[] = [];
  try {
    const saved = JSON.parse(readFileSync(registry, 'utf8'));
    if (Array.isArray(saved))
      entries = saved.filter(
        (e) =>
          e &&
          typeof e.target === 'string' &&
          typeof e.out === 'string' &&
          (e.config === undefined || typeof e.config === 'string'),
      );
  } catch {
    /* no registry yet */
  }
  entries = entries.filter((e) => e.out !== output);
  entries.push({ target, out: output, ...(opts.configPath ? { config: resolve(opts.configPath) } : {}) });
  mkdirSync(dirname(registry), { recursive: true });
  writeFileSync(registry, JSON.stringify(entries));
  console.log(`  ds-loop dashboard — ${measured.manifest.fixtureLabel}`);
  console.log(`  wrote ${opts.out ?? 'ds-loop-dashboard.html'}`);
  return output;
}
