import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import type { SourceRef } from '../adapters/types.ts';
import { type FixtureMeta, loadFixture } from './fixture.ts';

/**
 * Resolve a CLI target into a { meta, source } pair.
 *
 *  - a directory holding a SOURCE.json  -> frozen fixture (comparable, reproducible)
 *  - any other directory or a .css file -> live scan of the working tree
 *
 * Live scans have no ground-truth primitive count and their `fixtureSha` is the
 * git HEAD of the repo (or `live` when not in git), so a calibration row taken
 * from a live scan still records exactly what it looked at.
 */
export function resolveSource(
  target: string,
  opts: { only?: string[] } = {},
): { meta: FixtureMeta; source: SourceRef; live: boolean } {
  const abs = isAbsolute(target) ? target : resolve(process.cwd(), target);

  if (!existsSync(abs)) throw new Error(`path not found: ${abs}`);

  const isDir = statSync(abs).isDirectory();
  if (isDir && existsSync(join(abs, 'SOURCE.json'))) {
    const { meta, source } = loadFixture(target);
    return { meta, source: withOnly(source, opts.only), live: false };
  }

  const repoRoot = gitRoot(isDir ? abs : resolve(abs, '..'));
  const sha = repoRoot ? gitHead(repoRoot) : null;
  const meta: FixtureMeta = {
    label: basename(repoRoot ?? abs) || 'live',
    upstream: repoRoot ? `git working tree at ${repoRoot}` : abs,
    fixtureSha: sha ? `git:${sha}` : 'live',
    retrievedAt: new Date().toISOString().slice(0, 10),
    path: '.',
    shippedPrimitiveCount: null,
    notes: 'live scan of the working tree — not a frozen snapshot',
  };
  const source: SourceRef = { root: abs, fixtureSha: meta.fixtureSha, label: meta.label };
  return { meta, source: withOnly(source, opts.only), live: true };
}

function withOnly(source: SourceRef, only: string[] | undefined): SourceRef {
  if (only === undefined) return source;
  const rootIsFile = statSync(source.root).isFile();
  const realRoot = realpathSync(source.root);
  const selected = [...new Set(only.map((f) => resolve(process.cwd(), f)))].flatMap((file) => {
    if (!existsSync(file) || !statSync(file).isFile()) return [];
    const rel = relative(realRoot, realpathSync(file));
    const inside = rootIsFile ? rel === '' : rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
    return inside ? [resolve(source.root, rel)] : [];
  });
  return { ...source, only: selected };
}

/** Committed paths changed since the merge base with ref; adapters filter formats. */
export function changedFiles(ref: string, cwd = process.cwd()): string[] {
  const root = gitRoot(cwd);
  if (!root) throw new Error('--since needs a target inside a Git repository');
  try {
    const out = execFileSync(
      'git',
      ['diff', '--name-only', '-z', '--diff-filter=ACMRT', `${ref}...HEAD`, '--'],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return out
      .split('\0')
      .filter(Boolean)
      .map((f) => join(root, f));
  } catch {
    throw new Error(
      `cannot compare --since ${ref} with HEAD; check that both revisions exist and share a history`,
    );
  }
}

function gitRoot(from: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: from,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function gitHead(root: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .slice(0, 12);
  } catch {
    return null;
  }
}
