import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { LoadedConfig } from '../config/load.ts';
import { renderConsultHtml } from '../core/consult-html.ts';
import { type Consult, checkConsult } from '../core/consult.ts';
import { analyseConsumers } from '../core/consumers.ts';
import { resolveSource } from '../core/source.ts';
import { audit } from './audit.ts';

/** Report generation succeeds even with findings; malformed inputs and I/O failures do not. */
export function report(
  path: string,
  loaded: LoadedConfig,
  opts: { consult?: string; out?: string } = {},
): string {
  let consult: Consult | undefined;
  if (opts.consult) {
    const input: unknown = JSON.parse(readFileSync(opts.consult, 'utf8'));
    const checked = checkConsult(input);
    if (checked.errors.length)
      throw new Error(`Invalid consult file:\n${checked.errors.map((e) => `  - ${e}`).join('\n')}`);
    consult = input as Consult;
  }
  const source = resolve(path);
  const root = statSync(source).isDirectory() ? source : dirname(source);
  const measured = audit(path, {
    config: loaded.config,
    severityOverrides: loaded.severityOverrides,
    silent: true,
  });
  const extractedRoot = resolveSource(path).source.root;
  const evidenceRoot = statSync(extractedRoot).isDirectory() ? extractedRoot : dirname(extractedRoot);
  const html = renderConsultHtml(measured, analyseConsumers(root), evidenceRoot, consult);
  const output = resolve(opts.out ?? 'ds-loop-report.html');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, html);
  console.log(`  ds-loop report — ${measured.manifest.fixtureLabel}`);
  console.log(`  wrote ${opts.out ?? 'ds-loop-report.html'}`);
  return output;
}
