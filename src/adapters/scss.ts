import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { filesInScope } from '../core/files.ts';
import { isKeywordValue, keywordExclusions } from '../core/literals.ts';
import type { RawValue } from '../core/provenance.ts';
import { classifyDeclaration } from './css-custom-props.ts';
import { categoryOf, classifyStyle } from './css-rule-bodies.ts';
import type { Adapter } from './types.ts';

const ID = 'scss';
const VERSION = '0.2.0';
const EXTS = ['.scss', '.sass'];
type Statement = { head: string; selector: string | null; line: number };

/** Preserve strings but mask comments, including Sass // comments. */
function clean(text: string): string {
  return text.replace(
    /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*/g,
    (part) => (part.startsWith('/') ? part.replace(/[^\n\r]/g, ' ') : part),
  );
}

/** ponytail: bounded lexical/regex reader, not a Sass parser. No evaluation of imports,
 * interpolation, maps, mixins, functions, control flow or selector expansion. A real Sass
 * parser and module resolver are the upgrade path. Conditional context is kept in selector.
 */
function statements(text: string, indented: boolean): Statement[] {
  const visible = clean(text);
  const syntax = visible.replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|#\{[^}]*\}/g, (part) =>
    part.replace(/[^\n\r]/g, '_'),
  );
  const out: Statement[] = [];
  const stack: { head: string; indent: number }[] = [];
  let start = 0;
  let line = 1;
  let startLine = 1;
  let depth = 0;
  const emit = (end: number, block: boolean) => {
    const segment = visible.slice(start, end);
    const head = segment.trim();
    if (!head) return;
    const offset = segment.search(/\S/);
    const row = startLine + (segment.slice(0, offset).match(/\n/g)?.length ?? 0);
    const indent = segment.slice(0, offset).split('\n').at(-1)!.replaceAll('\t', '  ').length;
    if (indented) while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
    const declaration = /^(?:\$[\w-]+|--[\w-]+|[a-z][a-z-]*)\s*:\s/.test(head);
    if (
      block ||
      (indented &&
        !declaration &&
        !head.startsWith('@use') &&
        !head.startsWith('@forward') &&
        !head.startsWith('@include') &&
        !head.startsWith('@import'))
    ) {
      stack.push({ head, indent });
      // Keep unevaluated code visible in coverage even if its body has no properties.
      if (/^@(mixin|function|include|extend|each|for|while|if)\b/.test(head))
        out.push({ head, line: row, selector: stack.map((s) => s.head).join(' > ') });
    } else out.push({ head, line: row, selector: stack.map((s) => s.head).join(' > ') || null });
  };
  for (let i = 0; i <= syntax.length; i++) {
    const ch = syntax[i];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (!depth && (i === syntax.length || (indented ? ch === '\n' : /[;{}]/.test(ch ?? '')))) {
      emit(i, ch === '{');
      if (ch === '}') stack.pop();
      start = i + 1;
      startLine = line + (ch === '\n' ? 1 : 0);
    }
    if (ch === '\n') line++;
  }
  return out;
}

/** Replace syntactic Sass references only for the shared CSS value classifier. */
function references(value: string): { text: string; refs: string[] } {
  const refs: string[] = [];
  const text = value.replace(
    /(?:map\.get|map-get)\(\s*((?:[\w-]+\.)?\$[\w-]+)\s*,[^()]*\)|((?:[\w-]+\.)?\$[\w-]+)|var\(\s*(--[\w-]+)/g,
    (all, map, variable, css) => {
      refs.push(map ?? variable ?? css);
      return css ? all : 'var(--sass-reference)';
    },
  );
  return { text, refs };
}

export const scssAdapter: Adapter = {
  id: ID,
  version: VERSION,
  extensions: EXTS,
  reads:
    '.scss and indented .sass variables, CSS custom properties, selected nested rule properties and map.get references; @use/@forward recorded, not resolved — no Sass evaluation, interpolation, mixin/function expansion or CSS-in-JS',
  detect: (source) => filesInScope(source.root, EXTS, source.only).length > 0,
  extract(source, config): RawValue[] {
    const out: RawValue[] = [];
    for (const file of filesInScope(source.root, EXTS, source.only)) {
      for (const s of statements(readFileSync(file, 'utf8'), extname(file).toLowerCase() === '.sass')) {
        const directive = s.head.match(/^(@[\w-]+)\b\s*([\s\S]*)/);
        const declaration = s.head.match(/^(\$[\w-]+|--[\w-]+|[a-z][a-z-]*)\s*:\s*([\s\S]+)$/);
        if (!directive && !declaration) continue;
        const property = (directive ?? declaration)![1];
        const raw = (directive ?? declaration)![2].trim();
        const tokenName = /^[\$]|^--/.test(property) ? property : null;
        if (
          !tokenName &&
          !directive &&
          /(?:^| > )@(font-face|property|page|counter-style|font-palette-values)\b/.test(s.selector ?? '')
        )
          continue;
        const category = tokenName ? null : categoryOf(property);
        if (!directive && !tokenName && category === null) continue;
        const value = raw.replace(/\s*!(?:default|global|important)\b/g, '').trim();
        const visible =
          category === 'typography' ? value : value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
        const { text, refs } = references(visible);
        let result = tokenName
          ? classifyDeclaration(tokenName, value, config.taxonomy)
          : {
              classification: category
                ? classifyStyle(category, text, refs, property)
                : ('ambiguous' as const),
              reason: isKeywordValue(value)
                ? 'CSS keyword or generic font family; not a tokenizable literal'
                : 'ordinary Sass property; references recorded without evaluation',
            };
        if (tokenName && refs.length)
          result = {
            classification: classifyStyle('color', text, refs),
            reason: 'Sass token references; expressions are not evaluated',
          };
        if (
          directive ||
          /#\{|\$.*[+*/]|[+*/].*\$/.test(value) ||
          /^\(/.test(value) ||
          /@(mixin|function)\b/.test(s.selector ?? '')
        )
          result = {
            classification: 'ambiguous',
            reason: directive
              ? 'Sass directive recorded, not evaluated or resolved'
              : 'unsupported Sass expression or unevaluated body',
          };
        // Unknown functions may return colours or dimensions: do not silently exclude them.
        if (tokenName && result.classification === 'excluded' && /[\w.-]+\(/.test(visible))
          result = { classification: 'ambiguous', reason: 'unsupported Sass function is not evaluated' };
        out.push({
          // !default/!global are assignment modifiers, not part of the token value.
          raw: tokenName ? raw.replace(/\s*!(?:default|global)\b/g, '').trim() : raw,
          ...keywordExclusions(value),
          ...(refs.length ? { refs } : {}),
          provenance: {
            file: relative(source.root, file) || file,
            line: s.line,
            selector: s.selector,
            property,
            tokenName,
            surface: tokenName ? null : 'style',
            category,
            ...result,
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
