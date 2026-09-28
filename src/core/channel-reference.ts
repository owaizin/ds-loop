import type { ValueClassification } from './provenance.ts';

/**
 * Recognize channel-token colour functions without resolving token values.
 * A literal alpha modulates token channels; literal colour channels are mixed.
 * ponytail: bounded syntax only; calc/relative colours need a CSS value parser.
 * null means this is not a supported colour-function/reference candidate.
 */
export function channelReference(value: string): ValueClassification | null {
  const text = value
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\s*!important\s*$/i, '')
    .trim();
  if (!/^(?:rgba?|hsla?)\(/i.test(text) || !/var\(/i.test(text)) return null;
  let masked = '';
  for (let i = 0; i < text.length; ) {
    if (/^var\(/i.test(text.slice(i))) {
      const start = i + 4;
      let depth = 1;
      i = start;
      for (; i < text.length && depth; i++) {
        if (text[i] === '(') depth++;
        if (text[i] === ')') depth--;
      }
      if (depth || !/^\s*--[\w-]+\s*(?:,|$)/.test(text.slice(start, i - 1))) return 'ambiguous';
      masked += 'TOKEN';
    } else masked += text[i++];
  }
  const match = masked.match(/^(?:rgba?|hsla?)\(([^()]*)\)$/i);
  if (!match) return 'ambiguous';
  const parts = match[1].split('/');
  if (parts.length > 2) return 'ambiguous';
  const numeric = /^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:%|deg|grad|rad|turn)?$/i;
  if (parts[1] !== undefined && !/^(?:TOKEN|[+-]?(?:\d*\.\d+|\d+\.?\d*)%?)$/.test(parts[1].trim()))
    return 'ambiguous';
  const channels = parts[0].trim();
  if (channels === 'TOKEN') return 'reference';
  const values = channels.split(/\s+/);
  if (values.length === 3 && values.every((v) => v === 'TOKEN' || numeric.test(v))) {
    return values.some((v) => numeric.test(v)) ? 'mixed' : 'reference';
  }
  return 'ambiguous';
}
