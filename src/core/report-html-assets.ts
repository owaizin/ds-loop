/** Browser code is inline and uses textContent for all engine data. No runtime imports. */
export const REPORT_SCRIPT = String.raw`
const payload = JSON.parse(document.getElementById('audit-data').textContent);
const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = String(text); return n; };
const pageSize = 30; // presentation page size, not an analysis threshold
function inspect(value) {
  if (value === null || typeof value !== 'object') {
    const n=el('span');
    const color=payload.swatches[String(value)];
    if(color) { const s=el('span'); s.className='swatch'; s.setAttribute('aria-hidden','true'); s.style.backgroundColor=color; n.append(s); }
    n.append(el('code',value===null?'null':value)); return n;
  }
  const entries = Object.entries(value), d = el('details');
  d.append(el('summary', (Array.isArray(value) ? 'Items' : 'Fields') + ' · ' + entries.length));
  d.addEventListener('toggle', () => {
    if (!d.open || d.dataset.loaded) return;
    d.dataset.loaded = 'true';
    const list = el('div'), controls = el('div'), status = el('span'); status.setAttribute('aria-live','polite');
    let page = 0;
    const previous = el('button','Previous'), next = el('button','Next');
    function draw() {
      list.replaceChildren();
      for (const [key, v] of entries.slice(page * pageSize, (page + 1) * pageSize)) {
        const row = el('div'); row.className = 'datum'; row.append(el('strong', key), inspect(v)); list.append(row);
      }
      status.textContent = entries.length ? (page * pageSize + 1) + '–' + Math.min((page+1)*pageSize, entries.length) + ' of ' + entries.length : 'No items';
      previous.disabled = page === 0; next.disabled = (page + 1) * pageSize >= entries.length;
    }
    previous.onclick = () => { page--; draw(); }; next.onclick = () => { page++; draw(); };
    controls.className='pagination'; controls.append(previous,status,next); d.append(list,controls); draw();
  });
  return d;
}
function suggestionRows(host, values) {
  let page=0;
  const wrapper=el('div'), table=el('table'), head=el('thead'), body=el('tbody'), header=el('tr');
  wrapper.className='table-wrap'; wrapper.tabIndex=0; wrapper.setAttribute('role','region'); wrapper.setAttribute('aria-label','Token suggestions'); table.className='suggestions';
  for(const text of ['Value','Property / category','Match','Candidates','Delta']) header.append(el('th',text));
  head.append(header); table.append(head,body); wrapper.append(table);
  const previous=el('button','Previous'), next=el('button','Next'), status=el('span'), controls=el('div');
  controls.className='pagination'; status.setAttribute('aria-live','polite');
  function draw() {
    body.replaceChildren();
    for(const s of values.slice(page*pageSize,(page+1)*pageSize)) {
      const row=el('tr'), value=el('td'), property=el('td'), candidates=el('td'), delta=el('td');
      value.append(inspect(s.value),el('small',s.file+':'+s.line));
      property.append(el('span',s.property),el('small',s.category || 'unknown'));
      const ranked=[...s.candidates].sort((a,b)=>Number(b.match==='exact')-Number(a.match==='exact') || Number(b.preferred || b.aliasChain.length>1)-Number(a.preferred || a.aliasChain.length>1) || a.distance-b.distance || a.token.localeCompare(b.token) || JSON.stringify(a.declarations).localeCompare(JSON.stringify(b.declarations)));
      const label=c=>c.token+(c.categoryMatch==='unknown'?' · category unknown':'')+(c.preferred?' · preferred':'');
      for(const c of ranked.slice(0,3)) {
        candidates.append(el('div',label(c)));
        delta.append(el('div',c.token+': '+Number(c.distance.toFixed(4))+' '+c.metric));
      }
      if(ranked.length>3) {
        const more=el('details'); more.append(el('summary','+'+(ranked.length-3)+' more'));
        more.addEventListener('toggle',()=>{
          if(!more.open || more.dataset.loaded) return; more.dataset.loaded='true';
          for(const c of ranked.slice(3)) more.append(el('div',label(c)+' · '+Number(c.distance.toFixed(4))+' '+c.metric));
        }); candidates.append(more);
      }
      if(!s.candidates.length) { candidates.textContent='—';delta.textContent='—'; }
      row.append(value,property,el('td',s.status==='no-token'?'none':s.status),candidates,delta);body.append(row);
    }
    status.textContent=values.length ? (page*pageSize+1)+'–'+Math.min((page+1)*pageSize,values.length)+' of '+values.length+' suggestions' : 'No suggestions';
    previous.disabled=page===0;next.disabled=(page+1)*pageSize>=values.length;
  }
  previous.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};
  controls.append(previous,status,next);host.append(wrapper,controls);draw();
}
for(const host of document.querySelectorAll('[data-suggestions]')) {
  host.parentElement.addEventListener('toggle',()=>{
    if(!host.parentElement.open || host.dataset.loaded) return;
    host.dataset.loaded='true';suggestionRows(host,payload.report.findings[Number(host.dataset.suggestions)].suggestion.values);
  });
}
for (const host of document.querySelectorAll('[data-inspect]')) {
  const path = JSON.parse(host.dataset.inspect);
  let value = payload; for (const key of path) value = value[key];
  host.append(inspect(value));
}
for (const host of document.querySelectorAll('[data-group]')) {
  host.parentElement.addEventListener('toggle', () => {
  if (!host.parentElement.open || host.dataset.loaded) return;
  host.dataset.loaded='true';
  const indices = payload.groups[Number(host.dataset.group)].indices;
  const search = el('input'); search.type='search'; search.placeholder='Search this group'; search.setAttribute('aria-label','Search findings in this rule group');
  const list=el('div'), status=el('p'), controls=el('div'), prev=el('button','Previous'), next=el('button','Next');
  status.setAttribute('aria-live','polite'); controls.className='pagination';
  let page=0, matches=indices;
  const searchable=indices.map(i => JSON.stringify(payload.report.findings[i]).toLowerCase());
  function draw() {
    list.replaceChildren();
    for (const i of matches.slice(page*pageSize,(page+1)*pageSize)) {
      const f=payload.report.findings[i], article=el('article'); article.className='finding';
      const meta=el('div',f.severity+' · '+f.ruleId+' · '+(typeof f.data?.count==='number'?f.data.count+' reported occurrences':'1 finding'));
      meta.className='finding-meta'; const heading=el('h4',f.summary);heading.className='one-line';heading.title=f.summary;
      const detail=el('details');detail.append(el('summary','Details'));
      detail.addEventListener('toggle',()=>{
        if(!detail.open || detail.dataset.loaded) return; detail.dataset.loaded='true';
        detail.append(el('p',f.summary),el('p','where: '+f.where));
        if(f.impact) detail.append(el('p','risk: '+f.impact));
        detail.append(el('p','fix: '+f.fix));
        if(f.suggestion) { suggestionRows(detail,f.suggestion.values);detail.append(el('p',f.suggestion.basis)); }
        detail.append(inspect(f));
      });
      const places=el('p',(payload.locations?.[i] || []).join(' · ') || 'See recorded location in Details'); places.className='locations';
      article.append(meta,heading,places,detail);list.append(article);
    }
    status.textContent=matches.length ? (page*pageSize+1)+'–'+Math.min((page+1)*pageSize,matches.length)+' of '+matches.length+' findings' : 'No matching findings';
    prev.disabled=page===0; next.disabled=(page+1)*pageSize>=matches.length;
  }
  prev.onclick=()=>{page--;draw();}; next.onclick=()=>{page++;draw();};
  search.oninput=()=>{const q=search.value.toLowerCase(); matches=indices.filter((_,j)=>searchable[j].includes(q));page=0;draw();};
  controls.append(prev,next); host.append(search,status,list,controls); draw();
  });
}
document.getElementById('theme').onchange = e => { document.documentElement.dataset.theme=e.target.value; };
`;

