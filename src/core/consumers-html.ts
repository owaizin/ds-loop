import type { ConsumersReport } from './consumers.ts';

/**
 * Report #3 — UI architecture, generated from `analyseConsumers` only.
 *
 * Apps sit in platform lanes on top, the shared packages they import below,
 * and every line is a real import statement count. Nothing is drawn that the
 * import map does not contain: a package with no production consumer is shown
 * as such, and story/test imports are dashed and never counted as adoption.
 */

const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const PLATFORMS = ['web', 'native', 'unknown'] as const;

export function renderConsumersHtml(
  r: ConsumersReport,
  opts: { label: string; generatedAt: string },
): string {
  const apps = r.consumers.filter(
    (c) => c.uses.length > 0 || c.usage.production.sharedComponentShare !== null,
  );
  // shared targets = specifiers actually imported, grouped by target package
  const targets = new Map<
    string,
    { specifier: string; target: string; total: number; production: number; importers: number }
  >();
  for (const c of apps) {
    for (const u of c.uses) {
      const t = targets.get(u.specifier) ?? {
        specifier: u.specifier,
        target: u.target,
        total: 0,
        production: 0,
        importers: 0,
      };
      t.total += u.count;
      t.production += u.production;
      t.importers++;
      targets.set(u.specifier, t);
    }
  }
  const targetList = [...targets.values()].sort(
    (a, b) => b.total - a.total || a.specifier.localeCompare(b.specifier),
  );
  const idOf = (s: string) => `p-${s.replace(/[^a-z0-9]+/gi, '-')}`;

  const edges = apps.flatMap((c) =>
    c.uses.map((u) => ({
      from: idOf(`app:${c.package}`),
      to: idOf(`t:${u.specifier}`),
      count: u.count,
      production: u.production,
      label: `${c.package} → ${u.specifier}: ${u.count} import(s)${u.production < u.count ? `, ${u.count - u.production} in stories/tests` : ''}`,
    })),
  );

  const appCard = (c: (typeof apps)[number]) => {
    const usage = c.usage.production;
    const share = usage.sharedComponentShare;
    const prod = c.uses.reduce((n, u) => n + u.production, 0);
    return `<button class="node app" id="${idOf(`app:${c.package}`)}" data-node><b>${esc(c.package)}</b><span>${esc(c.dir)} · ${c.files} files</span><span>${prod} production import(s) of shared packages</span><span>Shared-component share: ${share === null ? 'not checked — no shared/local JSX' : `${(share * 100).toFixed(1)}%`}</span><span>${usage.shared.elements} shared · ${usage.local.elements} local · ${usage.external.elements} external · ${usage.unresolved.elements} unresolved</span>${share === null ? '' : `<span style="display:block;background:var(--line);height:6px;width:100%" aria-hidden="true"><span style="display:block;background:var(--accent);height:100%;width:${share * 100}%"></span></span>`}</button>`;
  };
  const lanes = PLATFORMS.map((p) => {
    const list = apps.filter((c) => c.platform === p);
    if (!list.length) return '';
    return `<section class="lane"><h3>${p === 'unknown' ? 'Platform unknown' : p === 'web' ? 'Web' : 'Native'}</h3><div class="row">${list.map(appCard).join('')}</div></section>`;
  }).join('');
  const targetCard = (t: (typeof targetList)[number]) => {
    const storyOnly = t.production === 0;
    return `<button class="node target${storyOnly ? ' story-only' : ''}" id="${idOf(`t:${t.specifier}`)}" data-node><b>${esc(t.specifier)}</b><span>${t.importers} importing package(s) · ${t.total} import(s)</span>${storyOnly ? '<span class="flag">stories/tests only — not production adoption</span>' : t.importers === 1 ? '<span class="flag soft">used by one package</span>' : ''}</button>`;
  };

  const matrixCols = targetList.map((t) => `<th scope="col"><span>${esc(t.specifier)}</span></th>`).join('');
  const matrixRows = apps
    .map((c) => {
      const cells = targetList
        .map((t) => {
          const u = c.uses.find((x) => x.specifier === t.specifier);
          if (!u) return '<td></td>';
          const names = Object.entries(u.names)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 8)
            .map(([n, k]) => `${n} ${k}`)
            .join(', ');
          const tip = `${names}${names ? ' — ' : ''}${u.samples.map((s) => `${s.file}:${s.line}`).join(', ')}`;
          return `<td class="${u.production === 0 ? 'dim' : ''}" title="${esc(tip)}">${u.count}${u.production < u.count ? `<small>${u.count - u.production} st</small>` : ''}</td>`;
        })
        .join('');
      return `<tr><th scope="row">${esc(c.package)}<small>${esc(c.platform)}</small></th>${cells}</tr>`;
    })
    .join('');

  const unused = r.unconsumedExports;
  const idle = r.consumers.filter((c) => c.uses.length === 0).map((c) => c.package);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ds-loop consumers — ${esc(opts.label)}</title><style>
