import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { LoadedConfig } from '../config/load.ts';
import { adoptionReport } from '../core/adoption.ts';
import type { ReferenceSet } from '../core/benchmark.ts';
import { renderConsultHtml } from '../core/consult-html.ts';
import { type Consult, checkConsult } from '../core/consult.ts';
import { analyseConsumers } from '../core/consumers.ts';
import { resolveSource } from '../core/source.ts';
import { type AuditReport, audit } from './audit.ts';
import { readHistory } from './scorecard.ts';

/** Report generation succeeds even with findings; malformed inputs and I/O failures do not. */
export function report(
  path: string,
  loaded: LoadedConfig,
  opts: {
    consult?: string;
    out?: string;
    against?: ReferenceSet;
    measured?: AuditReport;
    silent?: boolean;
    exclusive?: boolean;
  } = {},
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
  const measured =
    opts.measured ??
    audit(path, {
      config: loaded.config,
      severityOverrides: loaded.severityOverrides,
      silent: true,
    });
  const extractedRoot = resolveSource(path).source.root;
  const evidenceRoot = statSync(extractedRoot).isDirectory() ? extractedRoot : dirname(extractedRoot);
  let history: ReturnType<typeof readHistory> = [];
  let historyError: string | undefined;
  try {
    history = readHistory(join(process.cwd(), '.ds-scorecard', 'history.jsonl'), () => {
      historyError = 'Scorecard history contains invalid rows; adoption was not checked.';
    });
    if (historyError) history = [];
  } catch {
    historyError = 'Scorecard history could not be read; adoption was not checked.';
  }
  const html = renderConsultHtml(
    measured,
    analyseConsumers(root),
    evidenceRoot,
    consult,
    opts.against,
    adoptionReport(history, measured.manifest.fixtureLabel),
    historyError,
  );
  const output = resolve(opts.out ?? 'ds-loop-report.html');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, html, { flag: opts.exclusive ? 'wx' : 'w' });
  if (!opts.silent) {
    console.log(`  ds-loop report — ${measured.manifest.fixtureLabel}`);
    console.log(`  wrote ${opts.out ?? 'ds-loop-report.html'}`);
  }
  return output;
}
