import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { listFiles } from './files.ts';

/**
 * Which workspace package imports which shared package, from source.
 *
 * Exists because an ecosystem diagram drawn from impressions presented a shared
 * native library as absent and a story-only package as shared. The answer to
 * "who uses this" is in the import statements, so read them.
 *
 * Deliberately a fact report: it counts import specifiers and named imports. It
 * does not decide which of two overlapping families is "right", and an import
 * is not runtime usage.
 *
 * ponytail: regex over import/export/require/import() specifiers, not a parser.
 * Ceilings: re-export chains are not followed, runtime-built paths and
 * tsconfig path aliases to other packages are not resolved (only package-name
 * specifiers count). Upgrade path: a TS/Babel parser, which would add a
 * dependency the engine refuses.
 */

export type Platform = 'web' | 'native' | 'unknown';

export interface WorkspacePackage {
  name: string;
  dir: string; // relative to root, '/'-separated
  platform: Platform;
  exports: string[]; // subpaths from package.json "exports" ('.' included), empty when absent
}

export interface ImportSample {
  file: string;
  line: number;
}

export interface SpecifierUse {
  specifier: string; // full specifier, e.g. @scope/ui/native
  target: string; // workspace package name it resolves to
  subpath: string; // '.' or './native'
  count: number; // import statements
  production: number; // statements outside stories and tests
  names: Record<string, number>; // named imports → statements
  samples: ImportSample[]; // first few, source order
}

export interface ConsumerEntry {
  package: string;
  dir: string;
  platform: Platform;
  files: number; // source files read
  uses: SpecifierUse[];
}

export interface ConsumersReport {
  root: string;
  workspaceSource: string; // how packages were found
  packages: WorkspacePackage[];
  consumers: ConsumerEntry[];
  /** exported subpaths no other package imports in production code */
  unconsumedExports: { package: string; subpath: string; storyOrTestOnly: boolean }[];
  limits: string[];
}

const SOURCE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const NATIVE_DEPS = ['react-native', 'expo'];
const WEB_DEPS = [
  'react-dom',
  'next',
  'vite',
  '@vitejs/plugin-react',
  'nuxt',
  'vue',
  'svelte',
  '@angular/core',
];
const SAMPLE_CAP = 5;
const NON_PRODUCTION =
  /(^|[/\\])(__tests__|__mocks__|stories|test|tests|e2e)([/\\]|$)|\.(stories|story|test|spec)\.[cm]?[jt]sx?$/;

const readJson = (file: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
};

