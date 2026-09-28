import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { declarations } from '../adapters/css-rule-bodies.ts';
import { DEFAULT_ARCHITECTURE } from '../config/defaults.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { type Tier, classifyTier } from '../rules/tier.ts';
import type { Finding } from '../rules/types.ts';
import { unitlessNumber } from './literals.ts';
import type { RawValue } from './provenance.ts';
import { wholeAlias } from './token-suggestions.ts';

type Evidence = {
  file: string;
  line: number;
  selector: string | null;
  value: string;
  mode: boolean;
  sourceOrder: number | null;
};
export type ArchitectureToken = {
  name: string;
  tier: Tier;
  group: string;
  declarations: Evidence[];
  references: string[];
  aliasTargets: string[];
  aliasDepth: number | null;
  cycle: boolean;
};
export type ArchitectureReference = {
  from: string | null;
  to: string;
  file: string;
  line: number;
  property: string;
  fromGroup: string;
  toGroup: string;
  findings: number[];
};
export type TokenArchitecture = {
  maxAliasDepth: number;
  tokens: ArchitectureToken[];
  groups: {
    id: string;
    lane: string;
    label: string;
    tokens: number;
    declarations: number;
    references: number;
  }[];
  edges: { from: string; to: string; count: number; findings: number[] }[];
  references: ArchitectureReference[];
  health: {
    unreferenced: string[];
    undeclared: string[];
    semanticLiterals: string[];
    deepAliases: string[];
    cycles: string[];
    redeclarations: string[];
  };
  limits: string[];
};

/** Supplemental lexical evidence for already-extracted declarations; no new tokens or cascade claims. */
function selectorEvidence(
  values: RawValue[],
  root?: string,
): Map<RawValue, { selector: string; order: number }> {
  const result = new Map<RawValue, { selector: string; order: number }>();
  if (!root) return result;
  const files = new Map<string, RawValue[]>();
  for (const v of values)
    if (v.provenance.tokenName) {
      const group = files.get(v.provenance.file) ?? [];
      group.push(v);
      files.set(v.provenance.file, group);
    }
  for (const [file, values] of files) {
    try {
      const records = declarations(readFileSync(isAbsolute(file) ? file : join(root, file), 'utf8'), true);
      const byKey = new Map<string, { selector: string; order: number }[]>();
      const key = (name: string, line: number, raw: string) => JSON.stringify([name, line, raw]);
      records.forEach((d, order) => {
        const k = key(d.property, d.line, d.value);
        const list = byKey.get(k) ?? [];
        list.push({ selector: d.selector, order });
        byKey.set(k, list);
      });
      for (const v of values) {
        const match = byKey.get(key(v.provenance.tokenName!, v.provenance.line, v.raw))?.shift();
        if (match) result.set(v, match);
      }
    } catch {
      /* no matched lexical evidence means order remains unresolved */
    }
  }
  return result;
}

