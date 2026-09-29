import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { codeMask } from '../core/component-usage.ts';
import { analyseConsumers, findWorkspace } from '../core/consumers.ts';
import { listFiles } from '../core/files.ts';
import type { Rule } from './types.ts';

export const DOCS_VERSION = '0.1.0';
type Evidence = { file: string; line: number };
export type DocumentedComponent = Evidence & {
  name: string;
  story: Evidence[];
  docs: Evidence[];
  types: Evidence[];
  example: Evidence[];
};
type Category = 'documented' | 'story' | 'docs' | 'types' | 'example';
export type DocumentationCoverage = {
  version: string;
  status: 'checked' | 'not-checked';
  packages: {
    package: string;
    status: 'checked' | 'not-checked';
    components: DocumentedComponent[];
    ratios: Record<Category, number | null>;
  }[];
  limits: string[];
};

/**
 * ponytail: exported PascalCase declarations with JSX in their declaration slice.
 * This does not resolve package entrypoints, barrel/re-export chains, HOCs without
 * JSX, generated docs or remote documentation. Upgrade path: parser + export graph.
 */
export function documentationCoverage(root: string, scoped = false): DocumentationCoverage {
  const workspace = findWorkspace(root);
  if (!workspace.packages.length && existsSync(join(root, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      if (typeof pkg.name === 'string' && pkg.exports)
        workspace.packages.push({ name: pkg.name, dir: '.', platform: 'unknown', exports: ['.'] });
    } catch {
      /* Invalid metadata cannot establish a shared package. */
    }
  }
  const consumed = new Set(
    scoped ? [] : analyseConsumers(root).consumers.flatMap((c) => c.uses.map((u) => u.target)),
  );
  const packages: DocumentationCoverage['packages'] = [];
  for (const pkg of scoped
    ? []
    : workspace.packages.filter((p) => p.exports.length || consumed.has(p.name))) {
    let unreadable = false;
    const files = listFiles(join(root, pkg.dir), ['.tsx', '.jsx', '.ts', '.js', '.md', '.mdx'], () => {
      unreadable = true;
    }).filter(
      (f) =>
        !workspace.packages.some(
          (p) => p !== pkg && p.dir.startsWith(`${pkg.dir}/`) && relative(root, f).startsWith(`${p.dir}/`),
        ),
    );
    const contents = new Map<string, string>();
    for (const file of files) {
      try {
        contents.set(file, readFileSync(file, 'utf8'));
      } catch {
        unreadable = true;
      }
    }
    const storyFiles = files.filter((f) => /\.(stories|story)\.[jt]sx?$/.test(f));
    const docFiles = files.filter((f) => /\.mdx?$/.test(f));
    let convention =
      storyFiles.length > 0 ||
      docFiles.some((f) => f.endsWith('.mdx') || /\.docs?\.md$/.test(f)) ||
      existsSync(join(root, '.storybook')) ||
      existsSync(join(root, pkg.dir, '.storybook'));
    const components: DocumentedComponent[] = [];
    const location = (f: string, offset = 0): Evidence => ({
      file: relative(root, f).replaceAll('\\', '/'),
      line: (contents.get(f)?.slice(0, offset).match(/\n/g)?.length ?? 0) + 1,
    });
    for (const file of files.filter(
      (f) => /\.(?:tsx|jsx|js)$/.test(f) && !/\.(stories|story|test|spec)\./.test(f),
    )) {
      const text = contents.get(file) ?? '';
      const code = codeMask(text);
      const declarations = [
        ...code.matchAll(
          /\b(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g,
        ),
      ];
      const exported = new Set(
        [...code.matchAll(/\bexport\s*\{([^}]+)\}(?!\s*from)/g)].flatMap((m) =>
          m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]),
        ),
      );
      for (const [i, m] of declarations.entries()) {
        if (!/^[A-Z]/.test(m[1]) || (!m[0].startsWith('export') && !exported.has(m[1]))) continue;
        const slice = code.slice(m.index, declarations[i + 1]?.index ?? code.length);
        if (!/<(?:[A-Za-z][\w.:-]*[\s/>]|>)/.test(slice)) continue;
        const name = m[1];
        const stem = basename(file).replace(/\.[^.]+$/, '');
        const adjacent = (f: string) =>
          dirname(f) === dirname(file) &&
          (basename(f).toLowerCase().startsWith(`${stem.toLowerCase()}.`) ||
            basename(f).toLowerCase().startsWith(`${name.toLowerCase()}.`) ||
            (basename(dirname(file)).toLowerCase() === name.toLowerCase() &&
              /^readme\.md$/i.test(basename(f))));
        const story = storyFiles.filter(adjacent).map((f) => location(f));
        const docs = docFiles.filter(adjacent).map((f) => location(f));
        const prop = code.match(new RegExp(`\\b(?:interface|type)\\s+${name}Props\\b`));
        const types = prop
          ? [location(file, prop.index)]
          : docs.flatMap((e) => {
              const f = join(root, e.file);
              const match = contents
                .get(f)
                ?.match(/<(?:ArgsTable|ArgTypes|PropsTable)\b|\|\s*(?:Prop|Property|Name)\s*\|/i);
              return match ? [location(f, match.index)] : [];
            });
        const example = [...story, ...docs].flatMap((e) => {
          const f = join(root, e.file);
          const content = contents.get(f) ?? '';
          const hit = content.match(new RegExp(`<${name}(?:\\s|/|>)`));
          return hit ? [location(f, hit.index)] : [];
        });
        components.push({ name, ...location(file, m.index), story, docs, types, example });
      }
    }
    convention ||= components.some((c) => c.docs.length > 0 || c.story.length > 0);
    const checked = convention && components.length > 0 && !unreadable;
    const ratio = (category: Category) =>
      checked
        ? components.filter((c) =>
            category === 'documented' ? c.story.length || c.docs.length : c[category].length,
          ).length / components.length
        : null;
    packages.push({
      package: pkg.name,
      status: checked ? 'checked' : 'not-checked',
      components,
      ratios: {
        documented: ratio('documented'),
        story: ratio('story'),
        docs: ratio('docs'),
        types: ratio('types'),
        example: ratio('example'),
      },
    });
  }
  return {
    version: DOCS_VERSION,
    status: packages.some((p) => p.status === 'checked') ? 'checked' : 'not-checked',
    packages,
    limits: [
      'Documentation presence only, not quality: exported PascalCase JSX declarations in shared workspace or standalone packages; package entrypoints, re-export chains, HOCs without JSX, remote and generated docs are not resolved.',
      'Stories and docs are matched by adjacent component/source basename. Types recognize ComponentNameProps declarations or prop-table markers in matched docs; examples recognize literal component JSX in matched stories/docs. Prop tables, inferred types and differently named pages may be missed.',
      'Ratios use detected components in each package. Documented means a matched story or docs page. Without a local documentation convention, a denominator, or on a file-filtered scan: not checked, never 0% documented.',
    ],
  };
}

/** Carbon requires component usage, style, code and accessibility documentation:
 * https://carbondesignsystem.com/contributing/get-started/overview/#website-documentation
 * This narrower check establishes local presence only; it does not enforce Carbon's full checklist.
 */
export const undocumentedSharedComponentRule: Rule = {
  id: 'docs/undocumented-shared-component',
  title: 'Shared component documentation',
  impact: 'Consumers lack a locally discoverable story or usage page for this exported component.',
  targets: ['docs'],
  run(ctx) {
    return (ctx.documentation?.packages ?? [])
      .filter((p) => p.status === 'checked')
      .flatMap((p) =>
        p.components
          .filter((c) => !c.story.length && !c.docs.length)
          .map((c) => ({
            ruleId: 'docs/undocumented-shared-component',
            severity: 'low' as const,
            summary: `No adjacent story or docs page found for ${c.name}`,
            where: `${c.file}:${c.line}`,
            fix: 'Check the team’s documentation home, then add or link a usage page or story.',
            data: { package: p.package, component: c.name, documentedRatio: p.ratios.documented },
          })),
      );
  },
};
