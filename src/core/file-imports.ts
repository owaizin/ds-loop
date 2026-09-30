import { existsSync, readFileSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { findWorkspace, importSpecifiers } from './consumers.ts';
import { listFiles } from './files.ts';

export const FILE_IMPORTS_VERSION = '1.0.0';
export type ImportBasis = { file: string; line: number; specifier: string };
export type FileReach = {
  state: 'reached' | 'no-static-importer' | 'unresolved';
  basis: string;
  importers: ImportBasis[];
};
export type FileImports = {
  version: string;
  files: Record<string, FileReach>;
  configIssues: string[];
  unresolved: (ImportBasis & { reason: string })[];
  limits: string[];
};
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.css', '.scss', '.json'];
const script = /\.[cm]?[jt]sx?$/;

type Settings = { base: string; paths: Record<string, string[]>; incomplete: boolean };

/** JSONC without evaluating config code. Comments in quoted paths remain intact. */
function json(file: string): {
  extends?: string;
  compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
  exports?: Record<string, unknown> | string;
  source?: string;
  module?: string;
  main?: string;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
} {
  const text = readFileSync(file, 'utf8').replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (part) =>
    part.startsWith('"') ? part : ' ',
  );
  return JSON.parse(text.replace(/,\s*([}\]])/g, '$1'));
}

