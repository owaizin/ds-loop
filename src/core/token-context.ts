import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { cssCustomPropsAdapter } from '../adapters/css-custom-props.ts';
import type { SourceRef } from '../adapters/types.ts';
import type { DsOpsConfig, TokenContextMapping } from '../config/schema.ts';
import type { RawValue } from './provenance.ts';

export type TokenContextRead = {
  file: string;
  forFiles: string[];
  adapter: string;
  sha256?: string;
  error?: string;
};
export type TokenContextEntry = { values: RawValue[]; errors: string[] };
export type TokenContext = {
  /** Explicit mappings, or a file-limited run: no tree-wide theme assumption. */
  required: boolean;
  byFile: Map<string, TokenContextEntry>;
  reads: TokenContextRead[];
};

/** Configured associations only; file proximity does not establish a theme dependency. */
export function readTokenContext(source: SourceRef, config: DsOpsConfig, values: RawValue[]): TokenContext {
  const rootIsFile = statSync(source.root).isFile();
  const base = rootIsFile ? dirname(source.root) : source.root;
  const mappings = config.tokenContexts ?? [];
  const result: TokenContext = {
    required: source.only !== undefined || rootIsFile || mappings.length > 0,
    byFile: new Map(),
    reads: [],
  };
  const cache = new Map<string, { values: RawValue[]; read: TokenContextRead }>();
  const files = [
    ...new Set(values.filter((v) => v.provenance.tokenName === null).map((v) => v.provenance.file)),
  ];
  for (const file of files) {
    const rel = relative(base, resolve(source.root, file)).replaceAll('\\', '/');
    const tokens = [...new Set(mappings.filter((m) => matches(m, rel)).flatMap((m) => m.tokens))];
    if (tokens.length === 0) continue;
    const entry: TokenContextEntry = { values: [], errors: [] };
    for (const token of tokens) {
      let cached = cache.get(token);
      if (!cached) {
        const read: TokenContextRead = {
          file: token,
          forFiles: [],
          adapter: `${cssCustomPropsAdapter.id}@${cssCustomPropsAdapter.version}`,
        };
        let declarations: RawValue[] = [];
        try {
          const path = resolve(base, token);
          const actual = realpathSync(path);
          const inside = relative(realpathSync(base), actual);
          if (inside === '..' || inside.startsWith('../') || isAbsolute(inside)) {
            throw new Error('token context must stay within the audit root');
          }
          if (!statSync(actual).isFile()) throw new Error('token context is not a file');
          if (extname(actual).toLowerCase() !== '.css')
            throw new Error('token context requires supported CSS declarations');
          const bytes = readFileSync(actual);
          read.sha256 = createHash('sha256').update(bytes).digest('hex');
          declarations = cssCustomPropsAdapter.extract({ ...source, only: [path] }, config);
        } catch (error) {
          // Retain a limitation, never turn a missing configured dependency into a pass.
          read.error = error instanceof Error ? error.message : String(error);
        }
        cached = { values: declarations, read };
        cache.set(token, cached);
        result.reads.push(read);
      }
      cached.read.forFiles.push(file);
      entry.values.push(...cached.values);
      if (cached.read.error) entry.errors.push(`${token}: ${cached.read.error}`);
    }
    result.byFile.set(file, entry);
  }
  return result;
}

function matches(mapping: TokenContextMapping, file: string): boolean {
  return mapping.files.some((pattern) =>
    pattern.endsWith('*') ? file.startsWith(pattern.slice(0, -1)) : file === pattern,
  );
}
