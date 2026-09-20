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

/**
 * Every file extension present under `root`, with counts — the same tree
 * `listFiles` walks, so the two agree about scope.
 *
 * This exists so `audit` can state what it did *not* read. A linter that reports
 * a clean result while silently skipping half the styling in a repo is worse than
 * one that reports nothing: the reader believes it. Measured cost of that failure:
 * 76 oklch tokens and 72 display-p3 entries invisible for the tool's whole life
 * before anyone noticed.
 */
export function surveyTree(root: string): Map<string, number> {
  const seen = new Map<string, number>();
  const bump = (name: string) => {
    const ext = extname(name).toLowerCase();
    if (ext === '') return;
    seen.set(ext, (seen.get(ext) ?? 0) + 1);
  };
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry) || entry.startsWith('.')) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else bump(entry);
    }
  };
  try {
    if (statSync(root).isDirectory()) walk(root);
    else bump(root);
  } catch {
    /* missing path — nothing to survey */
  }
  return seen;
}

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
  return only.filter((f) => match(f) && existsSync(f) && statSync(f).isFile());
}
