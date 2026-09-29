import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AuditReport } from '../commands/audit.ts';
import { findingLocations } from './audit-summary.ts';
import type { Claim, Consult } from './consult.ts';
import { renderConsumersHtml } from './consumers-html.ts';
import type { ConsumersReport } from './consumers.ts';
import { embedReport } from './embedded-report.ts';
import { PLAIN_RULES, PLAIN_VERDICTS, plainCoverage } from './plain.ts';
import { type Evidence, renderProposal } from './proposal.ts';
import { renderAuditHtml } from './report-html.ts';

const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const missing =
  '<p class="unwritten">Not written yet — ask your agent to run the consult step (see skill/reference/consult.md).</p>';
const section = (id: string, title: string, content: string) =>
  `<section class="deck-section" id="${id}"><header class="section-heading"><span class="section-number">${({ summary: '01', problem: '02', ideal: '04', after: '05', plan: '06', limits: '07' } as Record<string, string>)[id]}</span><h2>${title}</h2><p class="standfirst">${({ summary: 'The measured state and what deserves a closer look.', problem: 'The agent’s assessment of what is getting in the way.', ideal: 'Practices to learn from, with their sources.', after: 'Current and proposed architecture, with evidence boundaries visible.', plan: 'Work in this order; verify each step before moving on.', limits: 'The boundaries of this evidence travel with every conclusion.' } as Record<string, string>)[id]}</p></header>${content}</section>`;

const CSS = `
body{font-size:16px;line-height:1.65}main{max-width:1180px;padding:24px clamp(20px,4vw,56px) 80px}h1{font-size:clamp(36px,6vw,64px);line-height:1.08;letter-spacing:-.04em;max-width:900px}h2{font-size:clamp(26px,4vw,38px);letter-spacing:-.035em}h3{font-size:21px}.deck-section{padding:56px 0;border-top:1px solid var(--line);margin:0}.deck-section>p{max-width:800px}.lead{font-size:21px}.claim,.problem-card{padding:22px 0;border-bottom:1px solid var(--line)}.basis{color:var(--muted);font-size:14px}.unsupported{color:var(--accent);font-weight:700}.unwritten{padding:24px;border:1px dashed var(--line)}.top-problems{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.top-problems h3{font-size:20px}a,code{overflow-wrap:anywhere}.embedded-report{margin:32px 0;--edge:var(--accent);--obs:var(--accent);--inf:var(--accent);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}.embedded-report h1{font-size:28px}.embedded-report h2{font-size:23px}.embedded-report .node{--obs:var(--accent);--inf:var(--accent);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}.embedded-report .unsupported{display:block}.token-lanes p,.token-lanes small{font-size:14px}.theme-findings h4{font-size:18px}.theme-findings article{margin-bottom:20px}
@media(max-width:700px){.top-problems{grid-template-columns:1fr}.deck-section{padding:32px 0}}
@media print{:root,:root[data-theme=dark],:root[data-theme=light]{--bg:#fff;--card:#fff;--ink:#000;--muted:#444;--line:#bbb;--accent:#000;--warn:#000;color-scheme:light}.deck-section{break-before:page}.deck-section:first-of-type{break-before:auto}.toolbar,nav{display:none}.deck-section{padding:16px 0}.top-problems{display:block}.claim,.problem-card{break-inside:avoid}body{background:white;color:black}.embedded-report{overflow:visible}}
main{max-width:1440px;margin-inline:auto;padding-inline:clamp(20px,5vw,80px)}
.cover{min-height:75vh;display:flex;flex-direction:column;justify-content:center;padding:64px 0;margin:0}.cover h1{font-size:clamp(38px,5vw,64px);max-width:18ch;margin:24px 0}.cover>p{max-width:68ch}.headline-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;border-block:1px solid var(--line);padding:24px 0;margin:32px 0 16px}.headline-metrics strong{display:block;font-size:clamp(24px,3vw,42px);font-weight:500}.headline-metrics span{text-transform:capitalize;color:var(--muted)}
.deck-section>.claim,.deck-section>p,.deck-section>.unwritten,.deck-section>h3,#limits>ul{max-width:68ch;margin-inline:auto}.section-heading{display:grid;grid-template-columns:64px 1fr 1fr;gap:24px;align-items:baseline;margin-bottom:40px}.section-heading h2{margin:0}.section-number{font:14px ui-monospace,monospace;color:var(--accent)}.standfirst{color:var(--muted);max-width:40ch}#problem,#ideal,#plan{background:var(--card);padding-inline:32px}.work-plan{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}.work-plan .claim{border-top:2px solid var(--accent)}
#proposed-map main{max-width:none;padding:0}#proposed-map .architecture-lanes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}#proposed-map .row{grid-template-columns:1fr}#proposed-map .s-proposed{border:2px dashed var(--accent)}#proposed-map .node{min-width:0}#proposed-map .toolbar{display:none}
@media(max-width:700px){.section-heading{grid-template-columns:32px 1fr;gap:12px}.standfirst{grid-column:2}.headline-metrics,.work-plan,#proposed-map .architecture-lanes{grid-template-columns:1fr}.cover{min-height:auto;padding:40px 0}#problem,#ideal,#plan{padding-inline:16px}}
@page{margin:18mm}
@media print{.cover{min-height:230mm;break-after:page}.deck-section{break-before:page}.section-heading{break-inside:avoid;break-after:avoid}.headline-metrics{grid-template-columns:repeat(3,1fr)}.work-plan{display:block}.work-plan li{break-inside:avoid}main{padding:0}.cover h1{font-size:42px}}

`;

