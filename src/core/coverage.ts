import { readFileSync } from 'node:fs';
import { basename, relative, sep } from 'node:path';
import type { Adapter } from '../adapters/types.ts';
import { isUnparsedColorFunction } from '../color/convert.ts';
import type { DocumentationCoverage } from '../rules/docs.ts';
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
  documentation?: DocumentationCoverage;
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
  /** Unsupported CSS use-site expressions, distinct from low-alpha color roles. */
  unclassifiedStyles?: { count: number; samples: string[] };
  /**
   * Stylesheets this source imports from a package rather than declaring itself.
   * `node_modules` is not listed, so a consumer app that imports its design system's
   * CSS has that CSS read by nothing — and then measures as though it declared no
   * tokens at all. The tokens are real and in the package; the audit cannot see them.
   * Naming the import is the honest result: resolving into a dependency would audit
   * someone else's source and attribute it to this one.
   */
  importedPackageStyles?: { count: number; samples: string[] };
  /** rules that returned nothing because they could not judge, not because it was clean */
  couldNotJudge: string[];
  /** Recognised keyword components, including those in mixed declarations. */
  excludedKeywords?: { count: number; samples: string[] };
  unclassifiedDeclarations?: { count: number; samples: string[] };
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
    .filter(
      (f) =>
        !adapters.some(
          (a) =>
            a.extensions.includes('.json') &&
            a.detect({ root: f, label: 'coverage', fixtureSha: 'coverage' }),
        ),
    )
    .map((f) => relative(root, f) || f);

  // `import '@acme/ui/styles.css'` — a bare specifier, so it resolves into a package,
  // not into this tree. A relative import is read normally and is not a gap.
  const IMPORTED_STYLE =
    /(?:import\s+|@import\s+|from\s+|require\()\s*['"]((?![./])[^'"]+\.(?:css|scss|sass|less))['"]/g;
  // A bare specifier is not proof of a package. Measured on PostHog, which imports
  // `~/scenes/…/DashboardItems.scss` and `lib/components/…/CardMeta.scss` through build
  // aliases: both resolve inside this tree, are read normally, and reporting them as
  // unread would have invented a coverage gap where there is none. A specifier counts
  // only when nothing in the tree answers to it.
  const styleFiles = listFiles(root, ['.css', '.scss', '.sass', '.less']).map((f) =>
    relative(root, f).split(sep).join('/'),
  );
  const insideTree = (specifier: string) => {
    const path = specifier.replace(/^~\//, '');
    return styleFiles.some((f) => f === path || f.endsWith(`/${path}`));
  };
  const importedStyles = new Set<string>();
  for (const file of listFiles(root, ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.css', '.scss'])) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(IMPORTED_STYLE)) {
      if (specifier && !insideTree(specifier)) importedStyles.add(specifier);
    }
  }

  const ambiguous = values.filter((v) => v.provenance.classification === 'ambiguous');
  const unconvertible = (v: RawValue) =>
    isUnparsedColorFunction(v.raw) || v.provenance.reason === 'declared colour this version cannot convert';
  const cannotConvert = ambiguous.filter(unconvertible);
  const declarations = ambiguous.filter(
    (v) =>
      v.provenance.tokenName !== null &&
      !unconvertible(v) &&
      /alias|composite|not evaluated|unsupported/.test(v.provenance.reason),
  );
  const roleUndecided = ambiguous.filter(
    (v) => v.provenance.surface !== 'style' && !unconvertible(v) && !declarations.includes(v),
  );
  const unclassifiedStyles = ambiguous.filter(
    (v) => v.provenance.surface === 'style' && !unconvertible(v) && !declarations.includes(v),
  );
  const sample = (vs: typeof ambiguous) => [...new Set(vs.map((v) => v.raw))].slice(0, 4);

  // a rule whose own finding says it could not judge — the tier rules do this
  // explicitly rather than returning nothing and looking like a pass
  const couldNotJudge = [
    ...new Set([...firedRuleIds.filter((id) => id.endsWith('-undetectable')), ...unjudgedRuleIds]),
  ];

  const keywords = values.flatMap((v) => v.excludedKeywords ?? []);
  return {
    ...(keywords.length
      ? {
          excludedKeywords: {
            count: keywords.length,
            samples: [...new Set(keywords.map((k) => k.raw))].slice(0, 4),
          },
        }
      : {}),
    unreadFormats,
    partialReads: adapters.map((a) => ({
      adapter: `${a.id}@${a.version}`,
      extensions: a.extensions,
      reads: a.reads,
    })),
    unreadTokenFiles: tokenFiles,
    ...(importedStyles.size
      ? { importedPackageStyles: { count: importedStyles.size, samples: [...importedStyles].slice(0, 4) } }
      : {}),
    unconvertible: { count: cannotConvert.length, samples: sample(cannotConvert) },
    undecided: { count: roleUndecided.length, samples: sample(roleUndecided) },
    couldNotJudge,
    ...(declarations.length
      ? { unclassifiedDeclarations: { count: declarations.length, samples: sample(declarations) } }
      : {}),
    ...(unclassifiedStyles.length
      ? { unclassifiedStyles: { count: unclassifiedStyles.length, samples: sample(unclassifiedStyles) } }
      : {}),
    // `undecided` does not make an audit incomplete: the tool read the value and
    // converted it. Someone has to decide what it means, which is not a gap.
    complete:
      adapters.length > 0 &&
      Object.keys(unreadFormats).length === 0 &&
      tokenFiles.length === 0 &&
      importedStyles.size === 0 &&
      cannotConvert.length === 0 &&
      declarations.length === 0 &&
      unclassifiedStyles.length === 0 &&
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

  if (c.importedPackageStyles) {
    lines.push(
      `    ${c.importedPackageStyles.count} stylesheet(s) imported from packages, not read: ${c.importedPackageStyles.samples.join(', ')}`,
    );
    lines.push('      their tokens live in the package — this source is not untokenized because of them');
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
    lines.push(
      '      unsupported or malformed token data; token-json reads DTCG and Style Dictionary JSON shapes',
    );
  }

  if (c.excludedKeywords?.count) {
    lines.push(
      `    ${c.excludedKeywords.count} CSS keyword/generic font component(s) recognised and excluded: ${c.excludedKeywords.samples.join(', ')}`,
    );
    lines.push('      not tokenizable literals; excluded from tokenization denominators');
  }

  if (c.unconvertible.count > 0) {
    lines.push(
      `    ${c.unconvertible.count} colour value(s) this version cannot convert: ${c.unconvertible.samples.join(', ')}`,
    );
    lines.push('      excluded from every colour rule — a gap in the engine, not in your code');
  }

  if (c.unclassifiedDeclarations?.count) {
    lines.push(
      `    ${c.unclassifiedDeclarations.count} token declaration(s) unclassified: ${c.unclassifiedDeclarations.samples.join(', ')}`,
    );
    lines.push('      unresolved aliases or unsupported values; inspect source and adapter limits');
  }

  if (c.undecided.count > 0) {
    lines.push(
      `    ${c.undecided.count} low-alpha colour(s) of undecided role: ${c.undecided.samples.join(', ')}`,
    );
    lines.push('      converted fine; whether each is a palette entry or an overlay tint is yours');
  }

  if (c.unclassifiedStyles?.count) {
    lines.push(
      `    ${c.unclassifiedStyles.count} CSS property expression(s) unclassified: ${c.unclassifiedStyles.samples.join(', ')}`,
    );
    lines.push('      excluded from tokenization denominators; inspect in source context');
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

  if (c.documentation) {
    for (const p of c.documentation.packages)
      lines.push(
        `    documentation · ${p.package}: ${p.ratios.documented === null ? 'not checked' : `${(p.ratios.documented * 100).toFixed(1)}% with a story or docs page`}`,
      );
    if (!c.documentation.packages.length)
      lines.push('    documentation: not checked — no workspace component inventory in scope');
    for (const limit of c.documentation.limits) lines.push(`    ${limit}`);
  }
  return lines;
}
