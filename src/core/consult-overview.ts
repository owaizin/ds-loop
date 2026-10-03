type Overview = {
  problem: { text: string }[];
  after: { text: string };
  plan: { title: string; changes: string; effort?: string; verification: string }[];
  assumptions: { text: string }[];
};

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Agent-authored journey, never inferred from finding totals or import counts. */
export function renderConsultOverview(consult?: Overview, assessment = false): string {
  if (!consult)
    return '<section class="delivery-overview" aria-labelledby="delivery-title"><h2 id="delivery-title">The big picture</h2><p>No delivery plan has been authored. Measurements alone cannot choose a migration or establish its benefit. Review coverage and findings before recommending work.</p></section>';
  const first = consult.plan[0];
  return `<section class="delivery-overview" aria-labelledby="delivery-title">
<h2 id="delivery-title">The big picture</h2>
<p>Agent-authored recommendation. Read left to right: problem → proposed outcome → first delivery → verification. This sequence is a plan, not a measured dependency graph or completed work.</p>
<ol class="delivery-grid">
<li><span>1 · Investigate</span><h3>What needs to change</h3><p>${esc(consult.problem[0]?.text ?? 'Problem not recorded.')}</p><a href="${assessment ? '#finding' : '#problem'}">Read the diagnosis and evidence</a></li>
<li><span>2 · Proposed</span><h3>What this should enable</h3><p>${esc(consult.after.text)}</p><a href="${assessment ? '#architecture' : '#after'}">Inspect the proposed architecture</a></li>
<li><span>3 · First delivery</span><h3>${esc(first?.title ?? 'No first delivery recorded')}</h3><p>${esc(first?.changes ?? 'Choose a bounded first delivery before implementation.')}</p><p>Effort: ${esc(first?.effort ?? 'Not estimated')}</p><a href="#plan">Review the sequence</a></li>
<li><span>4 · Acceptance</span><h3>How to check the result</h3><p>${esc(first?.verification ?? 'Acceptance has not been recorded.')}</p><p>These checks are planned. Their presence does not mean they passed.</p><a href="${assessment ? '#methodology' : '#limits'}">Read verification limits</a></li>
</ol>
<details><summary>Assumptions to resolve · ${consult.assumptions.length}</summary>${consult.assumptions.length ? `<ul>${consult.assumptions.map((a) => `<li>${esc(a.text)}</li>`).join('')}</ul>` : '<p>No assumptions recorded by the author. This is not evidence that every decision has been resolved.</p>'}</details>
</section>`;
}

export const CONSULT_OVERVIEW_CSS = `
.delivery-overview{margin:32px 0;padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--card,var(--surface))}
.delivery-overview>p{max-width:80ch;color:var(--muted)}
.delivery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;list-style:none;padding:0;margin:24px 0}
.delivery-grid li{border-top:3px solid var(--accent);padding:16px 0;min-width:0;overflow-wrap:anywhere}
.delivery-grid li>span{font-size:12px;font-weight:700;color:var(--accent)}
.delivery-grid h3{font-size:18px;margin:12px 0}.delivery-grid p{font-size:14px;line-height:1.6}
.delivery-overview a:focus-visible,.delivery-overview summary:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
@media(max-width:1000px){.delivery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.delivery-grid{grid-template-columns:1fr}.delivery-overview{padding:16px}}
@media print{.delivery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.delivery-grid li{break-inside:avoid}}
`;

/** Structural input keeps the overview compatible with the separate assessment package. */
export function renderAssessmentOverview(a: {
  executive: { stakes: string; recommendation: string; decision: string; decisionOwner: string };
  work: {
    title: string;
    changes: string;
    dependsOn: string[];
    acceptance: string[];
    estimate: { low: number; high: number; unit: string; basis: string; confidence: string };
  }[];
}): string {
  const first = a.work[0];
  return renderConsultOverview(
    {
      problem: [{ text: a.executive.stakes }],
      after: { text: a.executive.recommendation },
      plan: first
        ? [
            {
              title: first.title,
              changes:
                first.changes +
                (first.dependsOn.length
                  ? ` Prerequisites: ${first.dependsOn.join(', ')}. Read the delivery plan before starting.`
                  : ''),
              effort: `${first.estimate.low}–${first.estimate.high} ${first.estimate.unit}; ${first.estimate.confidence} confidence. ${first.estimate.basis}`,
              verification: first.acceptance.join(' '),
            },
          ]
        : [],
      assumptions: [
        {
          text: `Decision: ${a.executive.decision} Owner: ${a.executive.decisionOwner}. This report does not record approval.`,
        },
      ],
    },
    true,
  );
}
