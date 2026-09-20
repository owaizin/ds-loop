import { basename, relative } from 'node:path';
import type { Adapter } from '../adapters/types.ts';
import { isUnparsedColorFunction } from '../color/convert.ts';
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
  /** colour functions this version cannot convert at all — a gap in the engine */
  unconvertible: { count: number; samples: string[] };
  /**
   * Colours that converted fine but whose *role* is undecided — a low-alpha value
   * that may be an overlay tint rather than a palette entry. A judgement for a
   * human, not a hole in the tool, and conflating the two makes both unreadable.
   */
  undecided: { count: number; samples: string[] };
  /** rules that returned nothing because they could not judge, not because it was clean */
  couldNotJudge: string[];
  /**
   * True only when an adapter actually read something AND nothing was unread,
   * unconvertible, or unjudged. With no adapter there is no coverage to be complete
   * about, and saying "every rule could judge" inside a not-checked report is
   * reassurance the reader has not earned.
   */
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
  unjudgedRuleIds: string[] = [],
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
  const cannotConvert = ambiguous.filter((v) => isUnparsedColorFunction(v.raw));
  const roleUndecided = ambiguous.filter((v) => !isUnparsedColorFunction(v.raw));
  const sample = (vs: typeof ambiguous) => [...new Set(vs.map((v) => v.raw))].slice(0, 4);

  // a rule whose own finding says it could not judge — the tier rules do this
  // explicitly rather than returning nothing and looking like a pass
  const couldNotJudge = [
    ...new Set([...firedRuleIds.filter((id) => id.endsWith('-undetectable')), ...unjudgedRuleIds]),
  ];

  return {
    unreadFormats,
    partialReads: adapters.map((a) => ({
      adapter: `${a.id}@${a.version}`,
      extensions: a.extensions,
      reads: a.reads,
    })),
    unreadTokenFiles: tokenFiles,
    unconvertible: { count: cannotConvert.length, samples: sample(cannotConvert) },
    undecided: { count: roleUndecided.length, samples: sample(roleUndecided) },
    couldNotJudge,
    // `undecided` does not make an audit incomplete: the tool read the value and
    // converted it. Someone has to decide what it means, which is not a gap.
    complete:
      adapters.length > 0 &&
      Object.keys(unreadFormats).length === 0 &&
      tokenFiles.length === 0 &&
      cannotConvert.length === 0 &&
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
      `    ${c.unconvertible.count} colour value(s) this version cannot convert: ${c.unconvertible.samples.join(', ')}`,
    );
    lines.push('      excluded from every colour rule — a gap in the engine, not in your code');
  }

  if (c.undecided.count > 0) {
    lines.push(
      `    ${c.undecided.count} low-alpha colour(s) of undecided role: ${c.undecided.samples.join(', ')}`,
    );
    lines.push('      converted fine; whether each is a palette entry or an overlay tint is yours');
  }

  if (c.couldNotJudge.length > 0) {
    lines.push(
      `    could not judge: ${c.couldNotJudge.join(', ')} — run an unfiltered audit of the same scope for details`,
    );
  }

  if (c.partialReads.length === 0) {
    lines.push('    no adapter read anything here — there is no coverage to report');
  } else if (c.complete) {
    lines.push('    every format in scope was read, every colour converted, every rule able to judge');
  }

  return lines;
}
