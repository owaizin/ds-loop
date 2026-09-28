import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { isUnparsedColorFunction, looksLikeColor } from '../color/convert.ts';
import { channelReference } from '../core/channel-reference.ts';
import { filesInScope } from '../core/files.ts';
import { isLengthLiteral } from '../core/literals.ts';
import type { RawValue, ValueCategory, ValueClassification } from '../core/provenance.ts';
import type { Adapter, SourceRef } from './types.ts';

const ID = 'css-rule-bodies';
const VERSION = '0.2.0';
const EXTS = ['.css'];

/**
 * Bounded lexical extraction, not a CSS cascade evaluator. One value per property
 * occurrence: recipes/shorthands are not split into invented independent values.
 * ponytail: no preprocessor syntax, escaped property names, import resolution or
 * custom-property substitution. A CSS parser is the upgrade path for those forms.
 */
export const cssRuleBodiesAdapter: Adapter = {
  id: ID,
  version: VERSION,
  extensions: EXTS,
  reads:
    'selected ordinary CSS properties and var() references, including nested rules — no cascade/import resolution, inline styles, or preprocessor syntax; unsupported expressions remain ambiguous',
  detect(source: SourceRef): boolean {
    return filesInScope(source.root, EXTS, source.only).some((file) =>
      declarations(readFileSync(file, 'utf8')).some((d) => categoryOf(d.property) !== null),
    );
  },
  extract(source: SourceRef): RawValue[] {
    const out: RawValue[] = [];
    for (const file of filesInScope(source.root, EXTS, source.only)) {
      for (const d of declarations(readFileSync(file, 'utf8'))) {
        const category = categoryOf(d.property);
        if (category === null) continue;
        const value = mask(d.value, true)
          .replace(/\s*!important\s*$/i, '')
          .trim();
        // Keep the original value in raw, including !important. Analyze a masked
        // copy so quoted URLs/content cannot masquerade as literals/references.
        const visible = mask(value, true).replace(/url\([^)]*\)/gi, '');
        const refs = [...visible.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
        const classification = classify(category, visible, refs);
        out.push({
          raw: d.value,
          ...(refs.length ? { refs } : {}),
          provenance: {
            file: relative(source.root, file) || file,
            line: d.line,
            selector: d.selector,
            property: d.property,
            tokenName: null,
            surface: 'style',
            category,
            classification,
            reason:
              classification === 'reference'
                ? 'token references supply the value or colour channels; fallbacks are retained, resolution is not checked'
                : classification === 'mixed'
                  ? 'value contains token references and active literals'
                  : classification === 'ambiguous'
                    ? 'expression not fully classified; no tokenization judgment'
                    : classification === 'excluded'
                      ? 'keyword or resource value, not a tokenizable literal'
                      : 'literal present in an ordinary CSS property; project permission not judged',
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

function categoryOf(property: string): ValueCategory | null {
  if (
    /^(color|background(?:-color)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?-color)$/.test(
      property,
    )
  )
    return 'color';
  if (
    /^(padding|margin)(?:-(?:top|right|bottom|left|block|inline)(?:-start|-end)?)?$/.test(property) ||
    /^(?:row-|column-)?gap$/.test(property)
  )
    return 'spacing';
  if (/^(font-size|font-weight|line-height)$/.test(property)) return 'typography';
  if (
    /^border-(?:(?:top-left|top-right|bottom-left|bottom-right|start-start|start-end|end-start|end-end)-)?radius$/.test(
      property,
    )
  )
    return 'radius';
  if (property === 'box-shadow') return 'shadow';
  if (property === 'z-index') return 'z-index';
  if (/^(transition|animation)(?:-duration)?$/.test(property)) return 'duration';
  return null;
}

const KEYWORDS = /^(?:inherit|initial|unset|revert|revert-layer|none|auto|normal|currentcolor)$/i;
const NUMBER = /(?:^|[\s,(+*/-])(?:\d*\.\d+|\d+)(?:[a-z%]+)?(?=$|[\s,)/+*-])/i;

function classify(category: ValueCategory, text: string, refs: string[]): ValueClassification {
  const value = text.trim();
  if (!value || KEYWORDS.test(value)) return 'excluded';
  const channel = channelReference(value);
  if (channel !== null) return channel;
  const remainder = removeVars(value).trim();
  if (refs.length && /^[\s,\/]*$/.test(remainder)) return 'reference';
  // Do not interpret arguments of env()/attr()/unknown functions as literals.
  // var() fallbacks have been removed in full; they are not active literals.
  const functions = [...remainder.matchAll(/([\w-]+)\s*\(/g)].map((m) => m[1].toLowerCase());
  const known =
    /^(?:calc|min|max|clamp|rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|(?:repeating-)?(?:linear|radial|conic)-gradient)$/;
  if (
    functions.some(
      (f) => !known.test(f) && !(category === 'duration' && /^(?:cubic-bezier|steps|linear)$/.test(f)),
    )
  )
    return 'ambiguous';
  // Iteration counts, timing-function arguments and digits in names are not durations.
  if (category === 'duration') {
    const hasTime = /(?:^|[\s,(])(?:\d*\.\d+|\d+)(?:ms|s)(?=$|[\s,)])/i.test(remainder);
    if (refs.length) return hasTime ? 'mixed' : 'ambiguous';
    return hasTime ? 'style-literal' : 'excluded';
  }
  if (refs.length)
    return NUMBER.test(remainder) || /#[\da-f]{3,8}\b/i.test(remainder) ? 'mixed' : 'ambiguous';
  if (category === 'color') {
    if (looksLikeColor(value)) return 'color';
    if (isUnparsedColorFunction(value)) return 'ambiguous';
    if (/^[a-z]+$/i.test(value) || /#|\b(?:rgb|hsl|oklch|gradient|transparent)\b/i.test(value))
      return 'style-literal';
    return 'ambiguous';
  }
  if (isLengthLiteral(value)) return 'dimension';
  if (
    NUMBER.test(value) ||
    /^(?:bold|bolder|lighter|small|medium|large|x-small|x-large|xx-small|xx-large)$/i.test(value)
  )
    return 'style-literal';
  return 'ambiguous';
}

/** Remove entire var() calls, including nested fallbacks, without evaluating them. */
function removeVars(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; ) {
    if (/^var\(/i.test(text.slice(i))) {
      let depth = 1;
      i += 4;
      for (; i < text.length && depth; i++) {
        if (text[i] === '(') depth++;
        if (text[i] === ')') depth--;
      }
      if (depth) return text; // malformed call is not proof of tokenization
      out += ' ';
    } else out += text[i++];
  }
  return out;
}

/** Preserve offsets/newlines while masking comments and optionally strings. */
function mask(text: string, strings: boolean): string {
  return text.replace(/\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g, (part) =>
    part.startsWith('/*') || strings ? part.replace(/[^\r\n]/g, ' ') : part,
  );
}

type Declaration = { property: string; value: string; selector: string; line: number };

export function declarations(text: string, includeTokens = false): Declaration[] {
  const clean = mask(text, false);
  const syntax = mask(text, true);
  const stack: string[] = [];
  const out: Declaration[] = [];
  let start = 0;
  let parens = 0;
  let brackets = 0;
  let line = 1;
  let startLine = 1;
  const emit = (end: number) => {
    // Declaration at-rules such as @font-face/@property aren't ordinary rules.
    const selector = stack.findLast((head) => !head.startsWith('@'));
    if (
      !selector ||
      stack.some((head) => /^@(font-face|property|page|counter-style|font-palette-values)\b/i.test(head))
    )
      return;
    const segment = clean.slice(start, end);
    const match = segment.match(
      includeTokens
        ? /^\s*(--[\w-]+|[a-z][a-z-]*)\s*:\s*([\s\S]+?)\s*$/i
        : /^\s*([a-z][a-z-]*)\s*:\s*([\s\S]+?)\s*$/i,
    );
    if (!match) return;
    const offset = segment.search(/\S/);
    out.push({
      property: match[1].startsWith('--') ? match[1] : match[1].toLowerCase(),
      value: text.slice(start + segment.indexOf(':') + 1, end).trim(),
      selector: stack.join(' > '),
      line: startLine + (segment.slice(0, offset).match(/\n/g)?.length ?? 0),
    });
  };
  for (let i = 0; i < syntax.length; i++) {
    const char = syntax[i];
    if (char === '\\') {
      if (syntax[i + 1] === '\n') line++;
      i++;
      continue;
    }
    if (char === '\n') line++;
    if (char === '(') parens++;
    if (char === ')') parens = Math.max(0, parens - 1);
    if (char === '[') brackets++;
    if (char === ']') brackets = Math.max(0, brackets - 1);
    if (parens || brackets) continue;
    if (char === '{') stack.push(clean.slice(start, i).trim());
    else if (char === ';') emit(i);
    else if (char === '}') {
      emit(i);
      stack.pop();
    } else continue;
    start = i + 1;
    startLine = line;
  }
  return out;
}
