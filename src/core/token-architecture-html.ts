import type { TokenArchitecture } from './token-architecture.ts';
const escapeHtml = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const lanes = ['upstream', 'primitive', 'semantic', 'component', 'use sites', 'unknown'];
export function architectureHtml(a?: TokenArchitecture): string {
  if (!a)
    return '<section id="tokens"><h2>Token architecture</h2><p>No token architecture recorded for this audit.</p></section>';
  return `<section id="tokens"><p class="kicker">Observed token architecture</p><h2>Layers and the references between them</h2><p>${a.tokens.length} declared names · ${a.tokens.reduce((n, t) => n + t.declarations.length, 0)} declarations · ${a.references.length} var() references. Layers use configured naming patterns. Lane order is not a reference edge.</p>
  <div class="token-lanes">${lanes
    .map((lane) => {
      const groups = a.groups.filter((g) => g.lane === lane);
      return `<article class="card"><h3>${lane === 'unknown' ? 'Unclassified' : escape(lane)}</h3><strong class="metric">${groups.reduce((n, g) => n + (lane === 'use sites' ? g.references : g.tokens), 0)}</strong><small> ${lane === 'use sites' ? 'var() reference occurrences' : 'distinct declared names'}</small>${groups
        .slice(0, 8)
        .map(
          (g) =>
            `<p><code>${escapeHtml(g.label)}</code><br>${g.lane === 'use sites' ? `${g.references} references` : `${g.tokens} names / ${g.declarations} declarations`}</p>`,
        )
        .join(
          '',
        )}${groups.length > 8 ? `<p>+${groups.length - 8} groups in the group browser</p>` : ''}</article>`;
    })
    .join('')}</div>
  <details class="group"><summary>All namespace groups · ${a.groups.length}</summary><div id="token-groups"></div></details>
  <h3>Reference flow</h3><p>Consumer → referenced group. Weight = observed var() occurrences, including fallbacks. Highlight = at least one recorded tier finding; it does not mark every occurrence as a violation.</p><div id="token-edges"></div>
  <h3>Health observations</h3><div class="token-health">${Object.entries(a.health)
    .map(
      ([key, names]) =>
        `<details class="card"><summary>${escapeHtml(({ unreferenced: 'Declared, no reference observed', undeclared: 'Referenced, no declaration observed', semanticLiterals: 'Semantic tokens holding literals', deepAliases: `Alias chains deeper than ${a.maxAliasDepth}`, cycles: 'Tokens in alias cycles', redeclarations: 'Mode redeclarations' } as Record<string, string>)[key])} · ${names.length}</summary><div data-token-health="${key}"></div></details>`,
    )
    .join('')}</div>
  <h3>Find a token</h3><label for="token-search">Token name (case-sensitive names, case-insensitive search)</label><input id="token-search" type="search" placeholder="Search declared or referenced token names"><div id="token-results"></div><div id="token-detail" class="card" tabindex="-1" aria-live="polite"><p>Select a token to inspect its declarations and follow references in either direction.</p></div>
  <details class="group"><summary>Scope and interpretation limits</summary><ul>${a.limits.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></details><p class="print-note">Print shows the aggregate lanes. Open the HTML for complete searchable and paginated evidence.</p></section>`;
}
export const TOKEN_CSS = `
.token-lanes{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.token-lanes .card{padding:12px}.token-lanes h3{text-transform:capitalize;font-size:14px}.token-lanes p{font-size:11px;overflow-wrap:anywhere}.token-lanes small{display:block}.token-health{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.token-row{border-bottom:1px solid var(--line);padding:10px 0;overflow-wrap:anywhere}.token-row a{margin-right:12px}.token-row.flagged{border-left:4px solid var(--warn);padding-left:10px}.token-weight{display:block;height:5px;background:var(--accent);margin-top:6px;max-width:100%}.token-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#token-detail{margin-top:16px;scroll-margin:20px}#token-detail code{overflow-wrap:anywhere}#token-detail h4{margin-bottom:4px}
@media(max-width:900px){.token-lanes{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:500px){.token-lanes,.token-health{grid-template-columns:1fr}}@media print{.token-lanes{grid-template-columns:repeat(3,minmax(0,1fr))}.token-health{display:block}.token-weight{print-color-adjust:exact}}
`;
export const TOKEN_SCRIPT = String.raw`
(() => {
 const a = payload.report.tokenArchitecture;
 if (!a) return;
 const tokens = new Map(a.tokens.map(t => [t.name, t]));
 const groups = new Map(a.groups.map(g => [g.id, g]));
 const outgoing = new Map(), incoming = new Map();
 for (const r of a.references) {
   if (r.from !== null) { const out = outgoing.get(r.from) || []; out.push(r); outgoing.set(r.from, out); }
   const into = incoming.get(r.to) || []; into.push(r); incoming.set(r.to, into);
 }
 const page = (host, rows, draw) => {
   host.replaceChildren(); let offset = 0;
   const status = el('p'), body = el('div'), controls = el('div'); controls.className = 'token-actions';
   const previous = el('button', 'Previous'), next = el('button', 'Next'); previous.type = next.type = 'button';
   controls.append(previous, next); host.append(status, body, controls);
   const render = () => { status.textContent = rows.length ? (offset+1) + '–' + Math.min(offset+30, rows.length) + ' of ' + rows.length : 'None observed in scope'; body.replaceChildren(...rows.slice(offset, offset+30).map(draw)); previous.disabled = offset === 0; next.disabled = offset+30 >= rows.length; };
   previous.addEventListener('click', () => { offset = Math.max(0,offset-30); render(); }); next.addEventListener('click', () => { offset += 30; render(); }); render();
 };
 const tokenButton = (name) => { const b = el('button',name); b.type='button'; b.addEventListener('click', () => select(name)); return b; };
 const chain = (name, direction) => {
   const seen = new Set([name]), queue = [name], rows = [];
   for (let i=0; i<queue.length; i++) for (const r of (direction === 'up' ? outgoing : incoming).get(queue[i]) || []) {
     rows.push(r); const next = direction === 'up' ? r.to : r.from;
     if (next !== null && !seen.has(next)) { seen.add(next); queue.push(next); }
   }
   return rows;
 };
 const referenceRow = (r) => {
   const row=el('div'); row.className='token-row';
   if (r.from) row.append(tokenButton(r.from)); else row.append(el('strong', 'Use site: '+r.property));
   row.append(el('span', ' → '), tokenButton(r.to), el('p', r.file+':'+r.line)); return row;
 };
 function select(name) {
   const host=document.getElementById('token-detail');host.replaceChildren(el('h3',name));
   const t=tokens.get(name);
   host.append(el('p',t ? 'Layer: '+(t.tier==='unknown'?'unclassified':t.tier)+' · alias depth: '+(t.aliasDepth===null?'unresolved (cycle or chain into cycle)':t.aliasDepth)+(t.cycle?' · alias cycle':'') : 'No declaration observed in this scope. This does not prove the token is absent at runtime.'));
   if(t){const declarations=el('div');host.append(el('h4','Declarations and modes'),el('p','Order not resolved across files. Same-file positions do not establish a computed winner.'),declarations);
     page(declarations,t.declarations,d=>{const row=el('div');row.className='token-row';row.append(el('code',d.value),el('p',d.file+':'+d.line+' · '+(d.selector??'selector not recorded')),el('small',(d.mode?'Mode selector · ':'')+(d.sourceOrder===null?'order not resolved':'within-file source position '+(d.sourceOrder+1))));return row;});}
   for(const [direction,title] of [['up','References followed toward dependencies'],['down','Consumers followed toward use sites']]) {const details=el('details'),summary=el('summary',title),body=el('div');details.append(summary,body);host.append(details);let loaded=false;details.addEventListener('toggle',()=>{if(details.open&&!loaded){loaded=true;page(body,chain(name,direction),referenceRow);}});}
   host.scrollIntoView({block:'nearest'});host.focus({preventScroll:true});
 }
 page(document.getElementById('token-groups'),a.groups,g=>{const row=el('div');row.className='token-row';row.append(el('strong',g.lane+' · '+g.label),el('p',g.lane === 'use sites' ? g.references+' references' : g.tokens+' names / '+g.declarations+' declarations'));return row;});
 const edges=[...a.edges].sort((a,b)=>b.count-a.count||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
 const max=Math.max(1,...edges.map(e=>e.count));
 page(document.getElementById('token-edges'),edges,e=>{const row=el('div');row.className='token-row'+(e.findings.length?' flagged':'');row.append(el('strong',(groups.get(e.from)?.label??e.from)+' → '+(groups.get(e.to)?.label??e.to)+' · '+e.count+' references'));
   for(const i of e.findings){const link=el('a',payload.report.findings[i].ruleId);link.href='#findings';link.addEventListener('click',()=>{const detail=document.getElementById('token-edge-finding');if(detail)detail.remove();const box=el('article');box.id='token-edge-finding';box.className='card';const f=payload.report.findings[i];box.append(el('h3',f.ruleId),el('p',f.summary),el('p',f.where));document.getElementById('findings').prepend(box);});row.append(link);}
   const weight=el('i');weight.className='token-weight';weight.style.width=(e.count/max*100)+'%';row.append(weight);
   const details=el('details'),summary=el('summary','Source references'),body=el('div');details.append(summary,body);let loaded=false;details.addEventListener('toggle',()=>{if(details.open&&!loaded){loaded=true;page(body,a.references.filter(r=>r.fromGroup===e.from&&r.toGroup===e.to),referenceRow);}});row.append(details);return row;});
 for(const host of document.querySelectorAll('[data-token-health]')){let loaded=false;host.parentElement.addEventListener('toggle',()=>{if(host.parentElement.open&&!loaded){loaded=true;page(host,a.health[host.dataset.tokenHealth],tokenButton);}});}
 const search=document.getElementById('token-search');const names=[...new Set([...tokens.keys(),...a.health.undeclared])];
 const searchResults=()=>page(document.getElementById('token-results'),names.filter(name=>name.toLowerCase().includes(search.value.toLowerCase())),tokenButton);
 search.addEventListener('input',searchResults);searchResults();
})();
`;
