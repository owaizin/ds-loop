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
import { halftoneComet, meshPanel } from './graphics.ts';
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
/* ── Shell: a fixed aubergine rail in both themes, content to its right ── */
:root{--rail-w:252px;--rail-bg:#150d27;--rail-ink:#f4f1ff;--rail-muted:#9a90b5;--rail-line:#2d2247;--sev-blocking:#b3243f;--sev-high:#d2622f;--sev-medium:#a8780f;--sev-low:#3f77a6}
:root[data-theme=dark]{--sev-blocking:#ff6f88;--sev-high:#ff9f63;--sev-medium:#efc563;--sev-low:#84b9e8}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--sev-blocking:#ff6f88;--sev-high:#ff9f63;--sev-medium:#efc563;--sev-low:#84b9e8}}
body{font-size:16px;line-height:1.65}
main{max-width:none;margin:0 0 0 var(--rail-w);padding:0 clamp(24px,4vw,72px) 96px}
h1{font-weight:800;letter-spacing:-.045em;line-height:1.02}
h2{font-size:clamp(26px,3.4vw,40px);font-weight:700;letter-spacing:-.038em}
h3{font-size:20px;font-weight:700;letter-spacing:-.015em}
a,code{overflow-wrap:anywhere}
.deck-layout{display:block}
.deck-flow,.cover{max-width:1180px}

.rail{position:fixed;top:0;left:0;bottom:0;width:var(--rail-w);max-height:none;background:var(--rail-bg);border-right:1px solid var(--rail-line);display:flex;flex-direction:column;gap:2px;padding:26px 14px 18px;overflow-y:auto;z-index:30}
.rail-brand{padding:0 10px 20px;border-bottom:1px solid var(--rail-line);margin-bottom:16px}
.rail-brand b{display:block;font:800 15px/1.15 Manrope,system-ui,sans-serif;letter-spacing:-.02em;color:var(--rail-ink)}
.rail-brand span{display:block;margin-top:5px;font:500 13px/1.3 system-ui,sans-serif;color:var(--rail-muted)}
.rail a{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;color:var(--rail-muted);font-size:13.5px;line-height:1.3;text-decoration:none}
.rail a:hover{background:rgb(255 255 255/.07);color:var(--rail-ink)}
.rail a[aria-current=true]{background:rgb(255 255 255/.11);color:var(--rail-ink);font-weight:700}
.rail a[aria-current=true] .icon{color:var(--accent-2)}
.rail .icon{width:16px;height:16px;stroke-width:1.5}
.rail-group{display:flex;flex-direction:column;gap:2px}
.rail-group a:not(:first-child){padding-left:37px;font-size:12.5px}
.rail-count{margin-left:auto;font:600 12.5px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums;padding:4px 7px;border-radius:999px;background:rgb(255 255 255/.12);color:var(--rail-ink)}
.rail-foot{margin-top:0;padding:16px 10px 0;border-top:1px solid var(--rail-line);font:500 12.5px/1.5 system-ui,sans-serif;color:var(--rail-muted);word-break:break-word}

.toolbar{position:fixed;top:0;right:0;left:auto;width:auto;padding:12px 22px;font-size:11px;opacity:.5;z-index:20;background:transparent;border:none;transition:opacity .15s}
.toolbar:hover,.toolbar:focus-within{opacity:1}.toolbar .kicker{display:none}

/* ── Cover ── */
.cover{position:relative;min-height:auto;display:grid;grid-template-columns:minmax(0,1fr) clamp(200px,23vw,340px);column-gap:clamp(28px,4vw,64px);align-items:start;padding:clamp(48px,6vw,84px) 0 clamp(40px,5vw,64px);margin:0}
.cover-text{grid-column:1;grid-row:1;min-width:0}
.cover>.headline-metrics,.cover>.basis,.cover>.ribbon,.cover-band{grid-column:1/-1}
.cover-band{display:flex;align-items:center;justify-content:space-between;gap:clamp(24px,4vw,56px);flex-wrap:wrap;margin-top:clamp(32px,4vw,48px)}
.cover-band .lead{margin:0}
.cover-band .cta{margin-top:0;flex-shrink:0}
.rail-art{display:block;position:relative;margin:auto -14px 0;height:180px;overflow:hidden;flex-shrink:0}
.rail-art .art{position:absolute;inset:0;width:100%;height:100%;display:block}
.cover-art{grid-column:2;grid-row:1;position:relative;aspect-ratio:4/5;overflow:hidden;--art-blend:screen;background:transparent;border-radius:0;-webkit-mask-image:radial-gradient(84% 76% at 56% 44%,#000 0 50%,rgb(0 0 0/.4) 80%,transparent 100%);mask-image:radial-gradient(84% 76% at 56% 44%,#000 0 50%,rgb(0 0 0/.4) 80%,transparent 100%)}
.cover-art .art{position:absolute;inset:0;width:100%;height:100%;display:block}
.cover-eyebrow{display:flex;align-items:center;gap:9px;font:500 14px/1.4 system-ui,sans-serif;color:var(--muted);margin:0 0 22px}
.cover h1{font-size:clamp(40px,4.9vw,72px);max-width:15ch;margin:0}
.cover-eyebrow .icon{width:15px;height:15px;color:var(--accent-2)}
.cover-sub{font:800 clamp(30px,4.1vw,56px)/1.06 Manrope,system-ui,sans-serif;letter-spacing:-.042em;margin:6px 0 26px;max-width:20ch;color:var(--accent)}
.cover .lead{font-size:19px;max-width:52ch;color:var(--muted);margin:0}
.cta{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;margin-top:32px;padding:15px 26px;border-radius:8px;background:var(--accent);color:var(--bg);font-weight:700;font-size:15px;text-decoration:none}
.cta:hover{filter:brightness(1.1)}
.basis{color:var(--muted);font-size:14px;max-width:66ch}

/* ── Metric band ── */
.headline-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border-block:1px solid var(--line);padding:30px 0;margin:48px 0 14px}
.hm-item{display:flex;flex-direction:column;padding:0 30px;border-left:1px solid var(--line)}
.hm-item:first-child{border-left:none;padding-left:0}
.hm-item.lead{grid-column:span 1}
.hm-item strong.grad-text{background-image:linear-gradient(105deg,var(--accent) 12%,var(--accent-2) 88%)}
.hm-item strong{order:1;display:block;font:700 clamp(30px,3.4vw,50px)/1 Manrope,system-ui,sans-serif;letter-spacing:-.045em;font-variant-numeric:tabular-nums;margin-bottom:9px}
.hm-item.lead strong{font-size:clamp(30px,3.4vw,50px)}
.hm-item>span:first-child{order:2;font-size:13px;color:var(--muted);text-transform:capitalize}
.hm-item .metric-bar{order:3;display:block;height:3px;border-radius:2px;background:var(--line);margin-top:14px;overflow:hidden}
.hm-item .metric-bar i{display:block;height:100%;background:var(--gradient)}
.metric-bar.unchecked{background-image:repeating-linear-gradient(90deg,var(--muted) 0 3px,transparent 3px 7px);background-color:transparent}
.hm-item .hm-sev,.hm-item .hm-sev span{text-transform:none}
.hm-sev{order:3;display:flex;gap:14px;margin-top:14px;font:500 13px/1.3 system-ui,sans-serif;color:var(--muted)}
.hm-sev b{font-weight:700;color:var(--ink)}

.ribbon{display:flex;align-items:center;gap:0;margin-top:34px}
.ribbon a{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--card);border:1px solid var(--line);color:var(--muted);flex-shrink:0}
.ribbon a .icon{width:15px;height:15px}
.ribbon a:hover{color:var(--ink);border-color:var(--accent)}
.ribbon-line{flex:1;height:1px;background:var(--line);min-width:8px}

/* ── Sections ── */
.deck-section{padding:64px 0;border-top:1px solid var(--line);margin:0}
.deck-section>p,.deck-section>.unwritten,.deck-section>h3,.deck-section>.claim{max-width:68ch;margin-inline:0}
.section-heading{display:grid;grid-template-columns:96px 1fr 1fr;gap:24px;align-items:end;margin-bottom:44px}
.section-heading h2{margin:0;display:flex;align-items:center;gap:16px}
.section-heading h2 .icon{width:.66em;height:.66em;stroke-width:1.5;color:var(--accent);flex-shrink:0}
.section-number{font:200 clamp(44px,5vw,72px)/1 ui-monospace,monospace;color:var(--accent);opacity:.28;font-variant-numeric:tabular-nums}
.standfirst{color:var(--muted);max-width:40ch;font-size:15px}
.lead{font-size:21px}
[data-kind=judgement]{background:var(--card);padding:56px 44px;border-radius:16px;border:1px solid var(--line);border-top:none;position:relative;overflow:hidden}
[data-kind=judgement]::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:var(--gradient)}
[data-kind=judgement] .section-number{background:var(--gradient);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:1}
[data-kind=judgement] .section-heading h2 .icon{color:var(--accent-2)}

/* ── Claims ── */
.claim{padding:22px 0;border-bottom:1px solid var(--line)}
.deck-section>.claim{max-width:960px;display:grid;grid-template-columns:minmax(0,1fr) 220px;column-gap:32px;align-items:start}
.deck-section>.claim>.basis,.deck-section>.claim>.unsupported{margin:0;font-size:13.5px}
.unsupported{color:var(--accent);font-weight:700}
.unwritten{padding:24px;border:1px dashed var(--line);border-radius:12px}

/* ── Findings by area ── */
.assess{width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15px}
.assess th{text-align:left;font:600 13px/1.3 system-ui,sans-serif;color:var(--muted);padding:0 18px 13px 0;border-bottom:1px solid var(--line);white-space:nowrap}
.assess td{padding:17px 18px 17px 0;border-bottom:1px solid var(--line);vertical-align:top}
.assess tr:hover td{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.assess td:first-child{font-weight:700;white-space:nowrap}
.assess .num{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--muted)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:9px;background:var(--muted);flex-shrink:0}
.dot.blocking{background:var(--sev-blocking)}.dot.high{background:var(--sev-high)}.dot.medium{background:var(--sev-medium)}.dot.low{background:var(--sev-low)}
.assess .sev{display:inline-flex;align-items:center;white-space:nowrap;font-weight:600}

/* ── Finding rows ── */
.top-problems,.theme-findings{display:block}
.problem-card{display:grid;grid-template-columns:168px minmax(0,1fr) minmax(0,260px);gap:28px;align-items:start;padding:22px 0;border:0;border-bottom:1px solid var(--line)}
.problem-card:first-of-type{border-top:1px solid var(--line)}
.problem-card:hover{background:color-mix(in srgb,var(--accent) 4%,transparent)}
.pc-id{display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.pc-id code{font-size:12.5px;color:var(--muted);line-height:1.4}
.pc-body h3{margin:0 0 6px}
.pc-body p{margin:0;color:var(--muted);font-size:15px;max-width:62ch}
.pc-ev{font-size:13px;color:var(--muted)}
.pc-ev .num{display:block;font:600 13px/1.3 system-ui,sans-serif;margin-bottom:8px;color:var(--ink)}
.pc-ev p{margin:0;word-break:break-word}
.theme-findings>h3{margin:44px 0 18px;font:700 15px/1.3 Manrope,system-ui,sans-serif;letter-spacing:-.01em;color:var(--muted)}

/* ── Delivery sequence ── */
.work-plan{display:block;list-style:none;padding:0;margin:0;counter-reset:step}
.work-plan li{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 28px;padding:0 0 40px;border:0;max-width:900px}
.work-plan li::before{counter-increment:step;content:counter(step,decimal-leading-zero);display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;border:1px solid var(--accent);color:var(--accent);font:700 13px/1 ui-monospace,monospace;font-variant-numeric:tabular-nums;background:var(--bg)}
.work-plan li::after{content:'';position:absolute;left:21.5px;top:50px;bottom:-6px;width:1px;background:var(--line)}
.work-plan li:last-child{padding-bottom:0}
.work-plan li:last-child::after{display:none}
.work-plan li>*{grid-column:2}
.work-plan li>.basis:first-child{margin:0 0 10px;font:600 13.5px/1.4 system-ui,sans-serif;color:var(--accent)}
.work-plan li>.basis{margin:10px 0 0;font-size:13px}
.work-plan li>h3{margin:0 0 14px;font-size:24px;letter-spacing:-.025em}
.work-plan li>p{margin:0 0 8px;color:var(--muted);font-size:15px;max-width:62ch}
.work-plan li>p b{color:var(--ink);font-weight:700}
[data-kind=judgement] .work-plan li::before{background:var(--card)}

/* ── Scope and limits ── */
#limits ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 40px;list-style:none;padding:0;margin:0 0 28px;max-width:none}
#limits li{padding:15px 0;border-top:1px solid var(--line);font-size:14.5px;color:var(--muted);max-width:60ch}
#limits>p{max-width:68ch}

/* ── Embedded sub-reports ── */
.embedded-report p,.embedded-report li{max-width:66ch}
.embedded-report{margin:32px 0;border-radius:14px;--edge:var(--accent);--obs:var(--muted);--inf:var(--muted);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}
.embedded-report h1{font-size:28px}.embedded-report h2{font-size:23px}
.embedded-report .node{--obs:var(--muted);--inf:var(--muted);--pro:var(--accent);--nc:var(--muted);--bad:var(--accent)}
.embedded-report .unsupported{display:block}
.token-lanes p,.token-lanes small{font-size:14px}
#proposed-map main{max-width:none;margin:0;padding:0}
#proposed-map .architecture-lanes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}
#proposed-map .row{grid-template-columns:1fr}
#proposed-map .lane header h2{font-size:22px;font-weight:600}
#proposed-map .node{min-width:0;padding:16px 18px}
#proposed-map .s-observed{border-left-color:var(--muted);opacity:.85}
#proposed-map .s-proposed{border:1px solid var(--accent);background:linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 14%,var(--card)),var(--card))}
#proposed-map .toolbar,#consumer-map .toolbar{display:none}
#consumer-map main{margin:0}

/* ── Responsive ── */
@media(max-width:1100px){
  main{margin-left:0;padding-inline:clamp(20px,5vw,40px)}
  .rail{position:sticky;top:0;left:auto;bottom:auto;width:auto;height:auto;flex-direction:row;align-items:center;overflow-x:auto;overflow-y:visible;padding:10px 12px;border-right:none;border-bottom:1px solid var(--rail-line)}
  .rail-brand{padding:0 16px 0 6px;margin:0 8px 0 0;border-bottom:none;border-right:1px solid var(--rail-line);flex-shrink:0}
  .rail-brand span{display:none}
  .rail-group{display:contents}
  .rail-group a:not(:first-child){display:none}
  .rail a{white-space:nowrap;flex-shrink:0}
  .rail-foot{display:none}
  .toolbar{position:static;opacity:1;padding:14px 0;text-align:right}
  .problem-card{grid-template-columns:150px minmax(0,1fr)}
  .pc-ev{grid-column:2}
}
@media(max-width:1000px){
  .cover{grid-template-columns:minmax(0,1fr) clamp(170px,26vw,240px);column-gap:32px}
}
@media(max-width:760px){
  .cover{grid-template-columns:1fr;row-gap:28px}
  .cover-art{grid-column:1;grid-row:1;aspect-ratio:16/7}
  .cover-text{grid-column:1;grid-row:2}
}
@media(max-width:820px){
  .headline-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:26px 0}
  .hm-item:nth-child(odd){border-left:none;padding-left:0}
  .deck-section>.claim{display:block}
  .deck-section>.claim>.basis,.deck-section>.claim>.unsupported{border-left:none;padding-left:0;margin-top:8px}
  #proposed-map .architecture-lanes{grid-template-columns:1fr}
}
@media(max-width:700px){
  .section-heading{grid-template-columns:40px 1fr;gap:12px;align-items:baseline}
  .section-number{font-size:22px;opacity:.5}
  .standfirst{grid-column:2}
  .problem-card{display:block}
  .pc-id{flex-direction:row;align-items:center;gap:12px;margin-bottom:8px}
  .pc-ev{margin-top:10px}
  .cover{padding:32px 0 40px}
  [data-kind=judgement]{padding:32px 20px;border-radius:14px}
  .deck-section{padding:36px 0}
}

/* ── Print ── */
@page{margin:18mm}
@media print{
  :root,:root[data-theme=dark],:root[data-theme=light]{--bg:#fff;--card:#fff;--ink:#000;--muted:#444;--line:#bbb;--accent:#000;--accent-2:#444;--warn:#000;--shadow-1:none;color-scheme:light}
  body{background:#fff;color:#000}
  .rail,.toolbar,nav{display:none}
  main{margin:0;padding:0}
  .deck-layout,.deck-flow{display:block;max-width:none}
  .cover{min-height:230mm;break-after:page;padding:0}
  .cover h1{font-size:42px}.cover-sub{font-size:30px}
  .cover-art,.ribbon,.cta{display:none}
  .deck-section{break-before:page;padding:16px 0}
  .deck-section:first-of-type{break-before:auto}
  .section-heading{break-inside:avoid;break-after:avoid}
  .headline-metrics{grid-template-columns:repeat(4,1fr)}
  .work-plan li{break-inside:avoid;display:block}
  .work-plan li::before,.work-plan li::after{display:none}
  .claim,.problem-card,.assess tr{break-inside:avoid}
  .embedded-report{overflow:visible}
  .grad-text,.section-number{background:none;-webkit-text-fill-color:currentColor;color:#000}
  #proposed-map .s-proposed{background:none;border-color:#000}
  [data-kind=judgement]{box-shadow:none;border-radius:0;border:none}
  [data-kind=judgement]::before{display:none}
}


/* ── The canonical palette ──────────────────────────────────────
   Dark is primary; light is the warm editorial page. Both are set on <body>
   so they inherit past the shared theme vars without a specificity fight.
   The rail is dark in both, so its own tokens do not vary. */
body{--bg:#0c0618;--card:#181031;--ink:#f4f0ff;--muted:#a99fc2;--line:#2b2146;--accent:#c4b0ff;--accent-2:#f5a06e;--warn:var(--accent);--edge:var(--accent);--shadow-1:none;--art-warm:#f4642a;--art-mid:#c05bd6;--art-cool:#8b6df0;--sev-blocking:#ff6f88;--sev-high:#ff9f63;--sev-medium:#efc563;--sev-low:#84b9e8}
:root[data-theme=light] body{--bg:#faf6f2;--card:#fff;--ink:#231533;--muted:#6b6076;--line:#e9e1db;--accent:#6323b9;--accent-2:#ff5a1f;--art-warm:#ef6a38;--art-mid:#b95ad2;--art-cool:#6d31d0;--sev-blocking:#b3243f;--sev-high:#e05a22;--sev-medium:#a8780f;--sev-low:#3f77a6}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]) body{--bg:#faf6f2;--card:#fff;--ink:#231533;--muted:#6b6076;--line:#e9e1db;--accent:#6323b9;--accent-2:#ff5a1f;--art-warm:#ef6a38;--art-mid:#b95ad2;--art-cool:#6d31d0;--sev-blocking:#b3243f;--sev-high:#e05a22;--sev-medium:#a8780f;--sev-low:#3f77a6}}
:root[data-theme=light],:root[data-theme=light] body{color-scheme:light}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]),:root:not([data-theme=dark]) body{color-scheme:light}}
body,:root[data-theme=dark],:root[data-theme=dark] body{color-scheme:dark}

/* gradient-filled numerals wash out on the light page without a darker warm stop */
:root[data-theme=light] .grad-text{background-image:linear-gradient(105deg,var(--accent) 10%,#c9430f 92%)}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]) .grad-text{background-image:linear-gradient(105deg,var(--accent) 10%,#c9430f 92%)}}

/* the verdict band: a plane change on light, a surface on dark */
.cover-band{padding:24px 28px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
:root[data-theme=light] .cover-band{margin-left:calc(clamp(24px,4vw,72px)*-1);padding:30px clamp(24px,4vw,72px);border:none;border-radius:0;background:var(--rail-bg);color:var(--rail-ink)}
:root[data-theme=light] .cover-band .lead{color:var(--rail-ink)}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]) .cover-band{margin-left:calc(clamp(24px,4vw,72px)*-1);padding:30px clamp(24px,4vw,72px);border:none;border-radius:0;background:var(--rail-bg);color:var(--rail-ink)}:root:not([data-theme=dark]) .cover-band .lead{color:var(--rail-ink)}}
:root[data-theme=light] .cover-art{--art-blend:multiply;background:var(--card);-webkit-mask-image:none;mask-image:none}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]) .cover-art{--art-blend:multiply;background:var(--card);-webkit-mask-image:none;mask-image:none}}
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
    const count = typeof f.data?.count === 'number' ? f.data.count : 1;
    return `<article class="problem-card s-${esc(f.severity)}"><div class="pc-id"><span class="badge ${esc(f.severity)}">${esc(f.severity)}</span><code>${esc(f.ruleId)}</code></div><div class="pc-body"><h3><a href="#${esc(findingGroupId(f.severity, f.ruleId))}">${esc(words.title)}</a></h3><p>${esc(words.description)}</p></div><div class="pc-ev"><span class="num">${count} recorded ${count === 1 ? 'occurrence' : 'occurrences'}</span><p>${locations.length ? locations.map(ref).join(' · ') : 'No file:line recorded; see detailed engine evidence.'}</p></div></article>`;
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
  const SEVERITIES = ['blocking', 'high', 'medium', 'low'] as const;
  const sevCounts = SEVERITIES.map((s) => r.findings.filter((f) => f.severity === s).length);
  const sevTotal = sevCounts.reduce((a, b) => a + b, 0);
  const worstOf = (rows: AuditReport['findings']) =>
    SEVERITIES.find((s) => rows.some((f) => f.severity === s));
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
  const severitySplit =
    SEVERITIES.flatMap((s, i) => (sevCounts[i] ? [`<span><b>${sevCounts[i]}</b> ${s}</span>`] : [])).join(
      '',
    ) || '<span>none reported</span>';
  const metrics = `${headlines}<div class="hm-item"><span>finding groups</span><strong>${r.findings.length}</strong><span class="hm-sev">${severitySplit}</span></div>`;
  const railLink = (id: string, title: string) =>
    `<a href="#${id}">${icon(SECTION_ICON[id])}<span>${title}</span></a>`;
  const rail = `<nav class="rail" aria-label="Consulting report sections"><div class="rail-brand"><b>Design System Loop</b><span>System review</span></div>${railLink('summary', 'Summary')}${railLink('problem', 'The problem')}<div class="rail-group">${railLink('current', 'Where you are now')}<a href="#coverage"><span>Coverage</span></a><a href="#findings"><span>Findings</span>${r.findings.length ? `<span class="rail-count">${r.findings.length}</span>` : ''}</a><a href="#inventory"><span>CSS inventory</span></a><a href="#tokens"><span>Token architecture</span></a></div>${railLink('ideal', 'What good looks like')}${railLink('after', 'Where this takes you')}${railLink('plan', 'The plan')}${railLink('limits', "What we couldn't check")}<div class="rail-art" aria-hidden="true">${halftoneComet('rl', 280, 200, 7.5, 3.4)}</div><div class="rail-foot">${esc(r.manifest.fixtureLabel)}<br>${esc(r.manifest.ranAt.slice(0, 10))}</div></nav>`;
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
  const severityBar = sevTotal
    ? `<div class="bar" aria-hidden="true">${SEVERITIES.map((s, i) => `<span class="${s}" style="width:${(sevCounts[i] / sevTotal) * 100}%"></span>`).join('')}</div><div class="legend">${SEVERITIES.map((s, i) => `<span>${s} ${sevCounts[i]}</span>`).join('')}</div>`
    : '';
  const intro = `${ICON_SPRITE}<section class="cover"><div class="cover-art" aria-hidden="true">${meshPanel('cv')}</div><div class="cover-text"><p class="cover-eyebrow">${icon(vc.icon)}${esc(r.manifest.fixtureLabel)} / System review · ${esc(r.manifest.ranAt.slice(0, 10))}</p><h1>${esc(consult?.title ?? 'Your design system, in view')}</h1><p class="cover-sub">${esc(PLAIN_VERDICTS[r.verdict].title)}</p></div><div class="cover-band"><p class="lead">${esc(PLAIN_VERDICTS[r.verdict].description)}</p>${consult ? '<a class="cta" href="#plan">Review the plan <span aria-hidden="true">&rarr;</span></a>' : ''}</div><div class="headline-metrics">${metrics}</div><p class="basis">Reference-only values / (literal + reference + mixed values). Not reference resolution. <a href="#limits">Read the coverage limits.</a></p>${ribbon}</section><div class="deck-layout">${rail}<div class="deck-flow">${section(
    'summary',
    'Summary',
    `<p class="lead">${esc(PLAIN_VERDICTS[r.verdict].title)}</p><p>${esc(PLAIN_VERDICTS[r.verdict].description)}</p><p><b>What we checked:</b> ${r.coverage.partialReads.length ? `${esc([...new Set(r.coverage.partialReads.flatMap((p) => p.extensions))].join(', '))} files with ${r.rulesRun.length} checks.` : 'No supported files were checked.'} ${r.coverage.complete ? 'No additional coverage gaps reported within that scope.' : 'Coverage is incomplete; see the limits below.'} <a href="#limits">What we couldn’t check</a></p>${severityBar}${
      themes.size
        ? `<h3>Findings by area</h3><table class="assess"><thead><tr><th scope="col">Area</th><th scope="col">Highest severity</th><th scope="col">Groups</th><th scope="col">Most severe finding</th></tr></thead><tbody>${[
            ...themes,
          ]
            .map(([theme, rows]) => {
              const worst = worstOf(rows);
              const top = rows.find((f) => f.severity === worst) ?? rows[0];
              return `<tr><td>${esc(theme)}</td><td><span class="sev"><span class="dot ${esc(worst ?? '')}"></span>${esc(worst ?? 'none')}</span></td><td class="num">${rows.length}</td><td><a href="#${esc(findingGroupId(top.severity, top.ruleId))}">${esc(PLAIN_RULES[top.ruleId].title)}</a></td></tr>`;
            })
            .join(
              '',
            )}</tbody></table><p class="basis">Severity is the engine’s rule severity, not a business priority.</p>`
        : ''
    }<h3>First things to review</h3><p>Up to three finding groups, ordered by engine severity. This is not a business-priority ranking.</p><div class="top-problems">${r.findings.slice(0, 3).map(finding).join('') || '<p>No problems were reported. Read the coverage limits.</p>'}</div>`,
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
