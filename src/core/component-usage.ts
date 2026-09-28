import { dirname, posix } from 'node:path';

export type ComponentOrigin = 'shared' | 'local' | 'external' | 'unresolved';
export type ComponentUse = {
  file: string;
  line: number;
  element: string;
  component: string;
  origin: ComponentOrigin;
  specifier: string | null;
  target: string | null;
  subpath: string | null;
};
export type UsageSummary = {
  shared: { elements: number; distinctComponents: number };
  local: { elements: number; distinctComponents: number };
  external: { elements: number; distinctComponents: number };
  unresolved: { elements: number; distinctComponents: number };
  sharedComponentShare: number | null;
  sharedSubpaths: {
    target: string;
    subpath: string;
    elements: number;
    distinctComponents: number;
    shareOfSharedAndLocal: number;
  }[];
  hits: ComponentUse[];
};

/** Offset-preserving lexical mask; do not count examples inside comments or quoted strings.
 * ponytail: template interpolations, regex literals, aliased re-export chains,
 * lexical shadowing, dynamic components and components passed as props need a parser.
 * JSX occurrences are source syntax, not measured runtime renders or adoption quality.
 */
function codeMask(text: string): string {
  return text.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (s) => s.replace(/[^\n]/g, ' '),
  );
}

export function componentUses(
  text: string,
  file: string,
  pkg: string,
  workspace: string[],
  scope?: string,
  dependencies: string[] = [],
  aliases: string[] = [],
): ComponentUse[] {
  const code = codeMask(text);
  const bindings = new Map<string, { specifier: string; imported: string }>();
  // Components declared in this file are the app's own. ponytail: top-level
  // declarations only by name; a shadowing inner declaration needs a parser.
  const declared = new Set(
    [...code.matchAll(/\b(?:function|class|const|let|var)\s+([A-Z][\w$]*)/g)].map((m) => m[1]),
  );
  const imports = /\bimport\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of text.matchAll(imports)) {
    if (m[1] || code.slice(m.index, m.index + 6) !== 'import') continue;
    const clause = m[2];
    const specifier = m[3];
    const head = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (head) bindings.set(head[1], { specifier, imported: 'default' });
    const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) bindings.set(ns[1], { specifier, imported: '*' });
    for (const part of (clause.match(/\{([\s\S]*?)\}/)?.[1] ?? '').split(',')) {
      const binding = part.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
      if (binding) bindings.set(binding[2] ?? binding[1], { specifier, imported: binding[1] });
    }
  }
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const lineAt = (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const hits: ComponentUse[] = [];
  for (const m of code.matchAll(
    /<\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(?=[\s/>]|[A-Za-z_$][\w$]*\s*=)/g,
  )) {
    // Adjacent `Props<T>` is a type argument; spaced `a < LIMIT` after an operand is a
    // comparison. JSX after text (`Batch <Input/>`) has no space after `<`, so it stays.
    if (m.index > 0 && /[\w$.]/.test(code[m.index - 1])) continue;
    const before = code.slice(Math.max(0, m.index - 40), m.index).trimEnd();
    if (
      /\s/.test(code[m.index + 1]) &&
      /[\w$.)\]]$/.test(before) &&
      !/\b(?:return|yield|await|default|case)$/.test(before)
    )
      continue;
    const element = m[1];
    const [base, ...members] = element.split('.');
    if (!members.length && !/^[A-Z_$]/.test(base)) continue; // intrinsic HTML/SVG elements
    const binding = bindings.get(base);
    let origin: ComponentOrigin = 'unresolved';
    let target: string | null = null;
    let subpath: string | null = null;
    const specifier = binding?.specifier ?? null;
    let component = `${file}#${element}`;
    if (!binding && declared.has(base)) origin = 'local';
    if (binding) {
      component = `${binding.specifier}#${binding.imported === '*' && members.length ? members.join('.') : binding.imported + (members.length ? `.${members.join('.')}` : '')}`;
      const other = workspace.find((name) => specifier === name || specifier!.startsWith(`${name}/`));
      if (specifier!.startsWith('.') || aliases.some((a) => specifier === a || specifier!.startsWith(a))) {
        origin = 'local';
        component = `${posix.normalize(posix.join(dirname(file), specifier!))}#${binding.imported}${members.length ? `.${members.join('.')}` : ''}`;
      } else if (other === pkg) origin = 'local';
      else if (
        other &&
        (!scope || specifier === scope || specifier!.startsWith(`${scope}/`) || other.startsWith(`${scope}/`))
      ) {
        origin = 'shared';
        target = other;
        subpath = specifier === other ? '.' : `./${specifier!.slice(other.length + 1)}`;
      } else if (
        !other &&
        dependencies.some((name) => specifier === name || specifier!.startsWith(`${name}/`))
      )
        origin = 'external';
    }
    hits.push({ file, line: lineAt(m.index!), element, component, origin, specifier, target, subpath });
  }
  return hits;
}

export function summarizeUsage(hits: ComponentUse[]): UsageSummary {
  const count = (origin: ComponentOrigin) => {
    const subset = hits.filter((h) => h.origin === origin);
    return { elements: subset.length, distinctComponents: new Set(subset.map((h) => h.component)).size };
  };
  const shared = count('shared');
  const local = count('local');
  const denominator = shared.elements + local.elements;
  const groups = new Map<string, ComponentUse[]>();
  for (const hit of hits)
    if (hit.origin === 'shared') {
      const key = JSON.stringify([hit.target, hit.subpath]);
      const list = groups.get(key) ?? [];
      list.push(hit);
      groups.set(key, list);
    }
  return {
    shared,
    local,
    external: count('external'),
    unresolved: count('unresolved'),
    sharedComponentShare: denominator ? shared.elements / denominator : null,
    sharedSubpaths: [...groups.values()]
      .map((list) => ({
        target: list[0].target!,
        subpath: list[0].subpath!,
        elements: list.length,
        distinctComponents: new Set(list.map((h) => h.component)).size,
        shareOfSharedAndLocal: list.length / denominator,
      }))
      .sort((a, b) => a.target.localeCompare(b.target) || a.subpath.localeCompare(b.subpath)),
    hits,
  };
}