export function renderConsultHtml(
  r: AuditReport,
  consumers: ConsumersReport,
  root: string,
  consult?: Consult,
): string {
  const ref = (value: string): string => {
    let href: string | undefined;
    if (/^https?:\/\//i.test(value)) href = value;
    else {
      const file = value.match(/^(.*):([1-9]\d*)(?::[1-9]\d*)?$/);
      if (file) href = `${pathToFileURL(resolve(root, file[1])).href}#L${file[2]}`;
      else if (PLAIN_RULES[value]) href = '#findings';
    }
    return href ? `<a href="${esc(href)}">${esc(value)}</a>` : esc(value);
  };
  const evidence = (refs: Evidence[]) =>
    refs.length
      ? `<p class="basis">Agent-cited evidence (not independently verified): ${refs.map((e) => ref(e.ref)).join(' · ')}</p>`
      : '<p class="unsupported">Unsupported — no evidence refs. This is not an established fact.</p>';
  const claim = (c: Claim) => `<article class="claim"><p>${esc(c.text)}</p>${evidence(c.evidence)}</article>`;
  const finding = (f: AuditReport['findings'][number]) => {
    const words = PLAIN_RULES[f.ruleId];
    const locations = findingLocations(f);
    return `<article class="problem-card"><h3>${esc(words.title)}</h3><p>${esc(words.description)}</p><p class="basis">${esc(f.ruleId)} · ${esc(f.severity)} · ${typeof f.data?.count === 'number' ? `${f.data.count} recorded occurrences` : '1 finding group'}</p><p>${locations.length ? locations.map(ref).join(' · ') : 'No file:line recorded; see detailed engine evidence.'}</p></article>`;
  };
  const coverage = plainCoverage(r.coverage)
    .map((s) => `<li>${esc(s)}</li>`)
    .join('');
  const themes = new Map<string, AuditReport['findings']>();
  for (const f of r.findings) {
    const category = typeof f.data?.category === 'string' ? f.data.category : '';
    const theme =
      (
        {
          color: 'Colour',
          spacing: 'Spacing',
          typography: 'Type',
          elevation: 'Elevation',
          motion: 'Motion',
        } as Record<string, string>
      )[category] ??
      (f.ruleId.startsWith('color/')
        ? 'Colour'
        : f.ruleId.includes('markup') || f.ruleId.includes('utility')
          ? 'Components'
          : 'Token foundations');
    themes.set(theme, [...(themes.get(theme) ?? []), f]);
  }
  const headlines = ['color', 'spacing', 'typography']
    .map((category) => {
      const ratio = r.ratios[`style-tokenization-${category}`];
      return `<div><span>${category} tokenization</span><strong>${ratio === undefined ? 'not checked' : `${(ratio * 100).toFixed(1)}%`}</strong></div>`;
    })
    .join('');
  const intro = `<section class="cover"><p class="kicker">Design System Loop / System report</p><p>${esc(r.manifest.fixtureLabel)} · ${esc(r.manifest.ranAt.slice(0, 10))}</p><h1>${esc(consult?.title ?? 'Your design system, in view')}</h1><p class="lead">${esc(PLAIN_VERDICTS[r.verdict].title)}</p><p>${esc(PLAIN_VERDICTS[r.verdict].description)}</p><div class="headline-metrics">${headlines}</div><p class="basis">Reference-only values / (literal + reference + mixed values). Not reference resolution. <a href="#limits">Read the coverage limits.</a></p></section><nav aria-label="Consulting report sections">${[
    ['summary', 'Summary'],
    ['problem', 'The problem'],
    ['current', 'Where you are now'],
    ['ideal', 'What good looks like'],
    ['after', 'Where this takes you'],
    ['plan', 'The plan'],
    ['limits', 'What we couldn’t check'],
  ]
    .map(([id, title]) => `<a href="#${id}">${title}</a>`)
    .join('')}</nav>${section(
    'summary',
    'Summary',
    `<p class="lead">${esc(PLAIN_VERDICTS[r.verdict].title)}</p><p>${esc(PLAIN_VERDICTS[r.verdict].description)}</p><p><b>What we checked:</b> ${r.coverage.partialReads.length ? `${esc([...new Set(r.coverage.partialReads.flatMap((p) => p.extensions))].join(', '))} files with ${r.rulesRun.length} checks.` : 'No supported files were checked.'} ${r.coverage.complete ? 'No additional coverage gaps reported within that scope.' : 'Coverage is incomplete; see the limits below.'} <a href="#limits">What we couldn’t check</a></p><h3>First things to review</h3><p>Up to three finding groups, ordered by engine severity. This is not a business-priority ranking.</p><div class="top-problems">${r.findings.slice(0, 3).map(finding).join('') || '<p>No problems were reported. Read the coverage limits.</p>'}</div>`,
  )}${section(
    'problem',
    'The problem',
    consult
      ? `<p class="basis">Agent assessment; the engine does not establish business impact.</p>${consult.problem.map(claim).join('')}${consult.assumptions.length ? `<h3>Assumptions — awaiting confirmation</h3>${consult.assumptions.map(claim).join('')}` : '<p>No assumptions recorded by the author.</p>'}`
      : missing,
  )}<section class="deck-section" id="current"><header class="section-heading"><span class="section-number">03</span><h2>Where you are now</h2><p class="standfirst">Source evidence, available for inspection.</p></header><p>Measured from source code. Counts describe the source; they are not grades.</p>`;
  const consumersView = consumers.packages.length
    ? `<h3>Component usage</h3>${embedReport(renderConsumersHtml(consumers, { label: r.manifest.fixtureLabel, generatedAt: r.manifest.ranAt }), 'consumer-map')}<h3>Recorded import locations</h3><ul>${consumers.consumers.flatMap((c) => c.uses.map((u) => `<li>${esc(c.package)} → ${esc(u.specifier)}: ${u.samples.map((s) => ref(`${s.file}:${s.line}`)).join(' · ')}</li>`)).join('')}</ul>`
    : '<p>Component usage not checked: no workspace packages were found at this source root.</p>';
  const outro = `${consumersView}</section>${section(
    'ideal',
    'What good looks like',
    consult ? consult.practices.map((p) => `<h3>${esc(p.system)}</h3>${claim(p)}`).join('') : missing,
  )}${section(
    'after',
    'Where this takes you',
    consult
      ? `<p class="basis">Proposed architecture, not a measured future result.</p>${claim(consult.after)}${embedReport(renderProposal(consult.after.architecture), 'proposed-map')}`
      : missing,
  )}${section(
    'plan',
    'The plan',
    consult
      ? `<ol class="work-plan">${consult.plan.map((s, i) => `<li class="claim"><p class="basis">Step ${i + 1} · Effort: ${esc(s.effort ?? 'not estimated')}</p><h3>${esc(s.title)}</h3><p><b>What changes:</b> ${esc(s.changes)}</p><p><b>Why:</b> ${esc(s.why)}</p><p><b>How you’ll know it worked:</b> ${esc(s.verification)}</p>${evidence(s.evidence)}</li>`).join('')}</ol>`
      : missing,
  )}${section(
    'limits',
    "What we couldn't check",
    `<ul>${coverage}${consumers.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p>Static code checks do not establish rendered behaviour, accessibility, business impact or whether a cited claim is true. File links point to this machine’s source paths; recipients need the same checkout.</p>`,
  )}`;
  return renderAuditHtml(r, {
    consulting: {
      intro,
      outro,
      css: CSS,
      sourceBase: pathToFileURL(`${resolve(root)}/`).href,
      findings: `<div class="theme-findings">${[...themes].map(([theme, rows]) => `<h3>${esc(theme)}</h3>${rows.map(finding).join('')}`).join('')}</div>`,
    },
  });
}