:root{color-scheme:light dark;--bg:#f4f6f8;--card:#fff;--ink:#182638;--muted:#526277;--line:#c7d0da;--accent:#1756a3;--warn:#8a4014;--edge:#6d8199}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#101720;--card:#182331;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--warn:#ffbb8f;--edge:#8aa0b8}}
:root[data-theme=dark]{--bg:#101720;--card:#182331;--ink:#edf2f8;--muted:#b1c0d2;--line:#45576c;--accent:#8cbfff;--warn:#ffbb8f;--edge:#8aa0b8;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:20px 16px 64px}
h1{font-size:28px;letter-spacing:-.03em;margin:6px 0}h2{font-size:20px;margin:28px 0 8px}h3{font-size:13px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin:0 0 8px}p{margin:6px 0}.muted,small{color:var(--muted)}.kicker{text-transform:uppercase;letter-spacing:.15em;font-size:11px;font-weight:700;color:var(--muted)}
.diagram{position:relative;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}
.lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.lane{border-top:2px solid var(--ink);padding-top:10px}
.row{display:flex;flex-wrap:wrap;gap:10px}.targets{margin-top:90px;border-top:2px solid var(--ink);padding-top:10px}
.node{position:relative;z-index:1;display:grid;gap:2px;text-align:left;font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-width:0;max-width:280px;cursor:pointer}
.node b{font-size:14px;overflow-wrap:anywhere}.node span{font-size:12px;color:var(--muted)}.node .flag{color:var(--warn);font-weight:600}.node .flag.soft{font-weight:400}
.story-only{border-style:dashed}.node.hl{outline:2px solid var(--accent)}.node.dimmed{opacity:.35}.node:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
svg.wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}svg.wires path{fill:none;stroke:var(--edge);opacity:.55}svg.wires path.story{stroke-dasharray:4 4}svg.wires path.hl{stroke:var(--accent);opacity:1}svg.wires path.dimmed{opacity:.08}
.table{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}table{border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
th[scope=row]{text-align:left}th[scope=row] small{display:block;font-weight:400}thead th{vertical-align:bottom;text-align:left;font-weight:600}td small{display:block;font-size:11px}td.dim{color:var(--muted);font-style:italic}
ul{padding-left:20px}li{margin:3px 0;overflow-wrap:anywhere}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
@media(max-width:600px){.targets{margin-top:40px}svg.wires{display:none}}@media print{svg.wires{display:none}.node{break-inside:avoid}}
</style></head><body><main>
<p class="kicker">ds-loop / UI architecture · generated ${esc(opts.generatedAt)}</p><h1>${esc(opts.label)}</h1>
<p class="muted">Read the package cards for shared-component share, then follow import links to shared packages. Source: ${esc(r.workspaceSource)}.</p>
<p class="muted"><b>Legend:</b> Lines count imports; dashed lines mean stories or tests only. Card bars show shared / (shared + local) production JSX elements. External and unresolved elements are excluded. Neither measure is runtime usage.</p>
${
  apps.length === 0
    ? r.packages.length === 0
      ? '<p><b>Not checked.</b> No workspace packages were found. Run from a workspace root with package.json workspaces or pnpm-workspace.yaml. This does not mean nothing is shared.</p>'
      : '<p>No shared imports were found in this scope. Check the selected scope and the limits below before drawing a conclusion about reuse.</p>'
    : `<section class="diagram" id="diagram"><svg class="wires" aria-hidden="true"></svg><div class="lanes">${lanes}</div><div class="targets"><h3>Shared packages imported</h3><div class="row">${targetList.map(targetCard).join('')}</div></div></section>
<h2>Import matrix</h2><p class="muted">Rows import columns. Numbers are import statements; "st" counts those in stories or tests. Hover a cell for named imports and file:line samples.</p>
<div class="table" tabindex="0" role="region" aria-label="Import matrix"><table><thead><tr><th scope="col">Package</th>${matrixCols}</tr></thead><tbody>${matrixRows}</tbody></table></div>`
}
<h2>Review these gaps</h2><div class="cols">
<div class="card"><h3>Exported, no production import</h3>${unused.length ? `<ul>${unused.map((e) => `<li><code>${esc(e.package)}${e.subpath === '.' ? '' : esc(e.subpath.slice(1))}</code>${e.storyOrTestOnly ? ' — stories/tests only' : ''}</li>`).join('')}</ul>` : '<p class="muted">No entries in this list. Review the scope and limits below.</p>'}</div>
<div class="card"><h3>Packages importing no shared package</h3>${idle.length ? `<p class="muted">${idle.length}: ${idle.map(esc).join(', ')}</p>` : '<p class="muted">No entries in this list. Review the scope and limits below.</p>'}</div>
<div class="card"><h3>What this report can establish</h3><ul>${r.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
</div>
</main><script>
const edges=${JSON.stringify(edges).replace(/</g, '\\u003c')};
const box=document.getElementById('diagram'),svg=box&&box.querySelector('svg.wires');
function draw(){if(!svg)return;const b=box.getBoundingClientRect();let out='';const max=Math.max(1,...edges.map(e=>e.count));
for(const e of edges){const a=document.getElementById(e.from),t=document.getElementById(e.to);if(!a||!t)continue;const r1=a.getBoundingClientRect(),r2=t.getBoundingClientRect();
const x1=r1.left+r1.width/2-b.left,y1=r1.bottom-b.top,x2=r2.left+r2.width/2-b.left,y2=r2.top-b.top,my=(y1+y2)/2,w=(1+3*Math.log(1+e.count)/Math.log(1+max)).toFixed(2);
out+='<path data-from="'+e.from+'" data-to="'+e.to+'" class="'+(e.production===0?'story':'')+'" stroke-width="'+w+'" d="M'+x1+' '+y1+' C'+x1+' '+my+','+x2+' '+my+','+x2+' '+y2+'"><title></title></path>';}
svg.innerHTML=out;let i=0;for(const p of svg.querySelectorAll('path'))p.firstChild.textContent=edges[i++].label;}
function focus(id){const linked=new Set([id]);for(const e of edges){if(e.from===id)linked.add(e.to);if(e.to===id)linked.add(e.from);}
for(const n of document.querySelectorAll('[data-node]')){n.classList.toggle('hl',id&&n.id===id);n.classList.toggle('dimmed',!!id&&!linked.has(n.id));}
if(svg)for(const p of svg.querySelectorAll('path')){const on=id&&(p.dataset.from===id||p.dataset.to===id);p.classList.toggle('hl',!!on);p.classList.toggle('dimmed',!!id&&!on);}}
let pinned=null;for(const n of document.querySelectorAll('[data-node]')){n.addEventListener('mouseenter',()=>{if(!pinned)focus(n.id)});n.addEventListener('mouseleave',()=>{if(!pinned)focus(null)});n.addEventListener('click',()=>{pinned=pinned===n.id?null:n.id;focus(pinned)});}
draw();addEventListener('resize',draw);
</script></body></html>
`;
}
