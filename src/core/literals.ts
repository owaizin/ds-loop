/**
 * Value-shape tests shared by every adapter. An adapter decides *classification*
 * from a value's shape plus naming context; the shape half lives here so two
 * adapters can never disagree about what counts as a length literal.
 */

// A raw length, or a 2–4 part shorthand of them. A bare number is deliberately
// excluded: unitless is too ambiguous (z-index, font-weight, opacity, a bezier
// control point) to treat as a design dimension.
// ponytail: fixed unit set, not the full CSS length grammar. Add units when a
// real source uses them (ch, cqw, dvh) rather than guessing now.
const LENGTH = /^-?\d*\.?\d+(px|rem|em|vh|vw)(\s+-?\d*\.?\d+(px|rem|em|vh|vw)){0,3}$/;

export function isLengthLiteral(value: string): boolean {
  return LENGTH.test(value.trim());
}

/** CSS number, not a dimension or a channel tuple. */
export function unitlessNumber(value: string): number | null {
  const text = value
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s*!important\s*$/i, '')
    .trim();
  if (!/^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/** CSS-wide and property keywords that do not represent design choices. */
const STYLE_KEYWORDS = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'none',
  'auto',
  'normal',
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

export type ExcludedKeyword = { raw: string; classification: 'excluded'; reason: string };

/** Inspect top-level components only: quoted family names and function arguments
 * (including var fallbacks) are not keywords. Preserve the declaration as one
 * occurrence; component exclusions must not inflate tokenization denominators.
 * ponytail: bounded CSS lexical scan, not a grammar validator.
 */
export function keywordParts(text: string): { remainder: string; excluded: ExcludedKeyword[] } {
  const excluded: ExcludedKeyword[] = [];
  let depth = 0;
  const remainder = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s*!(?:important|default|global)\b/gi, '')
    .replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[\w-]+|[()]/g, (part, offset, source) => {
      if (part === '(') depth++;
      if (part === ')') depth--;
      if (depth !== 0 || !STYLE_KEYWORDS.has(part.toLowerCase()) || source[offset + part.length] === '(')
        return part;
      excluded.push({
        raw: part,
        classification: 'excluded',
        reason: 'CSS keyword or generic font family; not a tokenizable literal',
      });
      return ' ';
    });
  return { remainder, excluded };
}

export function keywordExclusions(value: string): { excludedKeywords?: ExcludedKeyword[] } {
  const { excluded } = keywordParts(value);
  return excluded.length ? { excludedKeywords: excluded } : {};
}

export function isKeywordValue(value: string): boolean {
  const { remainder, excluded } = keywordParts(value);
  return excluded.length > 0 && /^[\s,]*$/.test(remainder);
}