/** workspace globs from package.json or pnpm-workspace.yaml */
function workspaceGlobs(root: string): { globs: string[]; source: string } {
  const pkg = readJson(join(root, 'package.json'));
  const ws = pkg?.workspaces as string[] | { packages?: string[] } | undefined;
  const fromPkg = Array.isArray(ws) ? ws : Array.isArray(ws?.packages) ? ws.packages : undefined;
  if (fromPkg?.length) return { globs: fromPkg, source: 'package.json workspaces' };
  const yaml = join(root, 'pnpm-workspace.yaml');
  if (existsSync(yaml)) {
    // ponytail: reads the `packages:` list only; anchors, flow style and nested keys are ignored.
    const globs: string[] = [];
    let inPackages = false;
    for (const raw of readFileSync(yaml, 'utf8').split('\n')) {
      const line = raw.replace(/#.*$/, '');
      if (/^packages\s*:/.test(line)) {
        inPackages = true;
        continue;
      }
      if (inPackages && /^\S/.test(line)) inPackages = false;
      const item = inPackages ? line.match(/^\s*-\s*['"]?([^'"]+?)['"]?\s*$/) : null;
      if (item) globs.push(item[1]!);
    }
    if (globs.length) return { globs, source: 'pnpm-workspace.yaml' };
  }
  return { globs: [], source: 'none' };
}

/** expands `apps/*`, `packages/**` and literal paths; `!` negations exclude */
function expandGlobs(root: string, globs: string[]): string[] {
  const include = globs.filter((g) => !g.startsWith('!'));
  const exclude = globs.filter((g) => g.startsWith('!')).map((g) => g.slice(1).replace(/\/+$/, ''));
  const dirs = new Set<string>();
  const childDirs = (dir: string) => {
    try {
      return readdirSync(join(root, dir)).filter(
        (e) => !e.startsWith('.') && e !== 'node_modules' && statSync(join(root, dir, e)).isDirectory(),
      );
    } catch {
      return [];
    }
  };
  for (const glob of include) {
    const clean = glob.replace(/\/+$/, '').replace(/^\.\//, '');
    const star = clean.indexOf('*');
    if (star < 0) {
      dirs.add(clean);
      continue;
    }
    const base = clean.slice(0, star).replace(/\/$/, '');
    if (clean.endsWith('/**')) {
      const walk = (d: string, depth: number) => {
        for (const c of childDirs(d)) {
          const rel = d ? `${d}/${c}` : c;
          dirs.add(rel);
          if (depth < 3) walk(rel, depth + 1);
        }
      };
      walk(base, 0);
    } else for (const c of childDirs(base)) dirs.add(base ? `${base}/${c}` : c);
  }
  return [...dirs]
    .filter((d) => existsSync(join(root, d, 'package.json')))
    .filter((d) => !exclude.some((x) => d === x || d.startsWith(`${x}/`)))
    .sort();
}

function platformOf(pkg: Record<string, unknown>): Platform {
  const deps = {
    ...(pkg.dependencies as object),
    ...(pkg.devDependencies as object),
    ...(pkg.peerDependencies as object),
  };
  const has = (names: string[]) => names.some((n) => n in deps);
  if (has(NATIVE_DEPS)) return 'native';
  if (has(WEB_DEPS)) return 'web';
  return 'unknown';
}

function exportSubpaths(pkg: Record<string, unknown>): string[] {
  const exp = pkg.exports;
  if (!exp || typeof exp !== 'object' || Array.isArray(exp)) return typeof exp === 'string' ? ['.'] : [];
  const keys = Object.keys(exp);
  return keys.some((k) => k.startsWith('.')) ? keys.filter((k) => k.startsWith('.')).sort() : ['.'];
}

export function findWorkspace(root: string): { packages: WorkspacePackage[]; source: string } {
  const { globs, source } = workspaceGlobs(root);
  const dirs = expandGlobs(root, globs);
  const packages: WorkspacePackage[] = [];
  for (const dir of dirs) {
    const pkg = readJson(join(root, dir, 'package.json'));
    if (!pkg || typeof pkg.name !== 'string') continue;
    packages.push({ name: pkg.name, dir, platform: platformOf(pkg), exports: exportSubpaths(pkg) });
  }
  return { packages, source };
}

const SPECIFIER =
  /\bimport\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|\bexport\s+(?:type\s+)?[^'";]*?\s+from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g;

/** named imports from an import clause: `A, { B, C as D }` → A(default) B C */
function namedImports(clause: string): string[] {
  const out: string[] = [];
  const braces = clause.match(/\{([\s\S]*)\}/);
  if (braces) {
    for (const part of braces[1]!.split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]!
        .trim();
      if (name) out.push(name);
    }
  }
  const head = clause
    .replace(/\{[\s\S]*\}/, '')
    .replace(/,/g, ' ')
    .trim();
  if (head.startsWith('*')) out.push('*');
  else if (head && /^[A-Za-z_$][\w$]*$/.test(head)) out.push('default');
  return out;
}

/** line lookup built once per file — a per-match scan is quadratic on large files */
function lineIndex(text: string): (index: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** resolves `@scope/pkg/sub` to a workspace package and subpath, longest name first */
function resolveTarget(spec: string, names: string[]): { target: string; subpath: string } | undefined {
  for (const name of names) {
    if (spec === name) return { target: name, subpath: '.' };
    if (spec.startsWith(`${name}/`)) return { target: name, subpath: `./${spec.slice(name.length + 1)}` };
  }
  return undefined;
}

export function analyseConsumers(root: string, opts: { scope?: string } = {}): ConsumersReport {
  const { packages, source } = findWorkspace(root);
  const names = packages.map((p) => p.name).sort((a, b) => b.length - a.length);
  const consumers: ConsumerEntry[] = [];
  const productionUse = new Map<string, number>(); // `${pkg}\0${subpath}` → production imports from other packages
  const anyUse = new Map<string, number>();

  for (const pkg of packages) {
    const files = listFiles(join(root, pkg.dir), SOURCE_EXTS).filter((f) => {
      // a nested workspace package is its own consumer
      const rel = relative(root, f).split(sep).join('/');
      return !packages.some(
        (o) => o !== pkg && o.dir.startsWith(`${pkg.dir}/`) && rel.startsWith(`${o.dir}/`),
      );
    });
    const uses = new Map<string, SpecifierUse>();
    for (const file of files) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const rel = relative(root, file).split(sep).join('/');
      const production = !NON_PRODUCTION.test(rel);
      let lineAt: ((index: number) => number) | undefined;
      for (const m of text.matchAll(SPECIFIER)) {
        const spec = m[3] ?? m[4] ?? m[5] ?? m[6] ?? m[7];
        if (!spec) continue;
        if (opts.scope && !spec.startsWith(opts.scope)) continue;
        const hit = resolveTarget(spec, names);
        if (!hit || hit.target === pkg.name) continue;
        const use =
          uses.get(spec) ??
          ({ specifier: spec, ...hit, count: 0, production: 0, names: {}, samples: [] } as SpecifierUse);
        use.count++;
        if (production) use.production++;
        if (m[2] !== undefined) for (const n of namedImports(m[2])) use.names[n] = (use.names[n] ?? 0) + 1;
        if (use.samples.length < SAMPLE_CAP) {
          lineAt ??= lineIndex(text);
          use.samples.push({ file: rel, line: lineAt(m.index ?? 0) });
        }
        uses.set(spec, use);
        const key = `${hit.target}\0${hit.subpath}`;
        anyUse.set(key, (anyUse.get(key) ?? 0) + 1);
        if (production) productionUse.set(key, (productionUse.get(key) ?? 0) + 1);
      }
    }
    consumers.push({
      package: pkg.name,
      dir: pkg.dir,
      platform: pkg.platform,
      files: files.length,
      uses: [...uses.values()].sort((a, b) => b.count - a.count || a.specifier.localeCompare(b.specifier)),
    });
  }

  const unconsumedExports = packages
    .filter((p) => !opts.scope || p.name.startsWith(opts.scope) || opts.scope.startsWith(`${p.name}/`))
    .flatMap((p) => p.exports.map((subpath) => ({ package: p.name, subpath })))
    .filter((e) => !productionUse.get(`${e.package}\0${e.subpath}`))
    .map((e) => ({ ...e, storyOrTestOnly: (anyUse.get(`${e.package}\0${e.subpath}`) ?? 0) > 0 }));

  return {
    root,
    workspaceSource: source,
    packages,
    consumers,
    unconsumedExports,
    limits: [
      'Import statements, not runtime usage; re-export chains are not followed.',
      'Only package-name specifiers of workspace packages count; tsconfig path aliases and relative imports across packages are not resolved.',
      'Stories, tests and mocks are counted separately and never as production adoption.',
      'Platform comes from declared dependencies; "unknown" is not guessed.',
    ],
  };
}
