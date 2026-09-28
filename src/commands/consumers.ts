import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { renderConsumersHtml } from '../core/consumers-html.ts';
import { type ConsumersReport, analyseConsumers } from '../core/consumers.ts';
/**
 * `ds-loop consumers [path] [--scope @org] [--json]` — which workspace package
 * imports which shared package, with counts, named imports and file:line
 * samples, plus exported subpaths nothing imports in production code.
 */
export function consumers(
  path: string,
  opts: { scope?: string; json?: boolean; html?: string; now?: string } = {},
): ConsumersReport {
  const report = analyseConsumers(resolve(path), { scope: opts.scope });
  if (opts.html) {
    const label = `${basename(resolve(path))}${opts.scope ? ` · ${opts.scope}` : ''}`;
    writeFileSync(
      opts.html,
      renderConsumersHtml(report, { label, generatedAt: opts.now ?? new Date().toISOString() }),
    );
  }
  if (opts.json) {
    console.log(JSON.stringify({ manifest: { tool: 'ds-loop', command: 'consumers' }, ...report }, null, 2));
    return report;
  }
  console.log(`\n  ds-loop consumers — ${path}`);
  if (report.packages.length === 0) {
    console.log('  no workspace packages found (package.json "workspaces" or pnpm-workspace.yaml)');
    console.log('  not checked — this is not the same as "nothing is shared"\n');
    return report;
  }
  console.log(
    `  ${report.packages.length} workspace packages from ${report.workspaceSource}${opts.scope ? ` · scope ${opts.scope}` : ''}\n`,
  );
  for (const c of report.consumers) {
    const u = c.usage.production;
    if (u.sharedComponentShare !== null || c.uses.length > 0)
      console.log(
        `  ${c.package}: shared-component share ${u.sharedComponentShare === null ? 'not checked (no shared/local JSX)' : `${(u.sharedComponentShare * 100).toFixed(1)}%`} · shared ${u.shared.elements} · local ${u.local.elements} · external ${u.external.elements} · unresolved ${u.unresolved.elements} · stories/tests ${c.usage.storiesAndTests.hits.length} JSX elements`,
      );
    if (c.uses.length === 0) continue;
    console.log(`  ${c.package}  (${c.platform}, ${c.dir}, ${c.files} source files)`);
    for (const u of c.uses) {
      const prod = u.production === u.count ? '' : ` · ${u.count - u.production} in stories/tests`;
      const top = Object.entries(u.names)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([n, k]) => `${n} ${k}`)
        .join(', ');
      console.log(`    ${u.specifier}  ${u.count} import(s)${prod}${top ? ` · ${top}` : ''}`);
      console.log(
        `      e.g. ${u.samples
          .slice(0, 2)
          .map((s) => `${s.file}:${s.line}`)
          .join(', ')}`,
      );
    }
    console.log('');
  }
  const idle = report.consumers.filter((c) => c.uses.length === 0).map((c) => c.package);
  if (idle.length) {
    const shown = idle.slice(0, 8).join(', ');
    console.log(
      `  ${idle.length} package(s) import none of these: ${shown}${idle.length > 8 ? `, +${idle.length - 8} more (--json)` : ''}\n`,
    );
  }
  if (report.unconsumedExports.length) {
    console.log('  exported, but no production import from another package');
    for (const e of report.unconsumedExports) {
      console.log(
        `    ${e.package}${e.subpath === '.' ? '' : e.subpath.slice(1)}${e.storyOrTestOnly ? '  (stories/tests only)' : ''}`,
      );
    }
    console.log('');
  }
  if (opts.html) console.log(`  wrote ${opts.html}\n`);
  console.log('  limits');
  for (const l of report.limits) console.log(`    ${l}`);
  console.log('');
  return report;
}
