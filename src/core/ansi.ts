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