/** All relationships are observed var() references; layer labels come only from configured tier patterns. */
export function tokenArchitecture(
  values: RawValue[],
  config: DsOpsConfig,
  findings: Finding[],
  root?: string,
): TokenArchitecture {
  const evidence = selectorEvidence(values, root);
  const byName = new Map<string, ArchitectureToken>();
  const groupId = (name: string, tier: Tier) =>
    `${tier}:${name.replace(/^--/, '').split('-').slice(0, 2).join('-')}`;
  for (const v of values) {
    const name = v.provenance.tokenName;
    if (!name) continue;
    let token = byName.get(name);
    if (!token) {
      const tier = classifyTier(name, config);
      token = {
        name,
        tier,
        group: groupId(name, tier),
        declarations: [],
        references: [],
        aliasTargets: [],
        aliasDepth: 0,
        cycle: false,
      };
      byName.set(name, token);
    }
    const extra = evidence.get(v);
    const selector = extra?.selector ?? v.provenance.selector;
    token.declarations.push({
      file: v.provenance.file,
      line: v.provenance.line,
      value: v.raw,
      selector,
      mode: !!selector && /(?:\.dark(?![\w-])|\[data-(?:[\w-]+-)?theme(?:[\s=\]]))/i.test(selector),
      sourceOrder: extra?.order ?? null,
    });
    for (const ref of v.refs ?? []) if (!token.references.includes(ref)) token.references.push(ref);
    const alias = wholeAlias(v.raw.trim());
    if (alias && !token.aliasTargets.includes(alias)) token.aliasTargets.push(alias);
  }
  // Iterative DFS: cycles and long chains cannot overflow the JS call stack.
  const done = new Set<string>();
  for (const start of byName.keys()) {
    if (done.has(start)) continue;
    const path: { name: string; next: number }[] = [{ name: start, next: 0 }];
    const active = new Map<string, number>([[start, 0]]);
    while (path.length) {
      const frame = path[path.length - 1];
      const token = byName.get(frame.name)!;
      const dep = token.aliasTargets[frame.next++];
      if (dep !== undefined) {
        if (!byName.has(dep)) continue;
        const at = active.get(dep);
        if (at !== undefined) {
          for (let i = at; i < path.length; i++) byName.get(path[i].name)!.cycle = true;
          continue;
        }
        if (!done.has(dep)) {
          active.set(dep, path.length);
          path.push({ name: dep, next: 0 });
        }
      } else {
        const depths = token.aliasTargets.map(
          (name) => byName.get(name)?.aliasDepth ?? (byName.has(name) ? null : 0),
        );
        token.aliasDepth =
          token.cycle || depths.includes(null)
            ? null
            : depths.length
              ? 1 + Math.max(...(depths as number[]))
              : 0;
        done.add(frame.name);
        active.delete(frame.name);
        path.pop();
      }
    }
  }
  const refs: ArchitectureReference[] = [];
  const findingIndex = new Map<string, number[]>();
  findings.forEach((finding, i) => {
    if (!['token/tier-leakage', 'token/upstream-bypass'].includes(finding.ruleId)) return;
    for (const hit of (finding.data?.leaks ?? finding.data?.hits ?? []) as Record<string, unknown>[]) {
      const location = hit.where ?? `${hit.file}:${hit.line}`;
      const k = JSON.stringify([hit.token === '(inline)' ? null : hit.token, hit.target, location]);
      const list = findingIndex.get(k) ?? [];
      list.push(i);
      findingIndex.set(k, list);
    }
  });
  for (const v of values)
    for (const target of v.refs ?? []) {
      const p = v.provenance;
      refs.push({
        from: p.tokenName,
        to: target,
        file: p.file,
        line: p.line,
        property: p.property,
        fromGroup: p.tokenName
          ? byName.get(p.tokenName)!.group
          : `use sites:${p.surface ?? 'unknown'} ${p.category ?? 'unclassified'}`,
        toGroup: byName.get(target)?.group ?? 'unknown:undeclared',
        findings: findingIndex.get(JSON.stringify([p.tokenName, target, `${p.file}:${p.line}`])) ?? [],
      });
    }
  const tokens = [...byName.values()];
  const groups = new Map<string, TokenArchitecture['groups'][number]>();
  for (const t of tokens) {
    const g = groups.get(t.group) ?? {
      id: t.group,
      lane: t.tier,
      label: `--${t.group.slice(t.group.indexOf(':') + 1)}-*`,
      tokens: 0,
      declarations: 0,
      references: 0,
    };
    g.tokens++;
    g.declarations += t.declarations.length;
    groups.set(g.id, g);
  }
  const edges = new Map<string, TokenArchitecture['edges'][number]>();
  for (const r of refs) {
    if (!groups.has(r.fromGroup))
      groups.set(r.fromGroup, {
        id: r.fromGroup,
        lane: 'use sites',
        label: r.fromGroup.slice(10),
        tokens: 0,
        declarations: 0,
        references: 0,
      });
    if (!groups.has(r.toGroup))
      groups.set(r.toGroup, {
        id: r.toGroup,
        lane: 'unknown',
        label: 'Referenced but not declared',
        tokens: 0,
        declarations: 0,
        references: 0,
      });
    groups.get(r.fromGroup)!.references++;
    const key = JSON.stringify([r.fromGroup, r.toGroup]);
    const edge = edges.get(key) ?? { from: r.fromGroup, to: r.toGroup, count: 0, findings: [] };
    edge.count++;
    for (const i of r.findings) if (!edge.findings.includes(i)) edge.findings.push(i);
    edges.set(key, edge);
  }
  const referenced = new Set(refs.map((r) => r.to));
  const semanticLiterals = new Set(
    values
      .filter(
        (v) =>
          v.provenance.tokenName &&
          classifyTier(v.provenance.tokenName, config) === 'semantic' &&
          (['color', 'dimension', 'style-literal', 'mixed', 'shadow-internal'].includes(
            v.provenance.classification,
          ) ||
            unitlessNumber(v.raw) !== null),
      )
      .map((v) => v.provenance.tokenName!),
  );
  const maxAliasDepth = config.architecture?.maxAliasDepth ?? DEFAULT_ARCHITECTURE.maxAliasDepth;
  return {
    maxAliasDepth,
    tokens,
    groups: [...groups.values()],
    edges: [...edges.values()],
    references: refs,
    health: {
      unreferenced: tokens.filter((t) => !referenced.has(t.name)).map((t) => t.name),
      undeclared: [...referenced].filter((name) => !byName.has(name)),
      semanticLiterals: [...semanticLiterals],
      deepAliases: tokens
        .filter((t) => t.aliasDepth !== null && t.aliasDepth > maxAliasDepth)
        .map((t) => t.name),
      cycles: tokens.filter((t) => t.cycle).map((t) => t.name),
      redeclarations: tokens
        .filter((t) => t.declarations.length > 1 && t.declarations.some((d) => d.mode))
        .map((t) => t.name),
    },
    limits: [
      'Counts cover extracted declarations and references in the audited scope, before exceptions and severity filtering. Read-only tokenContexts dependencies are outside this architecture view. Unreferenced does not mean unused elsewhere; undeclared names may exist in dependencies.',
      'Namespaces group the first two hyphen-separated name segments; they do not establish ownership. Reference arrows point from consumer to referenced token, including fallback references.',
      'Source order is known only for matched lexical declarations within one file. Cross-file import order, specificity, inheritance, conditions, cascade layers and runtime overrides are not resolved. No computed winner is asserted.',
      'Selector evidence supplements already-extracted declarations using the CSS lexer; unmatched declarations retain legacy selector text and unknown order. No missing tokens are reconstructed.',
      'Alias depth counts whole-value var() chains across all declarations, not a resolved mode. Cycles and chains entering cycles have unresolved depth.',
      'Highlighted edges link only to recorded findings in this report. Filtered findings and capped rule samples may leave other problematic edges unhighlighted.',
    ],
  };
}
