import type { Severity } from '../rules/types.ts';

/**
 * Terminal styling for human readers only.
 *
 * Every consumer that is not a terminal must receive the same bytes it received
 * before colour existed: the guard hook captures stdout, `--json` is parsed, CI
 * logs are diffed, and `test/readme.test.ts` matches documented samples against
 * real runs. So colour is opt-out by default — it appears only on a TTY, and
 * `NO_COLOR` (https://no-color.org) turns it off everywhere.
 */
export function colorEnabled(stream: { isTTY?: boolean } = process.stdout): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '') return false;
  if (process.env.TERM === 'dumb') return false;
  return stream.isTTY === true;
}

const CODES = {
  reset: 0,
  bold: 1,
  dim: 2,
  red: 31,
  yellow: 33,
  blue: 34,
  cyan: 36,
} as const;

export type Style = keyof Omit<typeof CODES, 'reset'>;

export function style(text: string, ...styles: Style[]): string {
  if (styles.length === 0 || !colorEnabled()) return text;
  const open = styles.map((s) => `\x1b[${CODES[s]}m`).join('');
  return `${open}${text}\x1b[${CODES.reset}m`;
}

const SEVERITY_STYLE: Record<Severity, Style[]> = {
  blocking: ['bold', 'red'],
  high: ['red'],
  medium: ['yellow'],
  low: ['dim'],
};

/** The severity tag is what the eye hunts for in a long report, so it carries the colour. */
export function severityTag(severity: Severity): string {
  return style(`[${severity.toUpperCase()}]`, ...SEVERITY_STYLE[severity]);
}

/**
 * Wrapping is the one thing that cannot be identical everywhere: it depends on a
 * width only a terminal has. A pipe, a file, the guard hook and the documented
 * samples in `test/readme.test.ts` therefore keep receiving one long line, exactly
 * as before. Structure (the gutter, the label column) is deterministic and is
 * emitted everywhere, so the documentation shows what a reader actually sees.
 */
export function termWidth(): number {
  if (process.stdout.isTTY !== true) return 0;
  const w = process.stdout.columns;
  if (typeof w === 'number' && w > 0) return w;
  // A pty can report no size (`script`, some CI terminals); COLUMNS is the
  // conventional answer. Only consulted on a TTY, so a pipe still never wraps.
  const env = Number.parseInt(process.env.COLUMNS ?? '', 10);
  return Number.isFinite(env) && env > 0 ? env : 0;
}

/**
 * Greedy fill. `continuation` is prepended to every line after the first, so a
 * wrapped `risk:` paragraph stays inside its label column instead of falling back
 * to column 0 — which is what made a long finding unreadable.
 */
export function wrapTo(text: string, firstPrefix: string, continuation: string): string[] {
  const width = termWidth();
  if (width === 0) return [`${firstPrefix}${text}`];

  const room = Math.max(24, width - continuation.length - 1);
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= room) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line !== '') out.push(line);
  if (out.length === 0) return [`${firstPrefix}${text}`];
  return out.map((l, i) => (i === 0 ? `${firstPrefix}${l}` : `${continuation}${l}`));
}

/** Groups the lines of one finding, so stacked findings do not read as one block. */
export function gutter(): string {
  return style('│', 'dim');
}
