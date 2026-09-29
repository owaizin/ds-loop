import type { AuditReport } from '../commands/audit.ts';
import { type ScorecardRow, comparability } from '../commands/scorecard.ts';
import { type ReferenceSet, benchmarkHtml } from './benchmark.ts';
import type { ConsumersReport } from './consumers.ts';
import { PLAIN_RULES, PLAIN_VERDICTS, plainCoverage } from './plain.ts';
import { REPORT_CSS } from './report-html-assets.ts';
import { teamShape } from './team-shape.ts';
import { escapeHtml as esc } from './visual-system.ts';

/** Reject an invalid history as a whole: skipping a row could join unrelated instruments. */
export function dashboardHistory(history: string, label: string): { rows: ScorecardRow[]; note?: string } {
  const rows: ScorecardRow[] = [];
  try {
    for (const line of history.split('\n').filter((s) => s.trim())) {
      const row = JSON.parse(line);
      if (
        !row ||
        !['ranAt', 'label', 'fixtureSha', 'adapters', 'configHash'].every(
          (k) => typeof row[k] === 'string',
        ) ||
        !Number.isFinite(Date.parse(row.ranAt)) ||
        typeof row.coverageComplete !== 'boolean' ||
        (row.docsVersion !== undefined && typeof row.docsVersion !== 'string') ||
        (row.consumersVersion !== undefined && typeof row.consumersVersion !== 'string') ||
        !row.ratios ||
        typeof row.ratios !== 'object' ||
        Array.isArray(row.ratios) ||
        !Object.values(row.ratios).every((n) => typeof n === 'number' && Number.isFinite(n))
      ) {
        return { rows: [], note: 'History contains an invalid row; no trend shown.' };
      }
      if (row.label === label) rows.push(row);
    }
  } catch {
    return { rows: [], note: 'History contains invalid JSON; no trend shown.' };
  }
  // Preserve append order: a reversed timestamp is invalid, not a reason to reorder instruments.
  if (rows.some((r, i) => i > 0 && Date.parse(r.ranAt) < Date.parse(rows[i - 1].ranAt)))
    return { rows: [], note: 'History dates are out of order; no trend shown.' };
  return { rows };
}

const percent = (n: number | undefined) => (n === undefined ? 'not checked' : `${(n * 100).toFixed(1)}%`);
const ratioName = (key: string) =>
  key.replace('style-tokenization-', '').replace('shared-component-share:', '');

