import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AuditReport } from '../commands/audit.ts';
import { adoptionHtml, type adoptionReport } from './adoption.ts';
import { findingGroupId, findingLocations } from './audit-summary.ts';
import { type ReferenceSet, benchmarkHtml } from './benchmark.ts';
import type { Claim, Consult } from './consult.ts';
import { renderConsumersHtml } from './consumers-html.ts';
import type { ConsumersReport } from './consumers.ts';
import { embedReport } from './embedded-report.ts';
import { ICON_SPRITE, icon } from './icons.ts';
import { PLAIN_RULES, PLAIN_VERDICTS, plainCoverage } from './plain.ts';
import { type Evidence, renderProposal } from './proposal.ts';
import { renderAuditHtml } from './report-html.ts';
import { formatTeamShape, teamShape } from './team-shape.ts';

const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const missing =
  '<p class="unwritten">Not written yet — ask your agent to run the consult step (see skill/reference/consult.md).</p>';
const JUDGEMENT_SECTIONS = new Set(['problem', 'ideal', 'plan']);
const SECTION_ICON: Record<string, string> = {
  summary: 'summary',
  problem: 'problem',
  current: 'current',
  ideal: 'ideal',
  after: 'after',
  plan: 'plan',
  limits: 'limits',
};
const section = (id: string, title: string, content: string) =>
  `<section class="deck-section" id="${id}"${JUDGEMENT_SECTIONS.has(id) ? ' data-kind="judgement"' : ''}><header class="section-heading"><span class="section-number">${({ summary: '01', problem: '02', ideal: '04', after: '05', plan: '06', limits: '07' } as Record<string, string>)[id]}</span><h2>${icon(SECTION_ICON[id])}${title}</h2><p class="standfirst">${({ summary: 'The measured state and what deserves a closer look.', problem: 'The agent’s assessment of what is getting in the way.', ideal: 'Practices to learn from, with their sources.', after: 'Current and proposed architecture, with evidence boundaries visible.', plan: 'Work in this order; verify each step before moving on.', limits: 'The boundaries of this evidence travel with every conclusion.' } as Record<string, string>)[id]}</p></header>${content}</section>`;

