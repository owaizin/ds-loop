import type { AuditReport } from '../commands/audit.ts';
import { ASSESSMENT_CSS, ASSESSMENT_ICONS } from './assessment-assets.ts';
import type { Assessment } from './assessment.ts';
import { CONSULT_OVERVIEW_CSS, renderAssessmentOverview } from './consult-overview.ts';
import type { Consult } from './consult.ts';
import type { ConsumersReport } from './consumers.ts';
import { plainCoverage } from './plain.ts';
import { reportData } from './report-data.ts';

const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
const icon = (id: string) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
const list = (rows: string[]) => `<ul>${rows.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>`;
const STATE = {
  action: 'Action recommended',
  retain: 'Retain',
  review: 'Review needed',
  'not-assessed': 'Not assessed',
};
const SECTIONS = [
  ['overview', 'Overview', 'overview-icon'],
  ['assessment', 'Assessment', 'layers'],
  ['architecture', 'Architecture', 'architecture-icon'],
  ['finding', 'Findings', 'finding-icon'],
  ['plan', 'Delivery plan', 'plan-icon'],
  ['methodology', 'Evidence', 'book'],
];
const EXTRA_CSS = `
html{scroll-padding-top:80px}.view a,pre{overflow-wrap:anywhere}.view>section{margin-block:30px}.evidence-record{scroll-margin-top:80px;border-top:1px solid var(--line);padding:28px 0}.evidence-record pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow:auto;background:var(--tint);font-size:12px;line-height:1.7}.evidence-record h3{margin-bottom:8px}.evidence-record p{overflow-wrap:anywhere;margin:8px 0;color:var(--muted);font-size:12px}.evidence-links{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;font-size:12px}.finding-record{padding:32px 0;border-top:1px solid var(--line);scroll-margin-top:80px}.finding-record h2{margin:12px 0 20px}.finding-record h3{font-size:14px;margin:20px 0 7px}.finding-record p,.finding-record li{font-size:14px}.finding-record .two-col{gap:30px}.facts dd{overflow-wrap:anywhere;text-transform:none}.work-items{margin-top:28px}.work-items li{break-inside:avoid}.work-items .acceptance li{display:list-item;padding:3px 0;border:0;font-size:12px}.architecture-node{border:1px solid var(--line);padding:16px;margin-block:14px;background:var(--surface)}.architecture-node p{font-size:12px;margin-top:8px;color:var(--muted)}.architecture-node.proposed{border-color:var(--accent);background:var(--tint)}.architecture-edge{font-size:12px;color:var(--muted);padding:10px;border-top:1px solid var(--line)}.scope-note>*{min-width:0}.scope-note p{overflow-wrap:anywhere}.report-note{font-size:12px;color:var(--muted);margin-top:12px}.decision .text-link{display:flex}.decision p+p{margin-top:12px}.panel-summary{overflow-wrap:anywhere}.panel-decision h3{font-size:20px}.panel-metrics strong{font-size:25px;white-space:nowrap}.measure-label{display:block}.area .status{font-size:10px}.evidence-count{font-size:13px;color:var(--muted)}.finding-index{display:grid;gap:0}.funding-note{border-block:1px solid var(--line);padding:20px 0;margin:24px 0}.funding-note p{font-size:14px}.funding-note h2{font-size:20px;margin-bottom:10px}.architecture{align-items:start}.architecture-col h3{font-size:17px}.reading-grid{align-items:start}.download-status{font-size:12px;color:var(--muted)}.executive-panel{overflow-y:auto}.pdf-only{display:none}
@media(max-width:760px){.metric strong{font-size:22px;white-space:nowrap}.metric-head{min-width:0}.finding-record .two-col{grid-template-columns:1fr}.finding-record p,.finding-record li{font-size:12px}.evidence-record pre{font-size:10px}.work-items .work-meta{grid-column:2}.architecture{grid-template-columns:1fr}.panel-metrics strong{font-size:25px}}
@media print{.js .view[hidden],.view[hidden]{display:block!important}.view{break-before:page;padding-bottom:0}#overview{break-before:auto}.evidence-record pre{max-height:none;overflow:visible;font-size:8pt}.evidence-record{break-inside:avoid}.finding-record{break-before:page}.finding-record:first-of-type{break-before:auto}.finding-record p,.finding-record li{font-size:10pt}.evidence-links a{font-size:9pt}.footer{position:static}.download-controls,.js-only{display:none!important}.page-intro h1{font-size:26pt}.pdf-only{display:block}.architecture{grid-template-columns:1fr 1fr}.architecture-node{break-inside:avoid}.work-items li{break-inside:avoid}.metric-strip{margin-bottom:18px}.area{break-inside:avoid}.scope-note{break-inside:avoid}.view{padding-top:12px!important}.two-col{grid-template-columns:1fr 1fr}}
`;

