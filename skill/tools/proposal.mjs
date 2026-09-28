#!/usr/bin/env node
// Proposal / decision visual for the ds-loop skill (report #4).
//
// The agent writes a proposal as JSON; this script checks it and renders one
// self-contained HTML page. It is deterministic and makes no model or network
// call. Judgement lives in the JSON; this file only enforces that every box and
// line says what it rests on:
//
//   observed     — seen in source or a rendered check; must cite evidence
//   inferred     — reasoned from evidence; must cite what it was inferred from
//   proposed     — a change; without evidence it renders as "unsupported"
//   not-checked  — no result, never a pass
//
// Usage:
//   node proposal.mjs check  <proposal.json>
//   node proposal.mjs render <proposal.json> --html <out.html> [--date YYYY-MM-DD]

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['observed', 'inferred', 'proposed', 'not-checked'];
const DECISION_STATUSES = ['proposed', 'decided', 'rejected', 'deferred'];

/** Returns { errors, warnings }. Errors make the proposal unusable; warnings render visibly. */
export function checkProposal(p) {
  const errors = [];
  const warnings = [];
  const need = (cond, msg) => {
    if (!cond) errors.push(msg);
  };
  need(p && typeof p === 'object', 'proposal must be a JSON object');
  if (errors.length) return { errors, warnings };
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
  const cites = (item, where) => {
    const ev = Array.isArray(item.evidence) ? item.evidence : [];
    for (const e of ev)
      need(typeof e?.ref === 'string' && e.ref.trim(), `${where}: every evidence entry needs a ref`);
    return ev.length > 0;
  };
  // A proposed box must rest on a fact or be shown as unsupported; a proposed
  // link is a proposal by nature and needs only its meaning.
  const statusRule = (item, where, isNode) => {
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

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Renders the proposal to one self-contained HTML string. Assumes checkProposal passed. */
export function renderProposal(p, { date = '' } = {}) {
  const { warnings } = checkProposal(p);
  const edges = Array.isArray(p.edges) ? p.edges : [];
  const evidence = (item) => {
    const ev = Array.isArray(item.evidence) ? item.evidence : [];
    if (!ev.length)
      return item.status === 'proposed' && item.lane !== undefined
        ? '<p class="unsupported">Unsupported: no linked fact</p>'
        : '';
    return `<ul class="ev">${ev.map((e) => `<li>${e.report ? `<b>${esc(e.report)}</b> · ` : ''}${esc(e.ref)}</li>`).join('')}</ul>`;
  };
  const node = (n) => {
    const out = edges.filter((e) => e.from === n.id);
    return `<article class="node s-${esc(n.status)}" id="n-${esc(n.id)}" data-id="${esc(n.id)}" tabindex="0">
<span class="tag">${esc(n.status)}</span><h3>${esc(n.label)}</h3>${n.detail ? `<p>${esc(n.detail)}</p>` : ''}${n.replaces ? `<p class="muted">Changes: ${esc(n.replaces)}</p>` : ''}
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
    ? `<section class="block"><h2>Decisions</h2><div class="table"><table><thead><tr><th>Question</th><th>Options</th><th>Recommendation</th><th>Owner</th><th>Status</th><th>Record</th></tr></thead><tbody>${p.decisions
        .map(
          (d) =>
            `<tr><td>${esc(d.question)}</td><td>${(d.options ?? []).map(esc).join('<br>')}</td><td>${esc(d.recommendation)}</td><td>${esc(d.owner)}</td><td><span class="tag d-${esc(d.status)}">${esc(d.status)}</span></td><td>${d.record ? `<code>${esc(d.record)}</code>` : ''}</td></tr>`,
        )
        .join('')}</tbody></table></div></section>`
    : '';
  const roadmap = (p.roadmap ?? []).length
    ? `<section class="block"><h2>Roadmap</h2><ol class="stages">${p.roadmap
        .map(
          (s) =>
            `<li><b>${esc(s.stage)}</b><p><span class="muted">Starts when:</span> ${esc(s.entry)}</p>${(s.nodes ?? []).length ? `<p class="muted">${s.nodes.map((id) => `<a href="#n-${esc(id)}">${esc(id)}</a>`).join(' · ')}</p>` : ''}</li>`,
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
:root{color-scheme:light dark;--bg:#f4f6f8;--card:#fff;--ink:#182638;--muted:#526277;--line:#c7d0da;--accent:#1756a3;--obs:#2f7d4f;--inf:#8a6a14;--pro:#1756a3;--nc:#7a8591;--bad:#a1332b}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#101720;--card:#182331;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--obs:#7fd49c;--inf:#e4c068;--pro:#8cbfff;--nc:#98a4b0;--bad:#ff9b8f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:24px 16px 64px}
h1{font-size:clamp(24px,4vw,36px);letter-spacing:-.03em;margin:4px 0}h2{font-size:18px;margin:0}h3{font-size:15px;margin:6px 0 4px}p{margin:4px 0}.muted{color:var(--muted);font-size:13px}.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:700;color:var(--muted)}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.summary span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 12px;font-size:13px}
.warn{border:1px solid var(--bad);color:var(--bad);border-radius:10px;padding:10px 14px;margin:12px 0}.warn ul{margin:6px 0;padding-left:18px}
.lane{border-top:2px solid var(--ink);padding:12px 0 18px}.lane header{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}.row{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:10px}
.node{background:var(--card);border:1px solid var(--line);border-left-width:5px;border-radius:8px;padding:10px 12px;min-width:0;overflow-wrap:anywhere}.node:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.s-observed{border-left-color:var(--obs)}.s-inferred{border-left-color:var(--inf);border-left-style:dashed}.s-proposed{border-left-color:var(--pro);border-left-style:double;border-left-width:6px}.s-not-checked{border-left-color:var(--nc);border-left-style:dotted}
.tag{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.node.hl{outline:2px solid var(--accent)}
details summary{cursor:pointer;color:var(--accent);font-size:13px;padding-top:6px}.ev{margin:4px 0;padding-left:16px;font-size:12px}.edge-line{font-size:13px;margin-top:8px}.unsupported{color:var(--bad);font-size:12px;font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:12px;color:var(--muted)}.legend i{display:inline-block;width:18px;height:12px;border:1px solid var(--line);border-left-width:5px;margin-right:6px;vertical-align:middle}
.block{margin-top:26px}.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}.stages{padding-left:20px}.stages li{margin:8px 0}
code{font:12px ui-monospace,monospace}a{color:var(--accent)}@media print{.node{break-inside:avoid}details{display:block}}
</style></head><body><main>
<p class="kicker">Proposal${date ? ` · ${esc(date)}` : ''}</p><h1>${esc(p.title)}</h1>${p.scope ? `<p class="muted">${esc(p.scope)}</p>` : ''}
<div class="summary"><span>${counts.observed} observed</span><span>${counts.inferred} inferred</span><span>${counts.proposed} proposed</span><span>${counts['not-checked']} not checked</span><span>${edges.length} links</span></div>
<div class="legend"><span><i class="s-observed"></i>observed — seen in source or a rendered check</span><span><i class="s-inferred"></i>inferred — reasoned from cited evidence</span><span><i class="s-proposed"></i>proposed — a change, not current architecture</span><span><i class="s-not-checked"></i>not checked — no result, never a pass</span></div>
${warnings.length ? `<div class="warn" role="note"><b>${warnings.length} claim${warnings.length > 1 ? 's' : ''} without a linked fact</b><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
${lanes}${decisions}${roadmap}
<p class="muted" style="margin-top:28px">Rendered by the ds-loop skill from an agent-authored proposal. Every box carries its basis; the engine did not produce these judgements.</p>
</main><script>
const edges=${JSON.stringify(edges.map((e) => [e.from, e.to])).replace(/</g, '\\u003c')};
for(const n of document.querySelectorAll('.node')){const on=v=>{const id=n.dataset.id;for(const [a,b] of edges){if(a===id||b===id){for(const t of [a,b]){const el=document.getElementById('n-'+t);if(el)el.classList.toggle('hl',v);}}}};n.addEventListener('mouseenter',()=>on(true));n.addEventListener('mouseleave',()=>on(false));n.addEventListener('focus',()=>on(true));n.addEventListener('blur',()=>on(false));}
</script></body></html>
`;
}

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (!['check', 'render'].includes(cmd) || !file) {
    console.error(
      'usage: proposal.mjs check <proposal.json> | render <proposal.json> --html <out.html> [--date YYYY-MM-DD]',
    );
    return 2;
  }
  let p;
  try {
    p = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`proposal: cannot read ${file}: ${e.message}`);
    return 2;
  }
  const { errors, warnings } = checkProposal(p);
  for (const e of errors) console.error(`error: ${e}`);
  for (const w of warnings) console.error(`warning: ${w}`);
  if (errors.length) return 1;
  if (cmd === 'check') {
    console.log(
      `proposal ok — ${p.nodes.length} nodes, ${(p.edges ?? []).length} links, ${warnings.length} unsupported`,
    );
    return 0;
  }
  const i = rest.indexOf('--html');
  const out = i >= 0 ? rest[i + 1] : undefined;
  if (!out) {
    console.error('render needs --html <out.html>');
    return 2;
  }
  const d = rest.indexOf('--date');
  writeFileSync(out, renderProposal(p, { date: d >= 0 ? rest[d + 1] : '' }));
  console.log(`wrote ${out}`);
  return 0;
}

const self = realpathSync(fileURLToPath(import.meta.url));
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === self)
  process.exitCode = main(process.argv.slice(2));
