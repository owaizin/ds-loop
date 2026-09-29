import { ICON_SPRITE, icon } from './icons.ts';

export type Evidence = { ref: string; report?: string };
export type ProposalItem = { status: string; evidence?: Evidence[] };
export type ProposalNode = ProposalItem & {
  id: string;
  lane: string;
  label: string;
  detail?: string;
  replaces?: string;
};
export type Proposal = {
  title: string;
  scope?: string;
  lanes: { id: string; label?: string; note?: string }[];
  nodes: ProposalNode[];
  edges?: (ProposalItem & { from: string; to: string; meaning: string })[];
  decisions?: {
    id?: string;
    question: string;
    status: string;
    owner?: string;
    options?: string[];
    recommendation?: string;
    record?: string;
  }[];
  roadmap?: { stage: string; entry: string; nodes?: string[] }[];
};

export const STATUSES = ['observed', 'inferred', 'proposed', 'not-checked'];
const DECISION_STATUSES = ['proposed', 'decided', 'rejected', 'deferred'];

/** Returns { errors, warnings }. Errors make the proposal unusable; warnings render visibly. */
export function checkProposal(input: unknown): { errors: string[]; warnings: string[] } {
  const shapeErrors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { errors: ['proposal must be a JSON object'], warnings: [] };
  const raw = input as Record<string, unknown>;
  for (const key of ['lanes', 'nodes', 'edges', 'decisions', 'roadmap']) {
    const rows = raw[key];
    if (rows === undefined && !['lanes', 'nodes'].includes(key)) continue;
    if (!Array.isArray(rows)) {
      shapeErrors.push(`${key} must be an array`);
      continue;
    }
    rows.forEach((row, i) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        shapeErrors.push(`${key}[${i}] must be an object`);
        return;
      }
      if (row.evidence !== undefined && !Array.isArray(row.evidence))
        shapeErrors.push(`${key}[${i}].evidence must be an array`);
      for (const field of ['options', 'nodes'])
        if (
          row[field] !== undefined &&
          (!Array.isArray(row[field]) || !row[field].every((v: unknown) => typeof v === 'string'))
        )
          shapeErrors.push(`${key}[${i}].${field} must be a string array`);
    });
  }
  // Continue checking well-shaped rows so one bad array does not hide other errors.
  const p = { ...raw } as unknown as Proposal;
  for (const key of ['lanes', 'nodes', 'edges', 'decisions', 'roadmap'] as const) {
    const rows = raw[key];
    Object.assign(p, {
      [key]: Array.isArray(rows)
        ? rows.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
        : [],
    });
  }
  const errors: string[] = [...shapeErrors];
  const warnings: string[] = [];
  const need = (cond: unknown, msg: string) => {
    if (!cond) errors.push(msg);
  };
  need(typeof p.title === 'string' && p.title.trim(), 'title is required');
  const lanes = Array.isArray(p.lanes) ? p.lanes : [];
  const nodes = Array.isArray(p.nodes) ? p.nodes : [];
  const edges = Array.isArray(p.edges) ? p.edges : [];
  need(lanes.length > 0, 'at least one lane is required');
  need(nodes.length > 0, 'at least one node is required');

  const laneIds = new Set();
  for (const l of lanes) {
    need(typeof l.id === 'string' && l.id, 'every lane needs an id');
    need(!laneIds.has(l.id), `duplicate lane id "${l.id}"`);
    laneIds.add(l.id);
  }
  const nodeIds = new Set();
  const cites = (item: ProposalItem, where: string) => {
    const ev = Array.isArray(item.evidence) ? item.evidence : [];
    for (const e of ev)
      need(typeof e?.ref === 'string' && e.ref.trim(), `${where}: every evidence entry needs a ref`);
    return ev.length > 0;
  };
  // A proposed box must rest on a fact or be shown as unsupported; a proposed
  // link is a proposal by nature and needs only its meaning.
  const statusRule = (item: ProposalItem, where: string, isNode: boolean) => {
    need(STATUSES.includes(item.status), `${where}: status must be one of ${STATUSES.join(', ')}`);
    const has = cites(item, where);
    if ((item.status === 'observed' || item.status === 'inferred') && !has) {
      errors.push(`${where}: ${item.status} needs at least one evidence ref`);
    }
    if (isNode && item.status === 'proposed' && !has)
      warnings.push(`${where}: proposed with no linked fact — shown as unsupported`);
  };
  for (const n of nodes) {
    const where = `node "${n.id ?? '?'}"`;
    need(typeof n.id === 'string' && n.id, 'every node needs an id');
    need(!nodeIds.has(n.id), `duplicate node id "${n.id}"`);
    nodeIds.add(n.id);
    need(laneIds.has(n.lane), `${where}: lane "${n.lane}" is not declared`);
    need(typeof n.label === 'string' && n.label.trim(), `${where}: label is required`);
    statusRule(n, where, true);
  }
  for (const n of nodes) {
    if (n.replaces !== undefined)
      need(nodeIds.has(n.replaces), `node "${n.id}": replaces unknown node "${n.replaces}"`);
  }
  edges.forEach((e, i) => {
    const where = `edge ${i + 1} (${e.from} → ${e.to})`;
    need(nodeIds.has(e.from) && nodeIds.has(e.to), `${where}: both ends must be declared nodes`);
    need(
      typeof e.meaning === 'string' && e.meaning.trim(),
      `${where}: meaning is required (import, containment, proposed consumption…)`,
    );
    statusRule(e, where, false);
  });
  for (const d of Array.isArray(p.decisions) ? p.decisions : []) {
    const where = `decision "${d.id ?? d.question ?? '?'}"`;
    need(typeof d.question === 'string' && d.question.trim(), `${where}: question is required`);
    need(
      DECISION_STATUSES.includes(d.status),
      `${where}: status must be one of ${DECISION_STATUSES.join(', ')}`,
    );
    if (d.status === 'decided')
      need(typeof d.owner === 'string' && d.owner.trim(), `${where}: a decided decision names its owner`);
  }
  for (const s of Array.isArray(p.roadmap) ? p.roadmap : []) {
    need(typeof s.stage === 'string' && s.stage.trim(), 'every roadmap stage needs a name');
    need(
      typeof s.entry === 'string' && s.entry.trim(),
      `stage "${s.stage}": entry criteria are required (not a date)`,
    );
    for (const id of Array.isArray(s.nodes) ? s.nodes : [])
      need(nodeIds.has(id), `stage "${s.stage}": unknown node "${id}"`);
  }
  return { errors, warnings };
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Renders the proposal to one self-contained HTML string. Assumes checkProposal passed. */
export function renderProposal(p: Proposal, { date = '' } = {}) {
  const { warnings } = checkProposal(p);
  const edges = Array.isArray(p.edges) ? p.edges : [];
  const evidence = (item: ProposalItem & { lane?: string }) => {
    const ev = Array.isArray(item.evidence) ? item.evidence : [];
    if (!ev.length)
      return item.status === 'proposed' ? '<p class="unsupported">Unsupported: no linked fact</p>' : '';
    return `<ul class="ev">${ev.map((e) => `<li>${e.report ? `<b>${esc(e.report)}</b> · ` : ''}${esc(e.ref)}</li>`).join('')}</ul>`;
  };
  const node = (n: ProposalNode) => {
    const out = edges.filter((e) => e.from === n.id);
    return `<article class="node s-${esc(n.status)}" id="n-${esc(n.id)}" data-id="${esc(n.id)}" tabindex="0">
<span class="tag">${icon(`status-${n.status}`, `s-${n.status}`)}${esc(n.status)}</span><h3>${esc(n.label)}</h3>${n.detail ? `<p>${esc(n.detail)}</p>` : ''}${n.replaces ? `<p class="muted">Changes: ${esc(n.replaces)}</p>` : ''}
<details><summary>Evidence${out.length ? ` · ${out.length} link${out.length > 1 ? 's' : ''}` : ''}</summary>${evidence(n)}${out
      .map(
        (e) =>
          `<p class="edge-line s-${esc(e.status)}">→ <b>${esc(e.to)}</b> · ${esc(e.meaning)} · <span class="tag">${esc(e.status)}</span></p>${evidence(e)}`,
      )
      .join('')}</details></article>`;
  };
  const lanes = p.lanes
    .map((l) => {
      const ns = p.nodes.filter((n) => n.lane === l.id);
      return `<section class="lane"><header><h2>${esc(l.label ?? l.id)}</h2>${l.note ? `<p class="muted">${esc(l.note)}</p>` : ''}</header><div class="row">${ns.map(node).join('')}</div></section>`;
    })
    .join('');
  const decisions = (p.decisions ?? []).length
    ? `<section class="block"><h2>Decisions</h2><div class="table"><table><thead><tr><th>Question</th><th>Options</th><th>Recommendation</th><th>Owner</th><th>Status</th><th>Record</th></tr></thead><tbody>${(
        p.decisions ?? []
      )
        .map(
          (d) =>
            `<tr><td>${esc(d.question)}</td><td>${(d.options ?? []).map(esc).join('<br>')}</td><td>${esc(d.recommendation)}</td><td>${esc(d.owner)}</td><td><span class="tag d-${esc(d.status)}">${esc(d.status)}</span></td><td>${d.record ? `<code>${esc(d.record)}</code>` : ''}</td></tr>`,
        )
        .join('')}</tbody></table></div></section>`
    : '';
  const roadmap = (p.roadmap ?? []).length
    ? `<section class="block"><h2>Roadmap</h2><ol class="stages">${(p.roadmap ?? [])
        .map(
          (s) =>
            `<li><b>${esc(s.stage)}</b><p><span class="muted">Starts when:</span> ${esc(s.entry)}</p>${(s.nodes ?? []).length ? `<p class="muted">${(s.nodes ?? []).map((id) => `<a href="#n-${esc(id)}">${esc(id)}</a>`).join(' · ')}</p>` : ''}</li>`,
        )
        .join('')}</ol></section>`
    : '';
  const counts = Object.fromEntries(
    ['observed', 'inferred', 'proposed', 'not-checked'].map((s) => [
      s,
      p.nodes.filter((n) => n.status === s).length,
    ]),
  );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${esc(p.title)}</title><style>
:root{color-scheme:light dark;--bg:#f4f6f8;--card:#fff;--ink:#182638;--muted:#526277;--line:#c7d0da;--accent:#1756a3;--obs:#2f7d4f;--inf:#8a6a14;--pro:#1756a3;--nc:#7a8591;--bad:#a1332b;--shadow-1:0 1px 2px -1px rgb(0 0 0/.08),0 4px 12px -4px rgb(0 0 0/.1)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#101720;--card:#1c2739;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--obs:#7fd49c;--inf:#e4c068;--pro:#8cbfff;--nc:#98a4b0;--bad:#ff9b8f;--shadow-1:inset 0 1px 0 rgb(255 255 255/.06),0 8px 24px -12px #000}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:24px 16px 64px}
h1{font-size:clamp(24px,4vw,36px);letter-spacing:-.03em;margin:4px 0}h2{font-size:18px;margin:0}h3{font-size:15px;margin:6px 0 4px}p{margin:4px 0}.muted{color:var(--muted);font-size:13px}.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:700;color:var(--muted)}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.summary span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 12px;font-size:13px}
.warn{border:1px solid var(--bad);color:var(--bad);border-radius:10px;padding:10px 14px;margin:12px 0}.warn ul{margin:6px 0;padding-left:18px}
.lane{border-top:2px solid var(--ink);padding:12px 0 18px}.lane header{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:10px}
.node{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;min-width:0;min-height:96px;display:flex;flex-direction:column;box-shadow:var(--shadow-1);overflow-wrap:anywhere}.node:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.s-observed{border-left-color:var(--obs)}.s-inferred{border-left-color:var(--inf);border-left-style:dashed}.s-proposed{border-left-color:var(--pro);border-left-style:double;border-left-width:6px}.s-not-checked{border-left-color:var(--nc);border-left-style:dotted}
.tag{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:3px 10px 3px 8px;display:inline-flex;align-items:center;gap:5px}.node.hl{outline:2px solid var(--accent)}
details summary{cursor:pointer;color:var(--accent);font-size:13px;padding-top:6px}.ev{margin:4px 0;padding-left:16px;font-size:12px}.edge-line{font-size:13px;margin-top:8px}.unsupported{color:var(--bad);font-size:12px;font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:12px;color:var(--muted)}.legend span{display:inline-flex;align-items:center;gap:6px}
.icon{width:1.05em;height:1.05em;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round;vertical-align:-.18em;flex-shrink:0}
.icon.s-observed{color:var(--obs)}.icon.s-inferred{color:var(--inf)}.icon.s-proposed{color:var(--pro)}.icon.s-not-checked{color:var(--nc)}
.node-map{position:relative;border-radius:14px;background-image:radial-gradient(circle,color-mix(in srgb,var(--ink) 22%,transparent) 1px,transparent 1px);background-size:16px 16px}
.edge-layer{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.edge-layer path{fill:none;stroke:var(--nc);stroke-width:2;opacity:.75;transition:stroke .15s,stroke-width .15s,opacity .15s}
.edge-layer path.s-observed{stroke:var(--obs)}.edge-layer path.s-inferred{stroke:var(--inf);stroke-dasharray:2 4}.edge-layer path.s-proposed{stroke:var(--pro);stroke-dasharray:6 4}
.edge-layer path.s-replaces{stroke:var(--accent);stroke-width:2.6;stroke-dasharray:1 6;opacity:.9}
.edge-layer path.active{stroke:var(--accent);stroke-width:3;opacity:1}.edge-layer path.dimmed{opacity:.12}
.block{margin-top:26px}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.stages{padding-left:20px}.stages li{margin:8px 0}
code{font:12px ui-monospace,monospace}a{color:var(--accent)}
@media print{.node{break-inside:avoid}details{display:block}.node-map{background-image:none}.edge-layer{display:none}}
</style></head><body>${ICON_SPRITE}<main>
<h1>${esc(p.title)}</h1>${date ? `<p class="muted">${esc(date)}</p>` : ''}${p.scope ? `<p class="muted">${esc(p.scope)}</p>` : ''}
<div class="summary"><span>${counts.observed} observed</span><span>${counts.inferred} inferred</span><span>${counts.proposed} proposed</span><span>${counts['not-checked']} not checked</span><span>${edges.length} links</span></div>
<div class="legend"><span>${icon('status-observed', 's-observed')}observed — seen in source or a rendered check</span><span>${icon('status-inferred', 's-inferred')}inferred — reasoned from cited evidence</span><span>${icon('status-proposed', 's-proposed')}proposed — a change, not current architecture</span><span>${icon('status-not-checked', 's-not-checked')}not checked — no result, never a pass</span></div>
${warnings.length ? `<div class="warn" role="note"><b>${warnings.length} claim${warnings.length > 1 ? 's' : ''} without a linked fact</b><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
<div class="node-map" id="pmap"><svg class="edge-layer" id="pmap-edges" aria-hidden="true"></svg><div class="architecture-lanes">${lanes}</div></div>${decisions}${roadmap}
<p class="muted" style="margin-top:28px">Rendered by the ds-loop skill from an agent-authored proposal. Every box carries its basis; the engine did not produce these judgements. Connector lines repeat the "→ … · meaning" list already in each box's evidence — read either.</p>
</main><script>
const edges=${JSON.stringify([
    ...edges.map((e) => [e.from, e.to, e.status]),
    ...p.nodes.filter((n) => n.replaces).map((n) => [n.replaces, n.id, 'replaces']),
  ]).replace(/</g, '\\u003c')};
const pmap=document.getElementById('pmap'), edgeLayer=document.getElementById('pmap-edges');
function port(rect,mapRect,side){
  const x=side==='left'?rect.left-mapRect.left:side==='right'?rect.right-mapRect.left:(rect.left+rect.right)/2-mapRect.left;
  const y=side==='top'?rect.top-mapRect.top:side==='bottom'?rect.bottom-mapRect.top:(rect.top+rect.bottom)/2-mapRect.top;
  return {x,y};
}
function layout(){
  if(!pmap||!edgeLayer) return;
  const mapRect=pmap.getBoundingClientRect();
  edgeLayer.setAttribute('viewBox','0 0 '+mapRect.width+' '+mapRect.height);
  const defs='<defs><marker id="pmap-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="var(--accent)"/></marker></defs>';
  edgeLayer.innerHTML=defs+edges.map(([from,to,status])=>{
    const a=document.getElementById('n-'+from), b=document.getElementById('n-'+to);
    if(!a||!b) return '';
    const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
    const stacked=Math.min(ar.right,br.right)>Math.max(ar.left,br.left);
    let p1,p2;
    if(stacked){
      const aFirst=ar.top<br.top;
      p1=port(aFirst?ar:br,mapRect,'bottom'); p2=port(aFirst?br:ar,mapRect,'top');
    } else {
      const aFirst=ar.left<br.left;
      const leftRect=aFirst?ar:br, rightRect=aFirst?br:ar;
      const leftLane=(aFirst?a:b).closest('.lane'), rightLane=(aFirst?b:a).closest('.lane');
      const crossLane=leftLane&&rightLane&&leftLane!==rightLane;
      const leftX=crossLane?leftLane.getBoundingClientRect().right:leftRect.right;
      const rightX=crossLane?rightLane.getBoundingClientRect().left:rightRect.left;
      p1={x:leftX-mapRect.left,y:(leftRect.top+leftRect.bottom)/2-mapRect.top};
      p2={x:rightX-mapRect.left,y:(rightRect.top+rightRect.bottom)/2-mapRect.top};
    }
    const midX=(p1.x+p2.x)/2, midY=(p1.y+p2.y)/2;
    const d=stacked
      ? 'M '+p1.x+' '+p1.y+' C '+p1.x+' '+midY+', '+p2.x+' '+midY+', '+p2.x+' '+p2.y
      : 'M '+p1.x+' '+p1.y+' C '+midX+' '+p1.y+', '+midX+' '+p2.y+', '+p2.x+' '+p2.y;
    const arrow=status==='replaces'&&!stacked?' marker-end="url(#pmap-arrow)"':'';
    return '<path data-a="'+from+'" data-b="'+to+'" class="s-'+status+'" d="'+d+'"'+arrow+'/>';
  }).join('');
}
layout();
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(layout,120);});
for(const n of document.querySelectorAll('.node')){
  const on=v=>{
    const id=n.dataset.id;
    const related=new Set([id]);
    for(const [a,b] of edges) if(a===id||b===id){related.add(a);related.add(b);}
    for(const t of document.querySelectorAll('.node')) t.classList.toggle('hl',v&&related.has(t.dataset.id));
    for(const path of edgeLayer.querySelectorAll('path')){
      const hit=path.dataset.a===id||path.dataset.b===id;
      path.classList.toggle('active',v&&hit);
      path.classList.toggle('dimmed',v&&!hit);
    }
  };
  n.addEventListener('mouseenter',()=>on(true));
  n.addEventListener('mouseleave',()=>on(false));
  n.addEventListener('focus',()=>on(true));
  n.addEventListener('blur',()=>on(false));
}
</script></body></html>
`;
}
