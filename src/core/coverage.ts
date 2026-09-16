import { basename, relative } from 'node:path';
import type { Adapter } from '../adapters/types.ts';
import { listFiles, surveyTree } from './files.ts';
import type { RawValue } from './provenance.ts';

/**
 * What the audit could NOT read.
 *
 * A linter that reports "clean" while silently skipping half of a repo's styling
 * is worse than one that reports nothing, because the reader believes it. This
 * module exists because that failure was measured, not imagined: 76 `oklch()`
 * tokens in a real design system and 72 `color(display-p3 …)` entries in the
 * project's own control fixture were invisible for the tool's entire life, and
 * the audit said the sources were nearly clean.
 *
 * Three different kinds of blindness, kept apart because they need different
 * responses:
 *
 *   unreadFormats   a file format no adapter handles at all -> needs an adapter
 *   partialReads    a file that was opened but only partly understood -> needs care
 *   unconvertible   a value recognised as a colour but not convertible -> needs a human
 *
 * A clean audit describes the checks and the scope it covered. Nothing more.
 */

export type Coverage = {
  /** extension -> file count, for formats no adapter reads */
  unreadFormats: Record<string, number>;
  /** what each adapter actually looks at inside the files it opens */
  partialReads: { adapter: string; extensions: string[]; reads: string }[];
  /** files whose name claims to hold design tokens, in a format no adapter reads */
  unreadTokenFiles: string[];
  /** values recognised as colour but not convertible by this version */
  unconvertible: { count: number; samples: string[] };
  /** rules that returned nothing because they could not judge, not because it was clean */
  couldNotJudge: string[];
  /** true when nothing is unread, unconvertible, or unjudged */
  complete: boolean;
};

/**
 * Formats that carry design values and that a future adapter would read.
 *
 * `.json` and `.yaml` are deliberately absent: every repo has a package.json, and
 * reporting it as unread styling would be exactly the kind of false positive that
 * buries the real ones. Token JSON is detected by filename instead.
 */
const STYLING_FORMATS = new Set([
  '.scss',
  '.sass',
  '.less',
  '.styl',
  '.stylus',
  '.vue',
  '.svelte',
  '.astro',
  '.html',
]);

/** a data file whose NAME claims to hold design tokens */
const TOKEN_FILE = /(^|[.\-_])(tokens?|design-tokens)([.\-_]|$)/i;

export function buildCoverage(
  root: string,
  adapters: Adapter[],
  values: RawValue[],
  firedRuleIds: string[],
): Coverage {
  const readable = new Set(adapters.flatMap((a) => a.extensions));
  const present = surveyTree(root);

  const unreadFormats: Record<string, number> = {};
  for (const [ext, count] of present) {
    if (readable.has(ext)) continue;
    // only report formats that plausibly hold design values; a .md or .png
    // being unread is not a gap worth a line in the report
    if (STYLING_FORMATS.has(ext)) unreadFormats[ext] = count;
  }

  // a file called tokens.json is a design-token source; package.json is not
  const tokenFiles = listFiles(root, ['.json', '.yaml', '.yml', '.json5'])
    .filter((f) => TOKEN_FILE.test(basename(f)))
    .map((f) => relative(root, f) || f);

  const ambiguous = values.filter((v) => v.provenance.classification === 'ambiguous');
  const samples = [...new Set(ambiguous.map((v) => v.raw))].slice(0, 4);

  // a rule whose own finding says it could not judge — the tier rules do this
  // explicitly rather than returning nothing and looking like a pass
  const couldNotJudge = firedRuleIds.filter((id) => id.endsWith('-undetectable'));

  return {
    unreadFormats,
    partialReads: adapters.map((a) => ({
      adapter: `${a.id}@${a.version}`,
      extensions: a.extensions,
      reads: a.reads,
    })),
    unreadTokenFiles: tokenFiles,
    unconvertible: { count: ambiguous.length, samples },
    couldNotJudge,
    complete:
      Object.keys(unreadFormats).length === 0 &&
      tokenFiles.length === 0 &&
      ambiguous.length === 0 &&
      couldNotJudge.length === 0,
  };
}

/** the human-readable half — printed after the findings, never instead of them */
export function formatCoverage(c: Coverage): string[] {
  const lines: string[] = [];

  for (const { adapter, extensions, reads } of c.partialReads) {
    lines.push(`    ${adapter}`);
    lines.push(`      reads ${extensions.join(' ')} — ${reads}`);
  }

  const unread = Object.entries(c.unreadFormats);
  if (unread.length > 0) {
    lines.push(
      `    not read at all: ${unread.map(([ext, n]) => `${n}× ${ext}`).join(', ')} — no adapter handles these`,
    );
  }

  if (c.unreadTokenFiles.length > 0) {
    lines.push(
      `    ${c.unreadTokenFiles.length} design-token file(s) not read: ${c.unreadTokenFiles.slice(0, 3).join(', ')}`,
    );
    lines.push('      a tokens-studio-json adapter would read these; none exists yet');
  }

  if (c.unconvertible.count > 0) {
    lines.push(
      `    ${c.unconvertible.count} colour value(s) recognised but not convertible: ${c.unconvertible.samples.join(', ')}`,
    );
    lines.push('      these are excluded from every colour rule and need a human');
  }

  if (c.couldNotJudge.length > 0) {
    lines.push(`    could not judge: ${c.couldNotJudge.join(', ')} — see the finding for why`);
  }

  if (c.complete) {
    lines.push('    every format in scope was read, every colour converted, every rule able to judge');
  }

  return lines;
}
