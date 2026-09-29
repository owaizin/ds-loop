/** Compose only our own standalone renderers. No untrusted HTML is accepted here.
 * Styles and DOM queries remain scoped; normal document flow also works in print.
 */
export function embedReport(html: string, id: string): string {
  const main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1];
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (main === undefined || css === undefined) throw new Error('Embedded report has no main/style');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  // Root variables come from the consulting document; standalone renderer palettes stay standalone.
  const scopedCss = css
    .replace(/:root(?:\[[^\]]*\])?\{[^}]*\}/g, '')
    .replace(/@media\(prefers-color-scheme:dark\)\{[^\n]*\}\n/g, '')
    .replace(/body\{/g, '&{');
  return `<div id="${id}" class="embedded-report"><style>#${id}{${scopedCss}}</style>${main}</div><script>(()=>{
const root = globalThis.document.getElementById('${id}');
const document = {
getElementById: id => root.querySelector('[id="'+CSS.escape(id)+'"]'),
querySelectorAll: selector => root.querySelectorAll(selector)
};
${scripts}
})();</script>`;
}
