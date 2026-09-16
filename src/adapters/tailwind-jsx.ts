import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { alphaOf, isUnparsedColorFunction, looksLikeColor } from '../color/convert.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { filesInScope } from '../core/files.ts';
import { isLengthLiteral } from '../core/literals.ts';
import type { RawValue, ValueClassification } from '../core/provenance.ts';
import type { Adapter, SourceRef } from './types.ts';

const ID = 'tailwind-jsx';
// 0.2.0: geometry utilities no longer count as scale bypasses, derived output
// (dist/, storybook-static/, …) is no longer read, unconvertible colour
// functions surface as ambiguous. Counts from 0.1.0 are not comparable.
const VERSION = '0.2.0';
const EXTS = ['.jsx', '.tsx', '.js', '.ts', '.mjs'];

/**
 * Extracts Tailwind *arbitrary values* — `bg-[#1da1f2]`, `p-[13px]`,
 * `hover:text-[14px]` — from JS/TS sources.
 *
 * Arbitrary values are the whole point: a utility naming a scale step (`p-4`,
 * `bg-slate-900`) is inside the system by construction, while a bracket is the
 * author stepping outside it with a literal. That is the exact shape a coding
 * agent produces when it cannot find the right token, which makes this the
 * adapter the "AI slop" audit needs.
 *
 * Reads STRING LITERALS rather than JSX attributes, so `className="..."`,
 * `cn("...", "...")`, `clsx`, `cva` and tagged templates all work without a
 * parser, and code identifiers can never be mistaken for classes.
 *
 * ponytail: line-scoped regex, no JSX/TS parser. Ceilings, in the order they
 * are likely to matter: a class string broken across lines mid-token is missed;
 * a nested `]` inside an arbitrary value truncates it; arbitrary *properties*
 * (`[mask-image:url(x)]`, no utility prefix) are skipped; inline
 * `style={{ color: '#fff' }}` is not read — a different shape, add it when an
 * engagement shows it carries the drift.
 */
export const tailwindJsxAdapter: Adapter = {
  id: ID,
  version: VERSION,
  extensions: EXTS,
  reads: 'Tailwind arbitrary values inside string literals — not inline style objects, not CSS-in-JS',

  detect(source: SourceRef): boolean {
    return filesInScope(source.root, EXTS, source.only).some((f) =>
      classTokens(readFileSync(f, 'utf8')).some((t) => parseArbitrary(t.token) !== null),
    );
  },

  extract(source: SourceRef, config: DsOpsConfig): RawValue[] {
    const out: RawValue[] = [];
    for (const file of filesInScope(source.root, EXTS, source.only)) {
      const rel = relative(source.root, file) || file;
      for (const { token, line } of classTokens(readFileSync(file, 'utf8'))) {
        const parsed = parseArbitrary(token);
        if (!parsed) continue;
        const { variants, util, value } = parsed;

        const refs = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]!);
        const { classification, reason } = classify(util, value, refs, config.taxonomy);
        if (classification === 'excluded') continue;

        out.push({
          raw: value,
          ...(refs.length > 0 ? { refs } : {}),
          provenance: {
            file: rel,
            line,
            // a variant chain IS the condition the value applies under — the
            // same role `selector` plays for a CSS declaration.
            selector: variants.length > 0 ? variants.join(':') : null,
            property: util,
            // a utility has no token name: this is a use site, not a
            // declaration. Rules key on that to tell "the system declares a
            // literal" apart from "a component hardcoded one".
            tokenName: null,
            classification,
            reason,
            fixtureSha: source.fixtureSha,
            adapterId: ID,
            adapterVersion: VERSION,
          },
        });
      }
    }
    return out;
  },
};

type Taxonomy = DsOpsConfig['taxonomy'];

// a single-, double- or backtick-quoted run on one line, escapes honoured
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\r\n])*)\1/g;

// data-type hints Tailwind allows in front of an arbitrary value: text-[color:var(--x)]
const TYPE_HINT = /^(color|length|number|percentage|angle|url|image|family-name|line-width|position|size):/;

/** every whitespace-separated token of every string literal, with its 1-indexed line */
function classTokens(text: string): { token: string; line: number }[] {
  const out: { token: string; line: number }[] = [];
  const lines = text.split('\n');
  for (let li = 0; li < lines.length; li++) {
    STRING_LITERAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec loop
    while ((m = STRING_LITERAL.exec(lines[li]!)) !== null) {
      for (const token of m[2]!.split(/\s+/)) {
        if (token.includes('-[')) out.push({ token, line: li + 1 });
      }
    }
  }
  return out;
}

/**
 * `dark:hover:bg-[#fff]/50` -> variants [dark, hover], util `bg`, value `#fff`.
 * Returns null for anything that is not a utility with an arbitrary value.
 */
export function parseArbitrary(token: string): { variants: string[]; util: string; value: string } | null {
  const open = token.indexOf('-[');
  const close = token.lastIndexOf(']');
  if (open === -1 || close < open) return null;

  const parts = token.slice(0, open).split(':');
  const util = parts.pop() ?? '';
  // a real utility name, not a stray `foo-[i]` in ordinary code
  if (!/^-?[a-z][a-z0-9-]*$/.test(util)) return null;

  const value = spacesForUnderscores(token.slice(open + 2, close))
    .replace(TYPE_HINT, '')
    .trim();
  if (value === '') return null;
  return { variants: parts, util, value };
}

/** in Tailwind an underscore stands for a space, and an escaped one for itself */
function spacesForUnderscores(value: string): string {
  const ESCAPED = '\u0000';
  return value.replace(/\\_/g, ESCAPED).replace(/_/g, ' ').replaceAll(ESCAPED, '_');
}

function classify(
  util: string,
  value: string,
  refs: string[],
  taxonomy: Taxonomy,
): { classification: ValueClassification; reason: string } {
  if (refs.length > 0) {
    return {
      classification: 'reference',
      reason: `arbitrary value references ${refs.length} token(s): ${refs.join(', ')}`,
    };
  }
  const shadowUtil = taxonomy.shadowTokenHints.some((h) => util.includes(h));

  if (looksLikeColor(value)) {
    // shadow-[...] / ring-[...] colours are part of an elevation recipe, not
    // palette entries — the carve-out the CSS adapter makes by token name.
    if (shadowUtil) {
      return { classification: 'shadow-internal', reason: `utility ${util} matches a shadow hint` };
    }
    const a = alphaOf(value);
    if (a <= taxonomy.shadowAlphaCeiling) {
      return {
        classification: 'ambiguous',
        reason: `alpha ${a} <= ceiling ${taxonomy.shadowAlphaCeiling}: likely an overlay tint, but utility ${util} does not confirm it`,
      };
    }
    return { classification: 'color', reason: `hardcoded colour on utility ${util}` };
  }

  if (isUnparsedColorFunction(value)) {
    return {
      classification: 'ambiguous',
      reason: `colour function this version cannot convert on utility ${util} — review by hand`,
    };
  }

  if (isLengthLiteral(value)) {
    if (shadowUtil) return { classification: 'shadow-internal', reason: 'shadow recipe part' };
    // a length only bypasses the system on a utility that reads off a scale;
    // `w-[300px]` or `top-[-4px]` is geometry, which is what an arbitrary value is for
    if (!taxonomy.scaleUtilities.includes(util)) {
      return {
        classification: 'excluded',
        reason: `utility ${util} is geometry, not a scale — a one-off length here is not drift`,
      };
    }
    return { classification: 'dimension', reason: `hardcoded length on utility ${util}` };
  }

  return { classification: 'excluded', reason: 'arbitrary value is neither a colour nor a length' };
}
