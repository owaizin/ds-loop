import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseColor } from '../color/convert.ts';
import type { AuditReport } from '../commands/audit.ts';
import type { ScorecardRow } from '../commands/scorecard.ts';
import { type Finding, SEVERITY_ORDER } from '../rules/types.ts';
import { REPORT_CSS, REPORT_SCRIPT } from './report-html-assets.ts';
import { formatSuggestion } from './token-suggestions.ts';

const htmlEscape = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const json = (value: unknown): string =>
  JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
const list = (items: string[], empty: string) =>
  items.length
    ? `<ul>${items.map((s) => `<li>${htmlEscape(s)}</li>`).join('')}</ul>`
    : `<p>${htmlEscape(empty)}</p>`;
const inspect = (path: (string | number)[], label: string) =>
  `<details><summary>${htmlEscape(label)}</summary><div data-inspect="${htmlEscape(JSON.stringify(path))}"></div></details>`;

/** Invalid rows break the comparison rather than disappearing from a trend. */
export function historyTrend(
  report: AuditReport,
  history: string,
): { rows: ScorecardRow[]; reason?: string } {
  const no = (reason: string) => ({ rows: [], reason });
  if (
    report.manifest.target !== 'all' ||
    report.manifest.judgedFiles !== undefined ||
    report.manifest.minSeverity
  )
    return no('No trend for a filtered audit. Scorecard rows do not record equivalent filters.');
  if (!history.trim())
    return no('No scorecard history was found. This report does not write a scorecard row.');
  const rows: ScorecardRow[] = [];
  try {
    for (const line of history.split('\n').filter((l) => l.trim())) {
      const r = JSON.parse(line);
      if (
        !r ||
        !['ranAt', 'label', 'fixtureSha', 'adapters', 'configHash'].every((k) => typeof r[k] === 'string') ||
        !Number.isFinite(Date.parse(r.ranAt)) ||
        typeof r.coverageComplete !== 'boolean' ||
        !Number.isFinite(r.findingCount) ||
        !r.ratios ||
        typeof r.ratios !== 'object' ||
        Array.isArray(r.ratios) ||
        !Object.values(r.ratios).every((n) => typeof n === 'number' && Number.isFinite(n))
      )
        return no('No trend: history contains an invalid row.');
      if (r.label === report.manifest.fixtureLabel) rows.push(r);
    }
  } catch {
    return no('No trend: history contains invalid JSON.');
  }
  if (!rows.length) return no('No scorecard rows match this source label.');
  const matches = (r: ScorecardRow) =>
    r.adapters === report.manifest.adapter && r.configHash === report.manifest.configHash;
  if (!matches(rows.at(-1)!))
    return no('No trend: instrument moved — the latest row has different adapters or configuration.');
  const start = rows.findLastIndex((r) => !matches(r)) + 1;
  const comparable = rows.slice(start);
  if (comparable.length < 2)
    return no(
      'Fewer than two consecutive rows use the current adapters and configuration. No delta reported.',
    );
  return { rows: comparable };
}

