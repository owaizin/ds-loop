/** Hand-authored line-icon sprite (Remix-style: thin stroke, rounded caps) — no icon font,
 * no CDN, no package. Defined once as <symbol>s and referenced with <use>, so the report
 * stays one self-contained file. Icons are decorative only: every icon sits beside text
 * that already carries the same information, never in place of it. */
const SYMBOLS: Record<string, string> = {
  summary:
    '<line x1="3" y1="20" x2="21" y2="20"/><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/>',
  problem:
    '<path d="M12 3.5 L21.5 20 H2.5 Z"/><line x1="12" y1="9.5" x2="12" y2="14.5"/><line x1="12" y1="17.2" x2="12" y2="17.3"/>',
  current:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="12" x2="12" y2="12.1"/>',
  ideal: '<path d="M12 3 L14.5 9.2 L21 9.8 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.8 L9.5 9.2 Z"/>',
  after: '<polyline points="3,17 10,10 14,14 21,6"/><polyline points="15,6 21,6 21,12"/>',
  plan: '<rect x="3" y="4.5" width="4" height="4" rx="1"/><line x1="10" y1="6.5" x2="21" y2="6.5"/><rect x="3" y="10.5" width="4" height="4" rx="1"/><line x1="10" y1="12.5" x2="21" y2="12.5"/><rect x="3" y="16.5" width="4" height="4" rx="1"/><line x1="10" y1="18.5" x2="21" y2="18.5"/>',
  limits:
    '<path d="M2 12 C4.5 7 8 4.5 12 4.5 C16 4.5 19.5 7 22 12 C19.5 17 16 19.5 12 19.5 C8 19.5 4.5 17 2 12 Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/>',
  'status-observed': '<circle cx="12" cy="12" r="9"/><polyline points="8,12.5 11,15.5 16,9"/>',
  'status-inferred':
    '<circle cx="6" cy="12" r="2.5"/><line x1="9" y1="12" x2="18" y2="12" stroke-dasharray="2.2 3"/><circle cx="19" cy="12" r="2"/>',
  'status-proposed':
    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="16.5"/><line x1="7.5" y1="12" x2="16.5" y2="12"/>',
  'status-not-checked': '<circle cx="12" cy="12" r="9"/><line x1="6" y1="18" x2="18" y2="6"/>',
};

/** One hidden sprite sheet; emit once per document, near the top of <body>. */
export const ICON_SPRITE = `<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${Object.entries(
  SYMBOLS,
)
  .map(([id, shape]) => `<symbol id="i-${id}" viewBox="0 0 24 24">${shape}</symbol>`)
  .join('')}</svg>`;

const ICON_NAMES = new Set(Object.keys(SYMBOLS));

/** References a sprite symbol. `name` is checked at call time — throws early on a typo
 * (including a name built from untrusted-shaped data, e.g. `status-${status}`) rather than
 * shipping a silently blank icon. */
export function icon(name: string, className = ''): string {
  if (!ICON_NAMES.has(name)) throw new Error(`icons.ts: unknown icon "${name}"`);
  return `<svg class="icon${className ? ` ${className}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