const CSS = `
body{font-size:16px;line-height:1.65}main{max-width:1180px;padding:24px clamp(20px,4vw,56px) 80px}h1{font-size:clamp(36px,6vw,64px);line-height:1.08;letter-spacing:-.04em;max-width:900px}h2{font-size:clamp(26px,4vw,38px);letter-spacing:-.035em}h3{font-size:21px}.deck-section{padding:56px 0;border-top:1px solid var(--line);margin:0}.deck-section>p{max-width:800px}.lead{font-size:21px}.claim,.problem-card{padding:22px 0;border-bottom:1px solid var(--line)}.basis{color:var(--muted);font-size:14px}.unsupported{color:var(--accent);font-weight:700}.unwritten{padding:24px;border:1px dashed var(--line)}.top-problems{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.top-problems h3{font-size:20px}a,code{overflow-wrap:anywhere}.embedded-report{margin:32px 0;--edge:var(--accent);--obs:var(--muted);--inf:var(--muted);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}.embedded-report h1{font-size:28px}.embedded-report h2{font-size:23px}.embedded-report .node{--obs:var(--muted);--inf:var(--muted);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}.embedded-report .unsupported{display:block}.token-lanes p,.token-lanes small{font-size:14px}.theme-findings h4{font-size:18px}.theme-findings article{margin-bottom:20px}
.problem-card{border-left:3px solid var(--line);padding-left:16px}.problem-card.s-blocking{border-left-color:#972c40}.problem-card.s-high{border-left-color:#c45d36}.problem-card.s-medium{border-left-color:#997024}.problem-card.s-low{border-left-color:#49789e}
@media(max-width:700px){.top-problems{grid-template-columns:1fr}.deck-section{padding:32px 0}}
@media print{:root,:root[data-theme=dark],:root[data-theme=light]{--bg:#fff;--card:#fff;--ink:#000;--muted:#444;--line:#bbb;--accent:#000;--accent-2:#444;--warn:#000;--shadow-1:none;color-scheme:light}.deck-section{break-before:page}.deck-section:first-of-type{break-before:auto}.toolbar,nav{display:none}.deck-section{padding:16px 0}.top-problems{display:block}.claim,.problem-card{break-inside:avoid}body{background:white;color:black}.embedded-report{overflow:visible}.cover .halftone,.cover-orb,.ribbon{display:none}.grad-text,.section-number{background:none;-webkit-text-fill-color:currentColor;color:#000}#proposed-map .s-proposed{background:none;border-color:#000}[data-kind=judgement]{box-shadow:none;border-radius:0}[data-kind=judgement]::before{display:none}}
main{max-width:1440px;margin-inline:auto;padding-inline:clamp(20px,5vw,80px)}
.toolbar{position:fixed;top:0;right:0;left:auto;width:auto;padding:10px 20px;font-size:11px;opacity:.55;z-index:20;background:transparent;border:none;transition:opacity .15s}.toolbar:hover,.toolbar:focus-within{opacity:1}.toolbar .kicker{display:none}
.cover{position:relative;overflow:hidden;min-height:75vh;display:flex;flex-direction:column;justify-content:center;padding:64px 0;margin:0}.cover h1{font-size:clamp(38px,5vw,64px);max-width:18ch;margin:24px 0}.cover>p{max-width:68ch}.cover .halftone,.cover-orb{z-index:-1}.cover-orb{position:absolute;top:-140px;right:-100px;width:520px;height:520px;border-radius:50%;background:var(--gradient);opacity:.16;filter:blur(80px);pointer-events:none}
.verdict-chip{display:inline-flex;align-items:center;gap:10px;padding:9px 16px 9px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);box-shadow:var(--shadow-1);font-size:13px;font-weight:600}.verdict-chip .icon{width:18px;height:18px}.verdict-chip.s-issues .icon{color:var(--accent-2)}.verdict-chip.s-clean .icon{color:var(--accent)}.verdict-chip.s-not-checked .icon{color:var(--muted)}.verdict-chip+.basis{margin-top:22px}
.ribbon{display:flex;align-items:center;gap:0;margin-top:28px}.ribbon a{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--muted);flex-shrink:0}.ribbon a .icon{width:16px;height:16px}.ribbon a:hover{color:var(--ink);border-color:var(--accent)}.ribbon-line{flex:1;height:1px;background:var(--line);min-width:8px}
.headline-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;border-block:1px solid var(--line);padding:24px 0;margin:32px 0 16px}.hm-item strong{display:block;font-size:clamp(24px,3vw,42px);font-weight:500;font-variant-numeric:tabular-nums}.hm-item span{text-transform:capitalize;color:var(--muted)}.hm-item.lead{grid-column:span 2}.hm-item.lead strong{font-size:clamp(40px,6vw,76px)}.metric-bar{display:block;height:4px;border-radius:2px;background:var(--line);margin-top:10px;overflow:hidden}.metric-bar i{display:block;height:100%;background:var(--gradient)}.metric-bar.unchecked{background-image:repeating-linear-gradient(90deg,var(--muted) 0 4px,transparent 4px 8px);background-color:transparent}
.deck-section>.claim,.deck-section>p,.deck-section>.unwritten,.deck-section>h3,#limits>ul{max-width:68ch;margin-inline:0}.section-heading{display:grid;grid-template-columns:96px 1fr 1fr;gap:24px;align-items:end;margin-bottom:40px}.section-heading h2{margin:0;display:flex;align-items:center;gap:16px}.section-heading h2 .icon{width:.68em;height:.68em;stroke-width:1.4;color:var(--accent);flex-shrink:0}.section-number{font:200 clamp(44px,5vw,72px)/1 ui-monospace,monospace;color:var(--accent);opacity:.3}.standfirst{color:var(--muted);max-width:40ch}
.deck-section>.claim{max-width:960px;display:grid;grid-template-columns:minmax(0,1fr) 220px;column-gap:32px;align-items:start}.deck-section>.claim>.basis,.deck-section>.claim>.unsupported{margin:0;border-left:2px solid var(--line);padding-left:14px;font-size:13px}
@media(max-width:900px){.deck-section>.claim{display:block}.deck-section>.claim>.basis,.deck-section>.claim>.unsupported{border-left:none;padding-left:0;margin-top:8px}}
[data-kind=judgement]{background:var(--card);padding:56px 40px;border-radius:18px;box-shadow:var(--shadow-1);border-top:none;position:relative}[data-kind=judgement]::before{content:'';position:absolute;top:0;left:40px;right:40px;height:4px;border-radius:0 0 3px 3px;background:var(--gradient)}[data-kind=judgement] .section-number{background:var(--gradient);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:1}[data-kind=judgement] .section-heading h2 .icon{color:var(--accent-2)}
.work-plan{list-style:none;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}.work-plan .claim{border-top:2px solid var(--accent)}
#proposed-map main{max-width:none;padding:0}#proposed-map .architecture-lanes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}#proposed-map .row{grid-template-columns:1fr}#proposed-map .lane header h2{font-size:22px;font-weight:600}#proposed-map .node{min-width:0;padding:16px 18px}#proposed-map .s-observed{border-left-color:var(--muted);opacity:.85}#proposed-map .s-proposed{border:1px solid var(--accent);border-left-width:6px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 14%,var(--card)),var(--card))}#proposed-map .toolbar{display:none}
.deck-layout{display:grid;grid-template-columns:236px 1fr;gap:44px;align-items:start}.deck-flow{min-width:0}
.rail{position:sticky;top:52px;display:flex;flex-direction:column;gap:2px;max-height:calc(100vh - 76px);overflow-y:auto;padding:4px}
.rail a{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:8px;color:var(--muted);font-size:13.5px;line-height:1.3;text-decoration:none}
.rail a:hover{background:var(--card);color:var(--ink)}
.rail a[aria-current=true]{background:var(--card);color:var(--ink);font-weight:600}
.rail a[aria-current=true] .icon{color:var(--accent)}
.rail .icon{width:16px;height:16px;stroke-width:1.5}
.rail-group{display:flex;flex-direction:column;gap:2px}
.rail-group a:not(:first-child){padding-left:37px;font-size:12.5px}
@media(max-width:900px){.deck-layout{display:block}.rail{position:sticky;top:0;z-index:5;flex-direction:row;overflow-x:auto;overflow-y:visible;max-height:none;padding:12px 4px;border-bottom:1px solid var(--line);background:var(--bg)}.rail-group{display:contents}.rail-group a:not(:first-child){display:none}.toolbar{position:static;opacity:1;padding:14px 0}.toolbar .kicker{display:block}}
@media print{.rail{display:none}.deck-layout{display:block}}
@media(max-width:700px){.section-heading{grid-template-columns:40px 1fr;gap:12px;align-items:baseline}.section-number{font-size:22px;opacity:.5}.standfirst{grid-column:2}.headline-metrics,.work-plan,#proposed-map .architecture-lanes{grid-template-columns:1fr}.hm-item.lead{grid-column:span 1}.cover{min-height:auto;padding:40px 0}[data-kind=judgement]{padding:32px 20px;border-radius:12px}[data-kind=judgement]::before{left:20px;right:20px}}
@page{margin:18mm}
@media print{.cover{min-height:230mm;break-after:page}.deck-section{break-before:page}.section-heading{break-inside:avoid;break-after:avoid}.headline-metrics{grid-template-columns:repeat(3,1fr)}.work-plan{display:block}.work-plan li{break-inside:avoid}main{padding:0}.cover h1{font-size:42px}}

`;

