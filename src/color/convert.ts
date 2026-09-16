/**
 * Color parsing and conversion to CIELAB (D65), the space CIEDE2000 operates in.
 *
 * Supported input forms (the ones design systems actually store):
 *   - hex:            #rgb #rgba #rrggbb #rrggbbaa
 *   - rgb()/rgba():   rgb(15 23 42) rgb(15,23,42) rgba(15 23 42 / 0.5)
 *   - hsl()/hsla():   hsl(222 47% 11%) hsla(222 47% 11% / 0.5)
 *   - bare HSL channel triple (Tailwind convention): "222.2 47.4% 11.2%"
 *     consumed downstream as hsl(var(--token))
 *   - oklch():        oklch(0.208 0.042 265.755) oklch(62.8% 0.258 29.2 / 0.5)
 *
 * oklch is here because it is what modern sources actually store — Tailwind v4,
 * shadcn, current Radix — and without it a whole palette reads as "not a colour"
 * and vanishes from every rule. Found by auditing a real design system whose 76
 * oklch tokens were silently invisible.
 *
 * NOT parsed, and deliberately surfaced as `ambiguous` rather than dropped:
 * lab(), lch(), hwb(), color(). Each needs its own white point or colour space,
 * and guessing is worse than asking a human.
 */

export type Rgba = { r: number; g: number; b: number; a: number };
export type Lab = { L: number; a: number; b: number };

const HEX = /^#([0-9a-f]{3,8})$/i;
const HSL_CHANNELS = /^-?\d*\.?\d+\s+-?\d*\.?\d+%\s+-?\d*\.?\d+%$/;
const FN = /^(rgb|rgba|hsl|hsla)\(([^)]+)\)$/i;
const OKLCH = /^oklch\(([^)]+)\)$/i;
/** colour functions that are real colours but not yet convertible here */
const UNPARSED_FN = /^(lab|lch|oklab|hwb|color)\(/i;

export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();

  const hex = s.match(HEX);
  if (hex) return fromHex(hex[1]);

  if (HSL_CHANNELS.test(s)) {
    const [h, sat, light] = s.split(/\s+/);
    return hslToRgb(num(h), pct(sat), pct(light), 1);
  }

  const ok = s.match(OKLCH);
  if (ok) return oklchToRgb(ok[1]!);

  const fn = s.match(FN);
  if (fn) {
    const kind = fn[1];
    const parts = fn[2]
      .split(/[,/]/)
      .flatMap((p) => p.trim().split(/\s+/))
      .filter(Boolean);
    const [x, y, z] = parts;
    const a = parts[3] != null ? alpha(parts[3]) : 1;
    if (kind.startsWith('rgb')) return { r: clamp255(num(x)), g: clamp255(num(y)), b: clamp255(num(z)), a };
    return hslToRgb(num(x), pct(y), pct(z), a);
  }

  return null;
}

function fromHex(h: string): Rgba {
  const expand = (c: string) => c + c;
  let hex = h;
  if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(expand).join('');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function hslToRgb(h: number, s: number, l: number, a: number): Rgba {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255), a };
}

export function rgbaToLab({ r, g, b }: Rgba): Lab {
  // sRGB -> linear
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);

  // linear sRGB -> XYZ (D65)
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;

  // normalize by D65 white
  const xr = X / 0.95047;
  const yr = Y / 1.0;
  const zr = Z / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function toLab(input: string): Lab | null {
  const rgba = parseColor(input);
  return rgba ? rgbaToLab(rgba) : null;
}

// helpers
const num = (v: string) => Number.parseFloat(v);
const pct = (v: string) => Number.parseFloat(v) / 100;
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const alpha = (v: string) => (v.endsWith('%') ? Number.parseFloat(v) / 100 : Number.parseFloat(v));

export function looksLikeColor(input: string): boolean {
  const s = input.trim().toLowerCase();
  return HEX.test(s) || HSL_CHANNELS.test(s) || FN.test(s) || OKLCH.test(s);
}

/**
 * A colour this module cannot convert yet. The caller must surface these for a
 * human instead of discarding them — a dropped colour is a silent false
 * negative, which is worse than a flagged unknown.
 */
export function isUnparsedColorFunction(input: string): boolean {
  return UNPARSED_FN.test(input.trim().toLowerCase());
}

/**
 * oklch(L C H) / oklch(L C H / A) -> sRGB, so the rest of the pipeline (and
 * CIEDE2000) keeps a single Lab path. L accepts 0-1 or a percentage; `none`
 * means zero per CSS Color 4. Matrices are Ottosson's.
 */
function oklchToRgb(body: string): Rgba | null {
  const [coords, alphaPart] = body.split('/');
  const parts = coords!
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  const axis = (v: string, scale = 1) =>
    v === 'none' ? 0 : v.endsWith('%') ? (num(v) / 100) * scale : num(v);
  const L = axis(parts[0]!, 1);
  const C = axis(parts[1]!, 0.4); // 100% chroma is 0.4 in CSS Color 4
  const hDeg = parts[2] === 'none' ? 0 : num(parts[2]!.replace(/deg$/, ''));
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(hDeg)) return null;

  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const bb = C * Math.sin(h);

  // OKLab -> LMS -> linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bb;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const sl = s_ * s_ * s_;

  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sl,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sl,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * sl,
  ];
  const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const [r, g, b] = lin.map((c) => clamp255(gamma(c) * 255));

  const al = alphaPart ? alpha(alphaPart.trim()) : 1;
  return { r: r!, g: g!, b: b!, a: Number.isFinite(al) ? al : 1 };
}

export function alphaOf(input: string): number {
  const rgba = parseColor(input);
  return rgba ? rgba.a : 1;
}
