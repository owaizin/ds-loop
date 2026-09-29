import { type ScorecardRow, comparability } from '../commands/scorecard.ts';

export function adoptionReport(history: ScorecardRow[], label: string) {
  const rows = history.filter((r) => r.label === label);
  const invalidOrder = rows.some((r, i) => i > 0 && Date.parse(r.ranAt) < Date.parse(rows[i - 1].ranAt));
  const first = rows[0];
  const last = rows.at(-1);
  const changed = first ? rows.map((r) => comparability(first, r)).find((c) => !c.clean) : undefined;
  const status = invalidOrder
    ? 'invalid-history'
    : rows.length === 0
      ? 'not-checked'
      : rows.length === 1
        ? 'single-run'
        : changed
          ? 'instrument-changed'
          : 'compared';
  return {
    status,
    runs: rows.length,
    start: first?.ranAt ?? null,
    end: last?.ranAt ?? null,
    reason: invalidOrder
      ? 'History dates are out of order; no comparison is possible.'
      : changed && !changed.clean
        ? changed.reason
        : null,
    incomplete: rows.some((r) => !r.coverageComplete),
    ratios:
      status === 'compared' && first && last
        ? [...new Set([...Object.keys(first.ratios), ...Object.keys(last.ratios)])]
            .sort()
            .map((key) => ({ key, baseline: first.ratios[key] ?? null, current: last.ratios[key] ?? null }))
        : [],
  };
}

export function adoptionHtml(data: ReturnType<typeof adoptionReport>, historyError?: string): string {
  const esc = (value: unknown) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  const fmt = (n: number | null) => (n === null ? 'not checked' : String(Number(n.toFixed(4))));
  return `<section class="deck-section" id="adoption"><h2>Adoption over time</h2><p>Source: .ds-scorecard/history.jsonl · ${data.runs} recorded runs${data.start ? ` · ${esc(data.start)} to ${esc(data.end)}` : ''}.</p>${historyError ? `<p>${esc(historyError)}</p>` : ''}${data.status === 'invalid-history' ? `<p>${esc(data.reason)}</p>` : data.status === 'not-checked' ? '<p>Not checked: no scorecard history for this source.</p>' : data.status === 'single-run' ? '<p>One recorded run is a baseline, not a trend.</p>' : data.status === 'instrument-changed' ? `<p>Instrument changed: ${esc(data.reason)}. No delta reported across this period.</p>` : `<p>Baseline → latest recorded run, by ratio category and package. A missing ratio means not checked, never zero.</p><table><thead><tr><th scope="col">Category / package</th><th scope="col">Baseline ratio</th><th scope="col">Latest ratio</th></tr></thead><tbody>${data.ratios.map((r) => `<tr><th scope="row">${esc(r.key)}</th><td>${fmt(r.baseline)}</td><td>${fmt(r.current)}</td></tr>`).join('')}</tbody></table>`}<p>Ratios describe static source evidence within each run’s coverage. They do not measure savings or productivity.${data.incomplete ? ' At least one recorded run had incomplete coverage.' : ''}</p></section>`;
}