/** Highlights the current section in the sticky nav. Purely additive: plain links work with no JS. */
const DECK_NAV_SCRIPT = String.raw`
{
  const nav = document.querySelector('nav[aria-label="Consulting report sections"]');
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if (links.length && 'IntersectionObserver' in globalThis) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const link = byId.get(entry.target.id);
          if (link && entry.isIntersecting) {
            for (const a of links) a.removeAttribute('aria-current');
            link.setAttribute('aria-current', 'true');
          }
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const id of byId.keys()) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
  }
}
`;

export function renderConsultHtml(
  r: AuditReport,
  consumers: ConsumersReport,
  root: string,
  consult?: Consult,
  against?: ReferenceSet,
  adoption?: ReturnType<typeof adoptionReport>,
  historyError?: string,
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
    return `<article class="problem-card s-${esc(f.severity)}"><span class="badge ${esc(f.severity)}">${esc(f.severity)}</span><h3><a href="#${esc(findingGroupId(f.severity, f.ruleId))}">${esc(words.title)}</a></h3><p>${esc(words.description)}</p><p class="basis">${esc(f.ruleId)} · ${typeof f.data?.count === 'number' ? `${f.data.count} recorded occurrences` : '1 finding group'}</p><p>${locations.length ? locations.map(ref).join(' · ') : 'No file:line recorded; see detailed engine evidence.'}</p></article>`;
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
  const HM_CATEGORIES = ['color', 'spacing', 'typography'] as const;
  const hmRatios = HM_CATEGORIES.map((category) => r.ratios[`style-tokenization-${category}`]);
  const hmDefined = hmRatios.flatMap((v, i) => (v === undefined ? [] : [i]));
  const hmWorst = hmDefined.length
    ? hmDefined.reduce((worst, i) => (hmRatios[i]! < hmRatios[worst]! ? i : worst), hmDefined[0])
    : -1;
  const headlines = HM_CATEGORIES.map((category, i) => {
    const ratio = hmRatios[i];
    const lead = i === hmWorst ? ' lead' : '';
    if (ratio === undefined)
      return `<div class="hm-item${lead}"><span>${category} tokenization</span><strong>not checked</strong><span class="metric-bar unchecked" aria-hidden="true"></span></div>`;
    return `<div class="hm-item${lead}"><span>${category} tokenization</span><strong class="grad-text">${(ratio * 100).toFixed(1)}%</strong><span class="metric-bar"><i style="width:${ratio * 100}%"></i></span></div>`;
  }).join('');
  const railLink = (id: string, title: string) =>
    `<a href="#${id}">${icon(SECTION_ICON[id])}<span>${title}</span></a>`;
  const rail = `<nav class="rail" aria-label="Consulting report sections">${railLink('summary', 'Summary')}${railLink('problem', 'The problem')}<div class="rail-group">${railLink('current', 'Where you are now')}<a href="#coverage"><span>Coverage</span></a><a href="#findings"><span>Findings</span></a><a href="#inventory"><span>CSS inventory</span></a><a href="#tokens"><span>Token architecture</span></a></div>${railLink('ideal', 'What good looks like')}${railLink('after', 'Where this takes you')}${railLink('plan', 'The plan')}${railLink('limits', "What we couldn't check")}</nav>`;
  const RIBBON_ORDER = ['summary', 'problem', 'current', 'ideal', 'after', 'plan', 'limits'];
  const ribbon = `<div class="ribbon" aria-hidden="true">${RIBBON_ORDER.map(
    (id, i) =>
      `<a href="#${id}" tabindex="-1">${icon(SECTION_ICON[id])}</a>${i < RIBBON_ORDER.length - 1 ? '<span class="ribbon-line"></span>' : ''}`,
  ).join('')}</div>`;
  const VERDICT_CHIP: Record<string, { cls: string; icon: string }> = {
    clean: { cls: 'clean', icon: 'status-observed' },
    issues: { cls: 'issues', icon: 'problem' },
    'not-checked': { cls: 'not-checked', icon: 'status-not-checked' },
  };
  const vc = VERDICT_CHIP[r.verdict] ?? VERDICT_CHIP['not-checked'];
  const SEVERITIES = ['blocking', 'high', 'medium', 'low'] as const;
  const sevCounts = SEVERITIES.map((s) => r.findings.filter((f) => f.severity === s).length);
  const sevTotal = sevCounts.reduce((a, b) => a + b, 0);
  const severityBar = sevTotal
    ? `<div class="bar" aria-hidden="true">${SEVERITIES.map((s, i) => `<span class="${s}" style="width:${(sevCounts[i] / sevTotal) * 100}%"></span>`).join('')}</div><div class="legend">${SEVERITIES.map((s, i) => `<span>${s} ${sevCounts[i]}</span>`).join('')}</div>`
    : '';
  const intro = `${ICON_SPRITE}<section class="cover"><div class="halftone" aria-hidden="true"></div><div class="cover-orb" aria-hidden="true"></div><div class="verdict-chip s-${vc.cls}">${icon(vc.icon)}<span>${esc(PLAIN_VERDICTS[r.verdict].title)}</span></div><p class="basis">${esc(r.manifest.fixtureLabel)} · ${esc(r.manifest.ranAt.slice(0, 10))}</p><h1>${esc(consult?.title ?? 'Your design system, in view')}</h1><p class="lead">${esc(PLAIN_VERDICTS[r.verdict].description)}</p><div class="headline-metrics">${headlines}</div><p class="basis">Reference-only values / (literal + reference + mixed values). Not reference resolution. <a href="#limits">Read the coverage limits.</a></p>${ribbon}</section><div class="deck-layout">${rail}<div class="deck-flow">${section(
    'summary',
    'Summary',
    `<p class="lead">${esc(PLAIN_VERDICTS[r.verdict].title)}</p><p>${esc(PLAIN_VERDICTS[r.verdict].description)}</p><p><b>What we checked:</b> ${r.coverage.partialReads.length ? `${esc([...new Set(r.coverage.partialReads.flatMap((p) => p.extensions))].join(', '))} files with ${r.rulesRun.length} checks.` : 'No supported files were checked.'} ${r.coverage.complete ? 'No additional coverage gaps reported within that scope.' : 'Coverage is incomplete; see the limits below.'} <a href="#limits">What we couldn’t check</a></p>${severityBar}<h3>First things to review</h3><p>Up to three finding groups, ordered by engine severity. This is not a business-priority ranking.</p><div class="top-problems">${r.findings.slice(0, 3).map(finding).join('') || '<p>No problems were reported. Read the coverage limits.</p>'}</div>`,
  )}${section(
    'problem',
    'The problem',
    consult
      ? `<p class="basis">Agent assessment; the engine does not establish business impact.</p>${consult.problem.map(claim).join('')}${consult.assumptions.length ? `<h3>Assumptions — awaiting confirmation</h3>${consult.assumptions.map(claim).join('')}` : '<p>No assumptions recorded by the author.</p>'}`
      : missing,
  )}<section class="deck-section" id="current"><header class="section-heading"><span class="section-number">03</span><h2>${icon('current')}Where you are now</h2><p class="standfirst">Source evidence, available for inspection.</p></header><p>Measured from source code. Counts describe the source; they are not grades.</p>`;
  const consumersView = consumers.packages.length
    ? `<h3>Component usage</h3>${embedReport(renderConsumersHtml(consumers, { label: r.manifest.fixtureLabel, generatedAt: r.manifest.ranAt }), 'consumer-map')}<h3>Recorded import locations</h3><ul>${consumers.consumers.flatMap((c) => c.uses.map((u) => `<li>${esc(c.package)} → ${esc(u.specifier)}: ${u.samples.map((s) => ref(`${s.file}:${s.line}`)).join(' · ')}</li>`)).join('')}</ul>`
    : '<p>Component usage not checked: no workspace packages were found at this source root.</p>';
  const shape = teamShape(root, consumers);
  const structure = `<h3>Team structure</h3><ul>${formatTeamShape(shape)
    .map((f) => `<li>${esc(f)}</li>`)
    .join('')}</ul>`;
  const documentation = r.documentation
    ? `<h3>Component documentation</h3>${r.documentation.packages
        .map(
          (p) =>
            `<h4>${esc(p.package)}</h4><p>${Object.entries(p.ratios)
              .map(
                ([category, ratio]) =>
                  `${esc(category)}: ${ratio === null ? 'not checked' : `${(ratio * 100).toFixed(1)}%`}`,
              )
              .join(
                ' · ',
              )}</p><ul>${p.components.map((c) => `<li>${esc(c.name)} · ${ref(`${c.file}:${c.line}`)} — ${(['story', 'docs', 'types', 'example'] as const).map((key) => `${key}: ${c[key].length ? c[key].map((e) => ref(`${e.file}:${e.line}`)).join(', ') : 'no local evidence found'}`).join('; ')}</li>`).join('')}</ul>`,
        )
        .join('')}<ul>${r.documentation.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : '';
  const outro = `${structure}${benchmarkHtml(r, shape, against)}${consumersView}${documentation}</section>${adoption ? adoptionHtml(adoption, historyError) : ''}${section(
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
  )}</div></div>`;
  return renderAuditHtml(r, {
    consulting: {
      intro,
      outro,
      css: CSS,
      sourceBase: pathToFileURL(`${resolve(root)}/`).href,
      findings: `<div class="theme-findings">${[...themes].map(([theme, rows]) => `<h3>${esc(theme)}</h3>${rows.map(finding).join('')}`).join('')}</div>`,
      script: DECK_NAV_SCRIPT,
    },
  });
}