/** File resolution extends the shared consumers lexer; it is not a second import parser. */
export function analyseFileImports(target: string, extraFiles: string[] = []): FileImports {
  target = resolve(target);
  const single = statSync(target).isFile();
  const root = single ? dirname(target) : target;
  let incomplete = single;
  const files = single
    ? [target]
    : listFiles(root, extensions, () => {
        incomplete = true;
      });
  const known = new Set(files.map((f) => resolve(f)));
  const rel = (f: string) => relative(root, f).split('\\').join('/');
  const result: FileImports = {
    version: FILE_IMPORTS_VERSION,
    files: {},
    unresolved: [],
    configIssues: [],
    limits: [
      'Static import analysis only, within the scanned tree. An importer is not runtime usage or an entry-point path.',
      'No static importer found is not a relevance or deletion verdict. Dynamic imports, require calls, route manifests, globs, CSS @import and build-time copies are outside this signal.',
      'Relative paths, tsconfig/jsconfig paths and baseUrl, and workspace source exports are resolved. Build-tool aliases and package-based config inheritance are not evaluated.',
      'Unresolved static specifiers or incomplete config resolution conservatively make files without a known importer unresolved. Finding groups without complete locations are also unresolved.',
    ],
  };
  const settingsCache = new Map<string, Settings>();
  function settings(file: string, stack = new Set<string>()): Settings {
    const cached = settingsCache.get(file);
    if (cached) return cached;
    const empty: Settings = { base: dirname(file), paths: {}, incomplete: false };
    if (stack.has(file)) return { ...empty, incomplete: true };
    stack.add(file);
    try {
      const config = json(file);
      let parent = empty;
      if (config.extends) {
        if (typeof config.extends !== 'string' || !config.extends.startsWith('.')) {
          result.configIssues.push(`${rel(file)}: package or multi-config inheritance is not resolved`);
          parent = { ...empty, incomplete: true };
        } else {
          let path = resolve(dirname(file), config.extends);
          if (!extname(path)) path += '.json';
          parent = settings(path, stack);
        }
      }
      const options = config.compilerOptions ?? {};
      const base =
        typeof options.baseUrl === 'string' ? resolve(dirname(file), options.baseUrl) : parent.base;
      const paths = options.paths
        ? Object.fromEntries(
            Object.entries(options.paths).map(([key, targets]) => [
              key,
              Array.isArray(targets)
                ? targets.filter((p): p is string => typeof p === 'string').map((p) => resolve(base, p))
                : [],
            ]),
          )
        : parent.paths;
      const value = { base, paths, incomplete: parent.incomplete };
      settingsCache.set(file, value);
      return value;
    } catch {
      result.configIssues.push(`${rel(file)}: could not read configuration`);
      return { ...empty, incomplete: true };
    }
  }
  const directoryCache = new Map<string, { config?: Settings; deps: Set<string> }>();
  function context(dir: string): { config?: Settings; deps: Set<string> } {
    const cached = directoryCache.get(dir);
    if (cached) return cached;
    const parent = dir === root ? { deps: new Set<string>() } : context(dirname(dir));
    let config = parent.config;
    for (const name of ['tsconfig.json', 'jsconfig.json']) {
      if (existsSync(join(dir, name))) {
        config = settings(join(dir, name));
        break;
      }
    }
    const deps = new Set(parent.deps);
    try {
      const pkg = json(join(dir, 'package.json'));
      for (const key of [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
      ] as const)
        for (const name of Object.keys(pkg[key] ?? {})) deps.add(name);
    } catch {
      /* No package metadata at this level. */
    }
    const value = { config, deps };
    directoryCache.set(dir, value);
    return value;
  }
  function lookup(path: string): string | undefined {
    const candidates = [
      path,
      ...extensions.map((e) => path + e),
      ...extensions.map((e) => join(path, `index${e}`)),
    ];
    if (/\.[cm]?js$/.test(path))
      candidates.push(...['.ts', '.tsx', '.mts', '.cts'].map((e) => path.replace(/\.[cm]?js$/, e)));
    return candidates.find((p) => known.has(p));
  }
  const workspace = findWorkspace(root).packages.sort((a, b) => b.name.length - a.name.length);
  function sourceExports(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (value && typeof value === 'object') return Object.values(value).flatMap(sourceExports);
    return [];
  }
  for (const file of [...files.map(rel), ...extraFiles])
    result.files[file] = { state: 'no-static-importer', basis: 'No static importer found.', importers: [] };
  for (const file of files.filter((f) => script.test(f))) {
    const ctx = context(dirname(file));
    if (ctx.config?.incomplete) incomplete = true;
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      incomplete = true;
      continue;
    }
    for (const occurrence of importSpecifiers(text)) {
      if (occurrence.kind !== 'static' && occurrence.kind !== 'reexport') continue;
      const spec = occurrence.specifier;
      const basis = { file: rel(file), line: occurrence.line, specifier: spec };
      let hit: string | undefined;
      let alias = false;
      if (spec.startsWith('.')) hit = lookup(resolve(dirname(file), spec));
      else {
        for (const [pattern, targets] of Object.entries(ctx.config?.paths ?? {}).sort(
          ([a], [b]) => b.length - a.length,
        )) {
          const [prefix, suffix = ''] = pattern.split('*');
          const match = pattern.includes('*')
            ? spec.startsWith(prefix) && spec.endsWith(suffix)
            : spec === pattern;
          if (!match) continue;
          alias = true;
          const middle = pattern.includes('*')
            ? spec.slice(prefix.length, suffix ? -suffix.length : undefined)
            : '';
          hit = targets.map((p) => lookup(p.replace('*', middle))).find(Boolean);
          break;
        }
        if (!hit && ctx.config) hit = lookup(resolve(ctx.config.base, spec));
        const pkg = workspace.find((p) => spec === p.name || spec.startsWith(`${p.name}/`));
        if (!hit && pkg) {
          alias = true;
          try {
            const meta = json(join(root, pkg.dir, 'package.json'));
            const sub = spec === pkg.name ? '.' : `.${spec.slice(pkg.name.length)}`;
            const subpathMap =
              typeof meta.exports === 'object' &&
              Object.keys(meta.exports).some((key) => key.startsWith('.'));
            const entry = subpathMap
              ? (meta.exports as Record<string, unknown>)[sub]
              : sub === '.'
                ? (meta.exports ?? meta.source ?? meta.module ?? meta.main)
                : undefined;
            hit = sourceExports(entry)
              .map((p) => lookup(resolve(root, pkg.dir, p)))
              .find(Boolean);
          } catch {
            /* Report unresolved below. */
          }
        }
        const external =
          spec.startsWith('node:') ||
          builtinModules.includes(spec) ||
          [...ctx.deps].some((p) => spec === p || spec.startsWith(`${p}/`));
        if (!hit && !alias && external) continue;
      }
      if (hit) {
        if (hit === file) continue;
        result.files[rel(hit)].importers.push(basis);
      } else {
        result.unresolved.push({
          ...basis,
          reason: 'Static specifier could not be resolved to a file in this tree.',
        });
      }
    }
  }
  for (const entry of Object.values(result.files)) {
    if (entry.importers.length) {
      entry.state = 'reached';
      entry.basis = 'Static importer found in this tree.';
    } else if (incomplete || result.unresolved.length) {
      entry.state = 'unresolved';
      entry.basis = single
        ? 'Single-file scan: importer tree not checked.'
        : 'Import resolution is incomplete; absence of an importer cannot be established.';
    }
  }
  return result;
}
