/** Generated cover graphics: grain, mesh gradient and true halftone fields.
 *
 * A halftone is a field of dots whose *radius* varies to describe a shape — not a
 * uniform dot grid with a soft mask over it, which is what a repeating-radial-gradient
 * gives you and what this replaced. The dot geometry is computed here so the shape has
 * real edges: dots grow to full size inside the form and shrink to nothing outside it.
 *
 * Everything is inline SVG with no external reference, so the report stays one file
 * under `default-src 'none'`. Output is deterministic — same arguments, same markup —
 * because these land in reports that get diffed between runs.
 */

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const smoothstep = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Film grain, clipped to the artwork's own alpha and blended back over it. A full-bleed
 * noise rect with an overlay blend lightens the whole frame on a dark page, which reads as
 * a pasted box rather than texture. */
export const grainFilter = (id: string, frequency = 0.9, strength = 0.42): string =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="7" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feComponentTransfer in="g" result="ga"><feFuncA type="linear" slope="${strength}"/></feComponentTransfer><feComposite in="ga" in2="SourceAlpha" operator="in" result="gc"/><feBlend in="gc" in2="SourceGraphic" mode="overlay"/></filter>`;

/** Signed field of a lens: the overlap of two equal circles, which is the petal in the
 * reference marks. Centres sit `e` either side of the middle, so a larger `e` gives a
 * narrower, more pointed leaf. Returns 0 outside, 1 at the thickest point. */
function lens(x: number, y: number, cx: number, cy: number, angle: number, size: number, e: number) {
  const a = (angle * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const px = (dx * Math.cos(a) + dy * Math.sin(a)) / size;
  const py = (-dx * Math.sin(a) + dy * Math.cos(a)) / size;
  const d1 = Math.hypot(px - e, py);
  const d2 = Math.hypot(px + e, py);
  return Math.min(1 - d1, 1 - d2) / (1 - e);
}

type Dot = { x: number; y: number; r: number };

function dots(w: number, h: number, step: number, maxR: number, field: (x: number, y: number) => number) {
  const out: Dot[] = [];
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      const r = maxR * smoothstep(field(x, y));
      if (r > 0.18) out.push({ x, y, r });
    }
  return out;
}

const circles = (rows: Dot[], fill: string) =>
  rows.map((d) => `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="${fill}"/>`).join('');

/** Two overlapping halftone petals, as on the assessment cover. The dot grid is one
 * field; the two petals are unioned so the overlap reads as a single form. */
export function halftoneComet(id: string, w = 420, h = 520, step = 10.5, maxR = 4.7): string {
  // e near 0.4 gives the broad petal of the reference mark; nearer 1 collapses it to a sliver.
  const field = (x: number, y: number) =>
    Math.max(
      lens(x, y, w * 0.33, h * 0.32, -32, h * 0.42, 0.42),
      lens(x, y, w * 0.66, h * 0.67, -32, h * 0.34, 0.42),
    );
  return `<svg class="art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${f(w * 0.62)}" y1="${f(h * 0.1)}" x2="${f(w * 0.38)}" y2="${f(h * 0.92)}"><stop offset="0" stop-color="var(--art-warm)"/><stop offset=".18" stop-color="var(--art-warm)"/><stop offset=".52" stop-color="var(--art-mid)"/><stop offset="1" stop-color="var(--art-cool)"/></linearGradient></defs><g>${circles(dots(w, h, step, maxR, field), `url(#${id}-g)`)}</g></svg>`;
}

/** The hero panel: a hard quarter-disc and a lens cut from a mesh gradient, with a
 * halftone field beside them whose dots grow toward the warm corner.
 * The overlap blend is `--art-blend`: multiply reads on a light page, screen on a dark one. */
export function meshPanel(id: string, w = 440, h = 550, step = 12, maxR = 5.2): string {
  const field = (x: number, y: number) => {
    const t = (x / w) * 0.62 + (1 - y / h) * 0.58 - 0.34;
    return t * (0.35 + 0.85 * (x / w));
  };
  const grid = dots(w, h, step, maxR, field).filter((d) => d.x > w * 0.42);
  return `<svg class="art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-a" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f(w * 0.8)}" y2="${f(h * 0.7)}"><stop offset="0" stop-color="var(--art-cool)"/><stop offset="1" stop-color="var(--art-mid)"/></linearGradient><radialGradient id="${id}-b" gradientUnits="userSpaceOnUse" cx="${f(w * 0.46)}" cy="${f(h * 0.46)}" r="${f(w * 0.62)}"><stop offset="0" stop-color="var(--art-warm)"/><stop offset="1" stop-color="var(--art-mid)"/></radialGradient><linearGradient id="${id}-c" gradientUnits="userSpaceOnUse" x1="${f(w)}" y1="0" x2="${f(w * 0.44)}" y2="${f(h)}"><stop offset="0" stop-color="var(--art-warm)"/><stop offset=".62" stop-color="var(--art-mid)"/><stop offset="1" stop-color="var(--art-cool)"/></linearGradient>${grainFilter(`${id}-n`, 0.75)}</defs><g filter="url(#${id}-n)"><path d="M0 0 H${f(w * 0.42)} A${f(w * 0.42)} ${f(w * 0.42)} 0 0 1 0 ${f(w * 0.42)} Z" fill="url(#${id}-a)" transform="translate(${f(w * -0.2)} ${f(h * -0.16)}) scale(1.78)"/><ellipse cx="${f(w * 0.42)}" cy="${f(h * 0.56)}" rx="${f(w * 0.3)}" ry="${f(h * 0.34)}" transform="rotate(-24 ${f(w * 0.42)} ${f(h * 0.56)})" fill="url(#${id}-b)" style="mix-blend-mode:var(--art-blend,multiply)"/><g>${circles(grid, `url(#${id}-c)`)}</g></g></svg>`;
}