/** Client-facing assessment. Source excerpts travel with the report; no file:// dependency. */
export function renderAssessmentHtml(
  r: AuditReport,
  consumers: ConsumersReport,
  consult: Consult & { assessment: Assessment },
): string {
  const a = consult.assessment;
  const x = a.executive;
  const date =
    a.evidence
      .map((e) => e.capturedAt.slice(0, 10))
      .sort()
      .at(-1) ?? r.manifest.ranAt.slice(0, 10);
  const refs = (ids: string[]) =>
    ids.length
      ? `<div class="evidence-links">${ids.map((id) => `<a href="#evidence-${esc(id)}">${esc(id)} · ${esc(a.evidence.find((e) => e.id === id)?.title ?? 'Evidence')}</a>`).join('')}</div>`
      : '<p class="report-note">Not assessed: no supporting evidence collected.</p>';
  const metrics = a.measures.map((m) => ({
    label: m.label,
    value: `${m.numerator} / ${m.denominator}`,
    note: m.definition,
  }));
  const metricStrip = `<div class="metric-strip" aria-label="Source measurements">${metrics.map((m) => `<div class="metric"><div class="metric-head"><strong>${m.value}</strong></div><h2>${m.label}</h2><p>${m.note}</p></div>`).join('')}</div>`;
  const areaIcons: Record<string, string> = {
    'Components & patterns': 'box',
    'Tokens & foundations': 'layers',
    Accessibility: 'access',
    Documentation: 'book',
    Adoption: 'people',
    Ownership: 'owner',
    'Tooling & maintenance': 'tool',
    'Agent usability': 'agent',
  };
  const areaRows = a.areas
    .map(
      (v) =>
        `<a class="area" href="#assessment"><span class="area-symbol">${icon(areaIcons[v.name] ?? 'layers')}</span><div><h3>${esc(v.name)}</h3><p>${esc(v.conclusion)}</p><span class="status ${v.state === 'action' ? 'risk' : v.state === 'retain' ? 'good' : 'neutral'}">${STATE[v.state]}</span></div></a>`,
    )
    .join('');
  const intro = (id: string, number: string, title: string, summary: string) =>
    `<div class="page-intro"><p class="eyebrow">${number} / ${SECTIONS.find((s) => s[0] === id)?.[1]}</p><h1 id="${id}-title" tabindex="-1">${esc(title)}</h1><p>${esc(summary)}</p></div>`;
  const section = (id: string, content: string) =>
    `<section class="view" id="${id}" aria-labelledby="${id}-title">${content}</section>`;
  const decision = `<p class="eyebrow">Decision required</p><h2>${esc(x.decision)}</h2><p>${esc(x.investment)}</p><p><b>Proposed decision owner:</b> ${esc(x.decisionOwner)}</p><a class="text-link" href="#plan">Review delivery plan ${icon('arrow')}</a><div class="preserve"><h3>Keep what works</h3>${list(x.preserve)}</div>`;
  const overview = section(
    'overview',
    `<div class="hero"><div><p class="eyebrow">${esc(a.client)} / Design system assessment</p><h1 id="overview-title" tabindex="-1">${esc(x.headline)}</h1><p class="lead">${esc(x.recommendation)}</p><div class="meta"><span>${esc(date)}</span><span>Source-backed assessment</span><span>Proposals await owner agreement</span></div></div><div class="report-art" aria-hidden="true"></div></div>${metricStrip}${renderAssessmentOverview(a)}<div class="overview-grid"><div><div class="section-head"><div><h1 class="split-page-title">The system at a glance</h1><h2 class="standard-page-title">The system at a glance</h2><p>Assessment and review coverage are separate.</p></div><a class="text-link" href="#assessment">View assessment ${icon('arrow')}</a></div><div class="assessment-grid">${areaRows}</div></div><aside class="decision">${decision}</aside></div><div class="funding-note"><h2>Why this matters</h2><p>${esc(x.stakes)}</p></div><div class="section-head"><div><h2>Priorities grounded in evidence</h2><p>Consultant priorities; engine rule severity is retained in the evidence bundle.</p></div></div><div class="finding-index">${a.findings.map((f) => `<a class="finding-teaser" href="#finding-${esc(f.id)}"><span class="mono">${esc(f.id)}</span><div><div class="labels"><span class="tag">${esc(f.priority)}</span><span class="tag">${esc(f.basis)} evidence</span></div><h3>${esc(f.title)}</h3><p>${esc(f.consequence)}</p></div>${icon('arrow')}</a>`).join('') || '<p>No consultant findings recorded. Read the coverage limits before interpreting this result.</p>'}</div><div class="scope-note"><div><h3>Review scope</h3><p>${esc(a.scope)}</p></div><div><h3>Source state</h3><p>${esc(a.sourceState)} · ${esc(a.sourceRevision)}</p></div></div>`,
  );
  const assessment = section(
    'assessment',
    `${intro(
      'assessment',
      '02',
      'What is known. What remains open.',
      'A gap in review coverage is not a defect. Each conclusion names the inspected scope and the next unanswered question.',
    )}<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Area</th><th scope="col">Assessment</th><th scope="col">What was reviewed</th><th scope="col">Open question</th></tr></thead><tbody>${a.areas.map((v) => `<tr><td><strong>${esc(v.name)}</strong></td><td><span class="status ${v.state === 'action' ? 'risk' : v.state === 'retain' ? 'good' : 'neutral'}">${STATE[v.state]}</span><p>${esc(v.conclusion)}</p></td><td>${esc(v.coverage)}${refs(v.evidence)}</td><td>${esc(v.unknowns)}</td></tr>`).join('')}</tbody></table></div><div class="detail-section"><h2>Alternatives considered</h2>${x.alternatives.map((v) => `<h3>${esc(v.option)}</h3><p>${esc(v.tradeoff)}</p>`).join('')}</div>`,
  );
  const p = consult.after.architecture;
  const architecture = section(
    'architecture',
    `${intro('architecture', '03', p.title, consult.after.text)}<div class="exhibit"><div class="exhibit-head"><h2>Current and proposed structure</h2><span class="tag">Proposal, not an implemented result</span></div><div class="architecture">${p.lanes
      .map(
        (lane) =>
          `<div class="architecture-col"><h3>${esc(lane.label ?? lane.id)}</h3><p class="report-note">${esc(lane.note ?? '')}</p>${p.nodes
            .filter((n) => n.lane === lane.id)
            .map(
              (n) =>
                `<article class="architecture-node ${esc(n.status)}"><span class="tag">${esc(n.status)}</span><h3>${esc(n.label)}</h3><p>${esc(n.detail ?? '')}</p><p class="report-note">${(n.evidence ?? []).map((e) => esc(e.ref)).join(' · ') || 'No supporting source recorded'}</p></article>`,
            )
            .join('')}</div>`,
      )
      .join(
        '',
      )}</div></div><div class="detail-section"><h2>Relationships and boundaries</h2>${(p.edges ?? []).map((e) => `<p class="architecture-edge"><b>${esc(p.nodes.find((n) => n.id === e.from)?.label)} → ${esc(p.nodes.find((n) => n.id === e.to)?.label)}</b><br>${esc(e.meaning)} · ${esc(e.status)}</p>`).join('')}</div>`,
  );
  const findings = section(
    'finding',
    intro(
      'finding',
      '04',
      'Findings ready for engineering review.',
      'Each record separates the observation, likely consequence, recommendation and acceptance checks.',
    ) +
      a.findings
        .map(
          (f) =>
            `<article class="finding-record" id="finding-${esc(f.id)}" tabindex="-1"><p class="eyebrow">${esc(f.id)} / ${esc(f.priority)} / ${esc(f.basis)} evidence</p><h2>${esc(f.title)}</h2><div class="two-col"><div><h3>Observed</h3><p>${esc(f.observation)}</p><h3>Why it matters</h3><p>${esc(f.consequence)}</p><h3>Proposed change</h3><p>${esc(f.recommendation)}</p></div><div><h3>How to verify the outcome</h3>${list(f.verification)}<h3>Alternative explanation</h3><p>${esc(f.alternative)}</p><h3>Limits of this finding</h3><p>${esc(f.limits)}</p></div></div>${refs(f.evidence)}<a class="text-link" href="#plan">Review ownership and effort ${icon('arrow')}</a></article>`,
        )
        .join(''),
  );
  const low = a.work.reduce((n, w) => n + w.estimate.low, 0);
  const high = a.work.reduce((n, w) => n + w.estimate.high, 0);
  const plan = section(
    'plan',
    `${intro('plan', '05', 'Fund the next decision, then the delivery.', x.investment)}<p class="note"><b>Planning range: ${low}–${high} person-hours.</b> Sum of the proposed work packages below, not elapsed time or a quote. Owners and capacity are proposed. Each estimate states its basis and confidence.</p><ol class="work-items">${a.work.map((w, i) => `<li id="work-${esc(w.id)}"><span class="step-number">${String(i + 1).padStart(2, '0')}</span><div><h2>${esc(w.title)}</h2><p>${esc(w.changes)}</p><h3>Acceptance</h3><div class="acceptance">${list(w.acceptance)}</div><p class="report-note">Related findings: ${w.findings.map((id) => `<a href="#finding-${esc(id)}">${esc(id)}</a>`).join(', ') || 'Discovery work'}</p></div><div class="work-meta"><b>${esc(w.owner)}</b>Proposed owner<br>Depends on: ${w.dependsOn.map((id) => `<a href="#work-${esc(id)}">${esc(id)}</a>`).join(', ') || 'None'}<br><b>${w.estimate.low}–${w.estimate.high} ${w.estimate.unit}</b>${esc(w.estimate.confidence)} confidence<p>${esc(w.estimate.basis)}</p></div></li>`).join('')}</ol><div class="detail-section"><h2>Assumptions to confirm</h2>${consult.assumptions.map((c) => `<p>${esc(c.text)}</p>`).join('') || '<p>No additional assumptions recorded.</p>'}</div><div class="download-controls"><button class="button primary js-only" id="download-brief">Download implementation brief</button><p class="download-status" id="download-status" role="status"></p></div>`,
  );
  const methodology = section(
    'methodology',
    `${intro(
      'methodology',
      '06',
      'Evidence that travels with the report.',
      'Source excerpts and measurement records are embedded below. Recipients can inspect the basis without access to the original checkout.',
    )}<dl class="facts"><div><dt>Prepared by</dt><dd>${esc(a.preparedBy)}</dd></div><div><dt>Source revision</dt><dd>${esc(a.sourceRevision)}</dd></div><div><dt>Working tree</dt><dd>${esc(a.sourceState)}</dd></div><div><dt>Audit timestamp (UTC)</dt><dd>${esc(r.manifest.ranAt)}</dd></div><div><dt>Configuration hash</dt><dd>${esc(r.manifest.configHash)}</dd></div><div><dt>Adapters</dt><dd>${esc(r.manifest.adapter)}</dd></div></dl><div class="detail-section"><h2>What the measurements mean</h2><p>CSS reference percentages divide reference-only values by literal, reference and mixed values in supported ordinary CSS properties. They do not prove references resolve, measure runtime adoption, or grade the design system. Examples and fixture files may be included in this source scan.</p><p>Consultant findings above are selected through source inspection. Engine findings remain unedited in the downloadable bundle, including scope, exclusions and severity. Citation presence does not establish that a claim is true.</p><h3>Coverage limits</h3>${list(plainCoverage(r.coverage))}${list(consumers.limits)}<h3>Glossary</h3><p><b>Design token:</b> a named value for a design choice. <b>Semantic token:</b> a token named for its purpose. <b>Static reference:</b> a source relationship, not proof of production use. <b>Person-hour:</b> one hour of one person's work; parallel work and review waits change elapsed time.</p><button class="button js-only" id="download-evidence">Download complete evidence bundle</button></div><div class="detail-section"><h2>Evidence index</h2><p class="evidence-count">${a.evidence.length} retained records. Excerpts are author-collected; the renderer does not independently verify them.</p>${a.evidence.map((e) => `<article class="evidence-record" id="evidence-${esc(e.id)}" tabindex="-1"><p class="eyebrow">${esc(e.id)} / ${esc(e.kind)} / ${esc(e.capturedAt)}</p><h3>${esc(e.title)}</h3><p>${/^https?:\/\//.test(e.ref) ? `<a href="${esc(e.ref)}">${esc(e.ref)}</a>` : esc(e.ref)}</p><pre>${esc(e.excerpt)}</pre><p><b>Limit:</b> ${esc(e.limitation)}</p></article>`).join('')}</div>`,
  );
  const brief = `# ${a.client}: implementation brief\n\n${x.headline}\n\n${x.recommendation}\n\nScope: ${a.scope}\nRevision: ${a.sourceRevision}\nState: ${a.sourceState}\n\n${a.work.map((w) => `## ${w.id}: ${w.title}\nProposed owner: ${w.owner}\nDependencies: ${w.dependsOn.join(', ') || 'none'}\nEstimate: ${w.estimate.low}-${w.estimate.high} person-hours (${w.estimate.confidence} confidence)\nBasis: ${w.estimate.basis}\n\n${w.changes}\n\nAcceptance:\n${w.acceptance.map((v) => `- ${v}`).join('\n')}`).join('\n\n')}\n\n${a.findings.map((f) => `## ${f.id}: ${f.title}\n${f.observation}\n\nRecommendation: ${f.recommendation}\nLimits: ${f.limits}\nEvidence: ${f.evidence.join(', ')}\nVerification:\n${f.verification.map((v) => `- ${v}`).join('\n')}`).join('\n\n')}\n\n## Evidence\n${a.evidence.map((e) => `### ${e.id}: ${e.title}\n${e.ref}\nCaptured: ${e.capturedAt}\n\n${e.excerpt}\n\nLimit: ${e.limitation}`).join('\n\n')}`;
  const script = `(() => {
const root=document.documentElement, views=[...document.querySelectorAll('.view')], links=[...document.querySelectorAll('.nav a')];
const names=${json(Object.fromEntries(SECTIONS.map(([id, name]) => [id, name])))};
const choose=style=>{if(!['dark','light','split'].includes(style))style='split';root.dataset.style=style;root.dataset.theme=style==='dark'?'dark':'light';for(const b of document.querySelectorAll('[data-style-choice]'))b.setAttribute('aria-pressed',String(b.dataset.styleChoice===style));try{localStorage.setItem('ds-loop-assessment-style',style)}catch{}};
let saved='split';try{saved=localStorage.getItem('ds-loop-assessment-style')||saved}catch{}choose(saved);
for(const b of document.querySelectorAll('[data-style-choice]'))b.addEventListener('click',()=>choose(b.dataset.styleChoice));
const route=focus=>{let hash=location.hash.slice(1);try{hash=decodeURIComponent(hash)}catch{}const target=document.getElementById(hash);if(hash==='main'){document.getElementById('main').focus();return}const id=target?.closest('.view')?.id || (names[hash]?hash:'overview');for(const v of views)v.hidden=v.id!==id;for(const l of links){if(l.hash==='#'+id)l.setAttribute('aria-current','page');else l.removeAttribute('aria-current')}document.getElementById('page-name').textContent=names[id];document.title=names[id]+' · '+${json(a.client)}+' · Design System Loop';if(focus){let heading=target&&target.id!==id?target:document.getElementById(id+'-title');if(id==='overview'&&getComputedStyle(document.querySelector('.split-page-title')).display!=='none')heading=document.querySelector('.split-page-title');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});if(target&&target.id!==id)target.scrollIntoView();else window.scrollTo(0,0)}};
root.classList.add('js');route(false);window.addEventListener('hashchange',()=>route(true));window.addEventListener('load',()=>route(true));
document.getElementById('print-report').addEventListener('click',()=>window.print());
const save=(text,name,type)=>{const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
document.getElementById('download-brief').addEventListener('click',()=>{save(${json(brief)},'implementation-brief.md','text/markdown');document.getElementById('download-status').textContent='Implementation brief downloaded.'});
document.getElementById('download-evidence').addEventListener('click',()=>save(document.getElementById('assessment-data').textContent,'assessment-evidence.json','application/json'));
})();`;
  return `<!doctype html><html lang="en" data-theme="light" data-style="split"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'"><title>${esc(a.client)} · Design System Loop</title><style>${ASSESSMENT_CSS}${EXTRA_CSS}${CONSULT_OVERVIEW_CSS}</style></head><body>${ASSESSMENT_ICONS}<a class="skip" href="#main">Skip to report</a><div class="variant-toolbar"><div class="variant-label">Design System Loop <span>/</span> <small>System review</small></div><div class="theme-switch" role="group" aria-label="Report visual variant">${[
    ['dark', 'Aubergine'],
    ['light', 'Light field'],
    ['split', 'Split overview'],
  ]
    .map(
      ([id, name]) =>
        `<button type="button" data-style-choice="${id}" aria-pressed="${id === 'split'}">${esc(name)}</button>`,
    )
    .join(
      '',
    )}</div><span class="demo-label">${esc(date)}</span></div><header class="site-header"><div class="header-inner"><a class="brand" href="#overview" aria-label="Design System Loop overview"><b class="brand-full">Design<br>System Loop<span>System review</span></b><b class="brand-compact">ds-loop</b></a><div class="rail-client"><span class="client-monogram">${esc(a.client[0])}</span><div><b>${esc(a.client)}</b><small>Source-backed assessment</small></div></div><nav class="nav" aria-label="Report sections">${SECTIONS.map(([id, name, symbol]) => `<a href="#${id}">${icon(symbol)}<span>${name}</span></a>`).join('')}</nav><div class="rail-foot"><span class="eyebrow">Assessment snapshot</span><p>${esc(date)}</p><a href="#methodology">View scope and evidence</a></div></div></header><aside class="executive-panel" aria-label="Executive summary"><p class="eyebrow">${esc(a.client)} / System review</p><h2>Design system<br>assessment</h2><p class="panel-date">${esc(date)}</p><div class="panel-art" aria-hidden="true"></div><h3>${esc(x.headline)}</h3><p class="panel-summary">${esc(x.recommendation)}</p><div class="panel-metrics">${metrics.map((m) => `<div><strong>${m.value}</strong><span>${m.label}</span><small>${m.note}</small></div>`).join('')}</div><div class="panel-decision"><p class="eyebrow">Decision required</p><h3>${esc(x.decision)}</h3><p>${esc(x.investment)}</p><a class="panel-action" href="#plan">Review delivery plan ${icon('arrow')}</a></div><p class="panel-preserve">${esc(x.preserve.join(' · '))}</p></aside><main class="wrap" id="main" tabindex="-1"><div class="page-tools"><div class="crumb"><span>${esc(a.client)}</span><span>/</span><b id="page-name">Overview</b></div><div class="tool-actions"><span class="sample-tag">Source-backed assessment</span><button class="button js-only" id="print-report">${icon('print')}Print report</button></div></div>${overview}${assessment}${architecture}${findings}${plan}${methodology}<footer class="footer"><span>Design System Loop / ${esc(a.client)}</span><span>Recommendations proposed · <a href="#methodology">Scope and evidence</a></span></footer></main><script type="application/json" id="assessment-data">${json({ assessment: a, audit: reportData(r), consumers })}</script><script>${script}</script></body></html>`;
}