/** One labelled panel per series: position, points and line patterns carry meaning without colour. */
function chart(key: string, rows: ScorecardRow[], today: ScorecardRow): string {
  const values = rows.map((r) => r.ratios[key]);
  const start = Date.parse(rows[0]?.ranAt ?? today.ranAt);
  const duration = Date.parse(rows.at(-1)?.ranAt ?? today.ranAt) - start;
  const x = (i: number) =>
    38 + 484 * (duration ? (Date.parse(rows[i].ranAt) - start) / duration : i / Math.max(1, rows.length - 1));
  const y = (v: number) => 150 - v * 120;
  const lines = values
    .map((v, i) =>
      i > 0 && v !== undefined && values[i - 1] !== undefined && comparability(rows[i - 1], rows[i]).clean
        ? `<line data-trend-segment x1="${x(i - 1)}" y1="${y(values[i - 1])}" x2="${x(i)}" y2="${y(v)}" stroke="currentColor" stroke-width="2"/>`
        : '',
    )
    .join('');
  const points = values
    .map((v, i) =>
      v === undefined
        ? ''
        : `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="currentColor"><title>${esc(rows[i].ranAt)}: ${percent(v)}</title></circle>`,
    )
    .join('');
  const boundaries = rows
    .map((r, i) =>
      i > 0 && !comparability(rows[i - 1], r).clean
        ? `<line x1="${(x(i - 1) + x(i)) / 2}" x2="${(x(i - 1) + x(i)) / 2}" y1="24" y2="154" stroke="currentColor" stroke-dasharray="4 4"/><text x="${(x(i - 1) + x(i)) / 2}" y="18" text-anchor="middle">instrument changed</text>`
        : '',
    )
    .join('');
  return `<article class="series"><h3>${esc(ratioName(key))}</h3><p><strong>${percent(today.ratios[key])}</strong> today</p>${rows.length ? `<svg viewBox="0 0 560 190" role="img" aria-label="${esc(ratioName(key))} saved ratios; values in the table below"><text x="0" y="34">100%</text><text x="10" y="154">0%</text><path d="M38 30V150H522" fill="none" stroke="currentColor" opacity=".4"/>${lines}${points}${boundaries}<text x="38" y="178">${esc(rows[0].ranAt.slice(0, 10))}</text><text x="522" y="178" text-anchor="end">${esc(rows.at(-1)!.ranAt.slice(0, 10))}</text></svg><details><summary>Dates and values: ${esc(ratioName(key))}</summary><div class="table-wrap" tabindex="0" role="region" aria-label="${esc(ratioName(key))} history"><table><thead><tr><th scope="col">Run date</th><th scope="col">Ratio</th><th scope="col">Coverage</th><th scope="col">Comparison</th></tr></thead><tbody>${rows.map((r, i) => `<tr><th scope="row">${esc(r.ranAt)}</th><td>${percent(r.ratios[key])}</td><td>${r.coverageComplete ? 'Complete within adapter scope' : 'Incomplete'}</td><td>${i === 0 ? 'Baseline' : comparability(rows[i - 1], r).clean ? 'Same instrument' : 'instrument changed — not a comparison'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}</article>`;
}

export function renderDashboardHtml(
  report: AuditReport,
  today: ScorecardRow,
  consumers: ConsumersReport,
  history: string,
  target: string,
  against?: ReferenceSet,
): string {
  const parsed = dashboardHistory(history, today.label);
  // Ratios plotted here have a 0–1 domain. Never clip bad data into a plausible graph.
  const invalid = parsed.rows.some((r) =>
    Object.entries(r.ratios).some(
      ([k, v]) => /^(style-tokenization-|shared-component-share:)/.test(k) && (v < 0 || v > 1),
    ),
  );
  const rows = invalid ? [] : parsed.rows;
  const trend = rows.length >= 2 ? rows : [];
  const keys = [...new Set([...Object.keys(today.ratios), ...trend.flatMap((r) => Object.keys(r.ratios))])];
  const tokens = [
    ...new Set(
      ['color', 'spacing', 'typography', 'elevation', 'motion']
        .map((c) => `style-tokenization-${c}`)
        .concat(keys.filter((k) => k.startsWith('style-tokenization-'))),
    ),
  ];
  const shares = keys.filter((k) => k.startsWith('shared-component-share:')).sort();
  const notices = trend.flatMap((r, i) => {
    const c = comparability(i ? trend[i - 1] : null, r);
    return c.clean ? [] : [`${r.ranAt}: instrument changed — not a comparison. ${c.reason}.`];
  });
  const currentComparison = comparability(rows.at(-1) ?? null, today);
  if (!currentComparison.clean)
    notices.push(`Today: instrument changed — not a comparison. ${currentComparison.reason}.`);
  const themes = new Map<string, string[]>();
  for (const f of report.findings) {
    const theme =
      typeof f.data?.category === 'string'
        ? f.data.category
        : f.ruleId.startsWith('color/')
          ? 'Colour'
          : 'Token foundations';
    themes.set(theme, [
      ...(themes.get(theme) ?? []),
      `<li><strong>${esc(PLAIN_RULES[f.ruleId]?.title ?? f.ruleId)}</strong> · ${esc(f.severity)}<p>${esc(PLAIN_RULES[f.ruleId]?.description ?? f.summary)}</p><code>${esc(f.where)}</code></li>`,
    ]);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Design System Loop — ${esc(today.label)} dashboard</title><style>${REPORT_CSS}
main{max-width:1440px;padding:32px clamp(20px,5vw,80px)}h1{font-size:clamp(32px,4vw,48px);line-height:1.13}h2{font-size:26px}.dashboard-head{border-bottom:1px solid var(--line);padding-bottom:24px}.dashboard-head p{max-width:68ch}.dashboard-grid{display:grid;grid-template-columns:2fr 1fr;gap:32px}.series-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.series{min-width:0;border-top:1px solid var(--line);padding:16px 0}.series h3{margin:0;text-transform:capitalize;overflow-wrap:anywhere}.series strong{font-size:28px;font-weight:500}.series svg{width:100%;height:auto;color:var(--accent);display:block}.series text{fill:var(--muted);font:12px system-ui}.dashboard-grid>*{min-width:0}.notice{border-left:3px dashed var(--accent);padding:12px 20px;background:var(--card)}.theme-list{list-style:none;padding:0}.theme-list li{border-top:1px solid var(--line);padding:12px 0}.basis{font-size:14px;color:var(--muted)}@media(max-width:800px){.dashboard-grid{grid-template-columns:1fr}}@media(max-width:500px){.series-grid{grid-template-columns:1fr}}@page{margin:18mm}@media print{.dashboard-grid{display:block}.series{break-inside:avoid}.toolbar{display:none}}
</style></head><body><main><div class="toolbar"><span class="kicker">Design System Loop / Dashboard</span><label>Appearance <select id="theme"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div><header class="dashboard-head"><p>${esc(today.label)} · <time>${esc(today.ranAt)}</time></p><h1>${esc(PLAIN_VERDICTS[report.verdict].title)}</h1><p>${esc(PLAIN_VERDICTS[report.verdict].description)}</p><p>Coverage: <strong>${report.coverage.complete ? 'Complete within adapter scope' : 'Incomplete'}</strong>. Today is a fresh audit, not a saved history row.</p></header>
${parsed.note || invalid ? `<p class="notice">${esc(parsed.note ?? 'History contains an out-of-range ratio; no trend shown.')}</p>` : ''}
${!trend.length ? `<p class="notice">Fewer than two saved rows for this source. Showing today’s state alone. ${rows.length === 1 ? `One baseline recorded at ${esc(rows[0].ranAt)}.` : 'No usable baseline recorded.'} Record ${rows.length === 1 ? 'the next run' : 'the first baseline'} with <code>ds-loop scorecard ${esc(JSON.stringify(target))}</code>, then regenerate this dashboard.</p>` : '<p class="basis">Saved runs below; dates and all values are available under each chart. Dashed dividers mark instrument changes. No line crosses a divider. History matches source labels, not full paths; numeric direction does not establish product quality.</p>'}
${notices.map((n) => `<p class="notice">${esc(n)}</p>`).join('')}
${benchmarkHtml(report, teamShape(consumers.root, consumers), against)}
<div class="dashboard-grid"><div><section><h2>Tokenization over time</h2><p class="basis">Reference-only values / (literal + reference + mixed values). Not reference resolution. Missing measurements remain not checked.</p><div class="series-grid">${tokens.map((k) => chart(k, trend, today)).join('')}</div></section><section><h2>Shared-component share per package</h2><p class="basis">Production shared JSX / (shared + local JSX). Static usage, not runtime adoption.</p><div class="series-grid">${shares.map((k) => chart(k, trend, today)).join('') || '<p>not checked — no shared/local production JSX measured.</p>'}</div></section></div><aside><section><h2>Findings by theme</h2>${[...themes].map(([theme, findings]) => `<h3>${esc(theme)}</h3><ul class="theme-list">${findings.join('')}</ul>`).join('') || '<p>No findings reported; read the coverage limits.</p>'}</section><section><h2>Coverage</h2><ul>${[...plainCoverage(report.coverage), ...consumers.limits].map((s) => `<li>${esc(s)}</li>`).join('')}</ul><p class="basis">Use <code>ds-loop audit --require-coverage</code> as your CI gate. Regenerating this file does not record a baseline.</p></section></aside></div></main><script>document.getElementById('theme').addEventListener('change',e=>{document.documentElement.dataset.theme=e.target.value;});</script></body></html>`;
}
