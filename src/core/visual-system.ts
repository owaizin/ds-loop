/** Shared offline palette and typography for reports, diagrams and dashboards. */
export const VISUAL_CSS = `
:root{color-scheme:light;--bg:#f7f5fb;--card:#fff;--ink:#211632;--muted:#625a70;--line:#d9d1e5;--accent:#6323b9;--warn:var(--accent);--edge:var(--accent)}
:root[data-theme=dark]{color-scheme:dark;--bg:#080512;--card:#110d20;--ink:#f3f0ff;--muted:#b1abc4;--line:#2d2541;--accent:#d1bcff;--warn:var(--accent);--edge:var(--accent)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#080512;--card:#110d20;--ink:#f3f0ff;--muted:#b1abc4;--line:#2d2541;--accent:#d1bcff;--warn:var(--accent);--edge:var(--accent)}}
h1,h2,h3{font-family:Manrope,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:500}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
code,pre{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace}
`;
export const escapeHtml = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