function swatch(value: string): string {
  const c = parseColor(value);
  if (!c || !Object.values(c).every(Number.isFinite)) return '';
  // Only numeric output from the engine's colour parser enters a CSS attribute.
  return `<span class="swatch" aria-hidden="true" style="background:rgba(${c.r},${c.g},${c.b},${c.a})"></span>`;
}
function examples(f: Finding): string[] {
  const result: string[] = [];
  function visit(value: unknown): void {
    if (result.length >= 3 || !value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    if (typeof v.file === 'string' && typeof v.line === 'number') {
      const location = `${v.file}:${v.line}`;
      if (!result.includes(location)) result.push(location);
    }
    for (const child of Object.values(v)) {
      if (result.length >= 3) break;
      visit(child);
    }
  }
  visit(f.data);
  if (!result.length) visit(f.suggestion);
  return result;
}
function finding(f: Finding): string {
  const locations = examples(f);
  return `<article class="finding"><h4>${htmlEscape(f.summary)}</h4><p><strong>where:</strong> ${htmlEscape(f.where)}</p>${locations.length ? `<p class="muted">Example locations: ${locations.map(htmlEscape).join(' · ')}</p>` : ''}${f.impact ? `<p><strong>risk:</strong> ${htmlEscape(f.impact)}</p>` : ''}<p><strong>fix:</strong> ${htmlEscape(f.fix)}</p>${f.suggestion ? `<pre>suggest: ${htmlEscape(formatSuggestion(f.suggestion))}</pre>` : ''}</article>`;
}

/** Pure view: no scanning, rule execution, clock reads or scorecard writes. */
export function renderAuditHtml(
  report: AuditReport,
  options: { history?: string; historyError?: string; timestamp?: string } = {},
): string {
  const r = options.timestamp
    ? { ...report, manifest: { ...report.manifest, ranAt: options.timestamp } }
    : report;
  const groups: { severity: Finding['severity']; rule: string; indices: number[] }[] = [];
  const byKey = new Map<string, (typeof groups)[number]>();
  r.findings.forEach((f, i) => {
    const key = `${f.severity}:${f.ruleId}`;
    let group = byKey.get(key);
    if (!group) {
      group = { severity: f.severity, rule: f.ruleId, indices: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.indices.push(i);
  });
  groups.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.rule.localeCompare(b.rule),
  );
  const trend = options.historyError
    ? { rows: [], reason: options.historyError }
    : historyTrend(r, options.history ?? '');
  const suggestions = Object.fromEntries(
    r.findings.flatMap((f, i) => (f.suggestion ? [[i, formatSuggestion(f.suggestion)]] : [])),
  );
  const swatches: Record<string, string> = Object.create(null);
  function collectSwatches(value: unknown): void {
    if (typeof value === 'string') {
      const color = parseColor(value);
      if (color && Object.values(color).every(Number.isFinite))
        swatches[value] = `rgba(${color.r},${color.g},${color.b},${color.a})`;
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) collectSwatches(child);
    }
  }
  collectSwatches(r.styleInventory.color);
  collectSwatches(r.findings);
  const c = r.coverage;
  const inventory = Object.entries(r.styleInventory)
    .map(([category, row]) => {
      const parts = [
        ['literal', row.literals],
        ['reference', row.references],
        ['mixed', row.mixed],
        ['ambiguous', row.unclassified],
        ['excluded', row.excluded],
      ] as const;
      return `<article class="card"><h3>${htmlEscape(category)}</h3><span class="metric">${row.occurrences}</span> occurrences · ${row.distinctValues} distinct values
    <div class="bar" aria-hidden="true">${parts.map(([name, n]) => `<span class="${name}" style="width:${row.occurrences ? (n / row.occurrences) * 100 : 0}%"></span>`).join('')}</div>
    <div class="legend">${parts.map(([name, n]) => `<span><i class="${name}"></i>${name} ${n}</span>`).join('')}</div>
    <p>Tokenization: <strong>${row.tokenizationRatio === null ? 'not measured' : `${(row.tokenizationRatio * 100).toFixed(1)}%`}</strong></p>
    <p class="muted">References ÷ (literals + references + mixed). Ambiguous and excluded values are outside this ratio.</p>
    <h4>Top files</h4>${list(
      row.topFiles.slice(0, 3).map((f) => `${f.file} · ${f.occurrences}`),
      'No files recorded.',
    )}
    <ul class="values">${row.values
      .slice(0, 3)
      .map(
        (v) =>
          `<li>${category === 'color' ? swatch(v.value) : ''}<code>${htmlEscape(v.value)}</code> · ${v.occurrences}<br><small>${htmlEscape(v.property)} · ${htmlEscape(v.classification)}</small></li>`,
      )
      .join('')}</ul>
    ${inspect(['report', 'styleInventory', category], 'All values, counts and source locations')}</article>`;
    })
    .join('');
  const trendRows = trend.rows;
  const ratioKeys = [...new Set(trendRows.flatMap((row) => Object.keys(row.ratios)))].sort();
  const trendView = trend.reason
    ? `<p>${htmlEscape(trend.reason)}</p>`
    : `<p>${trendRows.length} consecutive rows with matching source label, adapters and configuration. Numeric direction does not measure product quality. History stores source labels, not full paths or file scope.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Scorecard ratios"><table><thead><tr><th>Ratio</th><th>First row</th><th>Latest row</th><th>Change</th></tr></thead><tbody>${ratioKeys
        .map((key) => {
          const a = trendRows[0].ratios[key];
          const b = trendRows.at(-1)!.ratios[key];
          return `<tr><th>${htmlEscape(key)}</th><td>${a ?? 'not recorded'}</td><td>${b ?? 'not recorded'}</td><td>${a === undefined || b === undefined ? 'not comparable' : Number((b - a).toFixed(6))}</td></tr>`;
        })
        .join(
          '',
        )}</tbody></table></div><p>${htmlEscape(trendRows[0].ranAt)} → ${htmlEscape(trendRows.at(-1)!.ranAt)}</p>${trendRows.some((row) => !row.coverageComplete) ? '<p>Some history rows report incomplete coverage. Those rows do not record detailed coverage limits.</p>' : ''}${inspect(['trend', 'rows'], 'All comparable rows and source revisions')}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ds-loop audit — ${htmlEscape(r.manifest.fixtureLabel)}</title><style>${REPORT_CSS}</style></head><body><main>
  <div class="toolbar"><span class="kicker">ds-loop / audit report</span><label>Appearance <select id="theme"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div>
  <h1>${htmlEscape(r.manifest.fixtureLabel)}</h1><p class="muted">Generated from the audit. No rendered UI or design intent was assessed.</p>
  <nav aria-label="Report sections"><a href="#coverage">Coverage</a><a href="#inventory">Inventory</a><a href="#findings">Findings</a><a href="#trend">Trend</a><a href="#next">Next</a></nav>
  <div class="hero"><div class="card"><span class="kicker">Verdict</span><div class="status">${htmlEscape(r.verdict)}</div><p>${r.findings.length} findings · ${r.rulesRun.length} rules run</p><p>A clean audit only describes the checks and scope it covered.</p>${inspect(['report', 'rulesRun'], 'Rules run')}${inspect(['report', 'manifest'], 'Full manifest and scope')}</div><div class="card ${c.complete ? '' : 'limited'}"><span class="kicker">Coverage</span><div class="status">${c.complete ? 'Complete within declared reads' : 'Incomplete'}</div><p>${r.verdict === 'not-checked' ? 'Nothing was judged. This is not a clean result.' : 'Read the limits below before acting on this verdict.'}</p><dl><dt>Source revision</dt><dd>${htmlEscape(r.manifest.fixtureSha)}</dd><dt>Adapters</dt><dd>${htmlEscape(r.manifest.adapter)}</dd><dt>Configuration · date</dt><dd>${htmlEscape(r.manifest.configHash)} · ${htmlEscape(r.manifest.ranAt)}</dd><dt>Scope</dt><dd>${htmlEscape(r.manifest.target)} · severity floor: ${htmlEscape(r.manifest.minSeverity ?? 'none')} · ${r.manifest.judgedFiles === undefined ? 'no file filter' : `${r.manifest.judgedFiles.length} selected files`}</dd></dl></div></div>
  <section id="coverage"><h2>01 / What was checked</h2><div class="coverage"><article class="card"><h3>Read</h3>${list(
    c.partialReads.map((p) => `${p.adapter} (${p.extensions.join(', ')}): ${p.reads}`),
    'No adapter reads this source.',
  )}</article><article class="card"><h3>Not read</h3>${list(
    Object.entries(c.unreadFormats).map(([ext, n]) => `${ext}: ${n} files`),
    'No unread formats reported.',
  )}${list(c.unreadTokenFiles, 'No unread token files reported.')}</article><article class="card"><h3>Could not judge</h3>${list(c.couldNotJudge, 'No rule judgment limits reported.')}<p>Unconvertible colours: ${c.unconvertible.count}</p><p>Unclassified style values: ${c.unclassifiedStyles?.count ?? 0}</p><p>Undecided colour roles: ${c.undecided.count}</p></article></div>${inspect(['report', 'coverage'], 'Coverage evidence and samples')}<p class="muted">Coverage retains samples, not every unread location. Counts without locations cannot be traced further in this report.</p></section>
  <section id="inventory"><h2>02 / CSS property inventory</h2><p>Extracted use sites before exceptions or severity filtering. Token declarations and markup are outside this inventory.</p><div class="grid">${inventory || '<p>No ordinary CSS property values were recorded. This is not a count of all styling in the source.</p>'}</div></section>
  <section id="findings"><h2>03 / Findings</h2><p>${r.findings.length} findings. A finding may group many use sites; finding counts are not occurrence counts.</p>${
    groups
      .map(
        (g, i) =>
          `<section class="group"><div class="kicker">${g.severity} · ${g.indices.length} findings</div><h3>${htmlEscape(g.rule)}</h3>${g.indices
            .slice(0, 3)
            .map((index) => finding(r.findings[index]))
            .join(
              '',
            )}<details><summary>All ${g.indices.length} findings and recorded evidence</summary><div data-group="${i}"></div></details></section>`,
      )
      .join('') || '<p>No findings in this report. Check the verdict, filters and coverage above.</p>'
  }${inspect(['report', 'suppressions'], `Recorded exceptions · ${r.suppressions.length}`)}<p class="muted">Summaries, risks, fixes and suggestions are engine output. Candidates are not replacements. Some rules retain only example locations; expanding shows all evidence the rule recorded.</p></section>
  <section id="trend"><h2>04 / Recorded trend</h2>${trendView}</section>
  <section id="next"><h2>05 / Next commands</h2>${r.next.map((n) => `<article class="card"><code>${htmlEscape(n.command)}</code><p>${htmlEscape(n.why)}</p></article>`).join('') || '<p>No next commands recorded.</p>'}</section>
  <p class="print-note">Printed summary: only expanded evidence is included. Open the HTML file for the full recorded lists.</p><noscript>JavaScript is disabled. The summary and three examples per group remain readable. Enable JavaScript to browse all recorded evidence.</noscript>
  </main><script id="audit-data" type="application/json">${json({ report: r, groups, trend, swatches, suggestions })}</script><script>${REPORT_SCRIPT}</script></body></html>`;
}

export function writeAuditHtml(
  report: AuditReport,
  output = 'ds-loop-report.html',
  historyRoot = process.cwd(),
): string {
  let history = '';
  let historyError: string | undefined;
  try {
    history = readFileSync(join(historyRoot, '.ds-scorecard', 'history.jsonl'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      historyError = 'No trend: scorecard history could not be read.';
  }
  const path = resolve(output);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderAuditHtml(report, { history, historyError }));
  return path;
}
