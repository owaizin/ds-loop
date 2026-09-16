import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * File discovery for adapters. One walker, so every adapter agrees on what is
 * out of scope (dependencies, build output, dotfiles) and on `only` (hook /
 * --files mode).
 *
 * Build output is skipped because it is derived: a finding in `dist/index.js`
 * duplicates one in `src/`, doubles every count, and points at a line no one can
 * edit. Found by auditing a real repo, where 7 of 40 sampled hits were bundled.
 */

/** dependencies and derived output — never authored, so never audited */
const SKIP = new Set([
  'node_modules',
  'bower_components',
  'vendor',
  'dist',
  'build',
  'out',
  'output',
  'public',
  'storybook-static',
  'coverage',
  '__snapshots__',
  'target',
]);

/** every file under `root` with one of `exts`, sorted; `root` may itself be a file */
export function listFiles(root: string, exts: string[]): string[] {
  const match = (name: string) => exts.includes(extname(name).toLowerCase());
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry) || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (match(entry)) out.push(full);
    }
  };
  try {
    if (statSync(root).isDirectory()) walk(root);
    else if (match(root)) out.push(root);
  } catch {
    /* missing path — return empty */
  }
  return out.sort();
}

/** the files an adapter should read: `only` when scoped, the whole tree otherwise */
export function filesInScope(root: string, exts: string[], only?: string[]): string[] {
  if (!only) return listFiles(root, exts);
  const match = (f: string) => exts.includes(extname(f).toLowerCase());
  return only.filter((f) => match(f) && existsSync(f));
}
