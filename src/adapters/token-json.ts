import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { DsOpsConfig } from '../config/schema.ts';
import { filesInScope } from '../core/files.ts';
import { isKeywordValue, keywordExclusions } from '../core/literals.ts';
import type { RawValue } from '../core/provenance.ts';
import { classifyDeclaration } from './css-custom-props.ts';
import type { Adapter, SourceRef } from './types.ts';

const ID = 'token-json';
const VERSION = '0.2.0';
const EXTS = ['.json'];

type Node = { value: unknown; start: number; end: number; line: number; children: Map<string, Node> };
type Token = { name: string; type: string; node: Node; text: string; file: string };

/** JSON.parse validates grammar; this second walk retains value positions, including duplicate keys.
 * ponytail: composite DTCG values and $extends are retained but not evaluated. A full DTCG
 * resolver is the upgrade path; no object is flattened into invented primitive declarations.
 */
function positioned(text: string): Node {
  JSON.parse(text);
  let at = 0;
  let line = 1;
  const whitespace = () => {
    while (/\s/.test(text[at] ?? '') && at < text.length) {
      if (text[at++] === '\n') line++;
    }
  };
  const string = () => {
    const start = at++;
    while (at < text.length) {
      if (text[at++] === '\\') at++;
      else if (text[at - 1] === '"') break;
    }
    return JSON.parse(text.slice(start, at)) as string;
  };
  const walk = (): Node => {
    whitespace();
    const start = at;
    const startLine = line;
    const children = new Map<string, Node>();
    if (text[at] === '{' || text[at] === '[') {
      const object = text[at++] === '{';
      const close = object ? '}' : ']';
      whitespace();
      let index = 0;
      while (text[at] !== close) {
        const key = object ? string() : String(index++);
        whitespace();
        if (object) at++; // colon, grammar already validated
        children.set(key, walk());
        whitespace();
        if (text[at] !== ',') break;
        at++;
        whitespace();
      }
      at++;
    } else if (text[at] === '"') string();
    else while (at < text.length && !/[\s,}\]]/.test(text[at])) at++;
    return { value: JSON.parse(text.slice(start, at)), start, end: at, line: startLine, children };
  };
  return walk();
}

function tokens(file: string): Token[] {
  try {
    const text = readFileSync(file, 'utf8');
    const out: Token[] = [];
    const walk = (node: Node, path: string[], inherited = '') => {
      if (!node.value || typeof node.value !== 'object' || Array.isArray(node.value)) return;
      const typeNode = node.children.get('$type') ?? node.children.get('type');
      const type = typeof typeNode?.value === 'string' ? typeNode.value : inherited;
      const value = node.children.get('$value') ?? node.children.get('value');
      if (value && path.length) {
        out.push({ name: path.join('.'), type, node: value, text, file });
        return;
      }
      for (const [key, child] of node.children) {
        if (!key.startsWith('$') && !['type', 'description', 'extensions'].includes(key))
          walk(child, [...path, key], type);
      }
    };
    walk(positioned(text), []);
    return out;
  } catch {
    return []; // malformed/non-token JSON remains unread in coverage
  }
}

export const tokenJsonAdapter: Adapter = {
  id: ID,
  version: VERSION,
  extensions: EXTS,
  reads:
    'DTCG $value/$type and Style Dictionary value/type declarations in .json, inherited types and aliases — no theme merging, $extends or composite evaluation; unresolved/cyclic aliases remain ambiguous',
  detect: (source) => filesInScope(source.root, EXTS, source.only).some((file) => tokens(file).length > 0),
  extract(source: SourceRef, config: DsOpsConfig): RawValue[] {
    const all = filesInScope(source.root, EXTS, source.only).flatMap(tokens);
    const index = new Map<string, Token[]>();
    for (const token of all) index.set(token.name, [...(index.get(token.name) ?? []), token]);
    const raw = (t: Token) =>
      typeof t.node.value === 'string' ? t.node.value : t.text.slice(t.node.start, t.node.end);
    const refs = (t: Token) =>
      typeof t.node.value === 'string' ? [...raw(t).matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]) : [];
    const resolves = (name: string, seen: Set<string>): boolean => {
      if (seen.has(name)) return false;
      const matches = index.get(name);
      if (!matches || matches.length !== 1) return false;
      const next = new Set([...seen, name]);
      return refs(matches[0]).every((ref) => resolves(ref, next));
    };
    return all.map((t) => {
      const value = raw(t);
      // Alias syntax belongs to strings, not serialized objects' braces.
      const references = typeof t.node.value === 'string' ? refs(t) : [];
      let result = classifyDeclaration(t.name, value, config.taxonomy);
      if (
        typeof t.node.value === 'object' ||
        (t.type === 'color' && result.classification === 'excluded' && !isKeywordValue(value))
      )
        result = {
          classification: 'ambiguous',
          reason:
            t.type === 'color'
              ? 'declared colour this version cannot convert'
              : 'composite token value is not evaluated',
        };
      if (references.length) {
        const pure = /^\{[^{}]+\}$/.test(value);
        const resolved = references.every((ref) => resolves(ref, new Set([t.name])));
        result = {
          classification: pure && resolved ? 'reference' : 'ambiguous',
          reason: !resolved
            ? 'alias target missing, duplicated or cyclic in this scope'
            : pure
              ? 'token alias reference'
              : 'embedded alias expression is not evaluated',
        };
      }
      return {
        raw: value,
        ...keywordExclusions(value),
        ...(references.length ? { refs: references } : {}),
        provenance: {
          file: relative(source.root, t.file) || t.file,
          line: t.node.line,
          selector: t.name,
          property: t.type || 'value',
          tokenName: t.name,
          surface: null,
          category: null,
          ...result,
          fixtureSha: source.fixtureSha,
          adapterId: ID,
          adapterVersion: VERSION,
        },
      };
    });
  },
};