export const REPORT_CSS = `
:root{color-scheme:light dark;--bg:#f4f6f8;--card:#fff;--ink:#182638;--muted:#526277;--line:#c7d0da;--accent:#1756a3;--warn:#8a4014}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#101720;--card:#182331;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--warn:#ffbb8f}}
:root[data-theme=dark]{--bg:#101720;--card:#182331;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--warn:#ffbb8f;color-scheme:dark}
:root[data-theme=light]{color-scheme:light}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:32px 24px 72px}h1{font-size:clamp(30px,5vw,52px);letter-spacing:-.045em;margin:12px 0}h2{font-size:24px;letter-spacing:-.02em}h3{font-size:18px}h4{font-size:16px;margin:0 0 12px}p{margin:8px 0}a{color:var(--accent)}code,pre{font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}section{margin-top:36px;scroll-margin-top:16px}.kicker{text-transform:uppercase;letter-spacing:.15em;font-size:12px;font-weight:700;color:var(--muted)}.toolbar,.pagination{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.toolbar{justify-content:space-between}.hero,.coverage,.grid{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr))}.coverage{grid-template-columns:repeat(3,minmax(0,1fr))}.card,.group{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;min-width:0}.status{font-size:32px;letter-spacing:-.025em;font-weight:700}.limited{border-top:4px solid var(--warn)}.metric{font-size:28px;font-weight:650}.muted,small{color:var(--muted)}dl{margin:12px 0}dt{color:var(--muted);font-size:12px}dd{margin:0 0 10px;overflow-wrap:anywhere}.bar{display:flex;height:18px;border-radius:4px;overflow:hidden;background:var(--line);margin:16px 0 8px}.bar span{min-width:0}.literal{background:#cc704a}.reference{background:#477bc4}.mixed{background:#9676c8}.ambiguous{background:#9f8151}.excluded{background:#8b969f}.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px}.legend i{display:inline-block;width:9px;height:9px;margin-right:5px}.group{margin:14px 0}.finding{padding:18px 0;border-top:1px solid var(--line);overflow-wrap:anywhere}.finding p{white-space:pre-wrap}summary{cursor:pointer;color:var(--accent);padding:10px 0;overflow-wrap:anywhere}details{min-width:0}details details{margin-left:12px}.datum{border-top:1px solid var(--line);padding:8px 0;display:grid;gap:4px}.datum>strong{font-size:12px;color:var(--muted)}button,select,input{font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 12px}input{width:100%;margin:12px 0}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid var(--accent);outline-offset:3px}ul{padding-left:20px;overflow-wrap:anywhere}.swatch{display:inline-block;width:22px;height:22px;border:1px solid var(--muted);border-radius:4px;vertical-align:middle;margin-right:8px}.values{list-style:none;padding:0}.values li{margin:10px 0}.table-wrap{overflow:auto}table{border-collapse:collapse;min-width:100%;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);white-space:nowrap}nav{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}.print-note{display:none}
@media(max-width:700px){main{padding:20px 16px 48px}.hero,.coverage,.grid{grid-template-columns:1fr}.card,.group{padding:16px}.status{font-size:27px}}
@media print{:root{--bg:#fff;--card:#fff;--ink:#000;--muted:#444;--line:#bbb;--accent:#000;--warn:#000;color-scheme:light}main{max-width:none;padding:0}button,select,input,nav,.toolbar label,.pagination{display:none}.print-note{display:block}.card,.finding{break-inside:avoid}.hero,.coverage{display:block}.card{margin-bottom:12px}.bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}details:not([open])>summary{color:#444}a{color:#000}h2,h3{break-after:avoid}}

/* Compact overview: charts use recorded counts, never a health score. */
main{padding-top:20px}h1{font-size:30px;margin:8px 0}h2{font-size:20px}nav{margin:12px 0}.summary-strip{display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}.summary-strip>div>strong{display:block;font-size:24px}.summary-strip .bar{height:10px;margin:6px 0}.scope-note{grid-column:1/-1;font-size:12px;color:var(--muted);margin:0}.overview-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;margin-top:16px}.overview-grid .card{padding:16px}.overview-grid h2{margin:0 0 10px}.chart-label,.chart-row{display:grid;grid-template-columns:100px 1fr 1fr;gap:12px;align-items:center}.chart-label{font-size:11px;color:var(--muted)}.chart-row{padding:5px 0;font-size:12px;text-decoration:none;color:var(--ink)}.mini-track{height:22px;position:relative;background:var(--bg);border-radius:3px;overflow:hidden}.mini-track i{height:100%;display:block;opacity:.3}.mini-track b{position:absolute;inset:0;padding:1px 7px;font-variant-numeric:tabular-nums}.top-files{margin:10px 0 0;padding:0;list-style:none}.top-files li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;border-top:1px solid var(--line);padding:7px 0}.top-files code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.top-files small{grid-column:1/-1;font-size:11px}.top-files strong{font-size:12px}.blocking{background:#972c40}.high{background:#c45d36}.medium{background:#997024}.low{background:#49789e}.badge.high{background:#9e472b}.badge.medium{background:#765515}.badge.low{background:#315c7d}.badge{padding:2px 7px;border-radius:4px;color:#fff;font-size:11px}.finding-meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--muted)}.finding-meta code{font-size:11px}.one-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:8px 0 4px}.locations{font:11px/1.6 ui-monospace,monospace;color:var(--muted)}.finding{padding:12px 0}.finding>details>summary{padding:3px 0}.group{padding:14px;margin:10px 0}.group h3{margin:5px 0}.suggestions{font-size:12px}.suggestions th,.suggestions td{white-space:normal;overflow-wrap:anywhere;vertical-align:top;min-width:100px}.suggestions small{display:block}.suggestions td:nth-child(4),.suggestions td:nth-child(5){min-width:180px}.manifest{font-size:12px}.table-wrap{max-width:100%}
@media(max-width:700px){.summary-strip{grid-template-columns:1fr 1fr}.severity-chart{grid-column:1/-1}.overview-grid{grid-template-columns:1fr}.chart-label,.chart-row{grid-template-columns:84px 1fr 1fr;gap:8px}.summary-strip>div>strong{font-size:20px}.suggestions{min-width:660px}}
@media print{.one-line{white-space:normal;overflow:visible}.overview-grid{display:block}.top-files code{white-space:normal}.summary-strip,.overview-grid .card{break-inside:avoid}.mini-track,.bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
