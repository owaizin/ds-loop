import type { IgnoreEntry } from '../config/schema.ts';
import type { RawValue } from './provenance.ts';

/**
 * A recorded exception: this rule, this value, in these files, and WHY.
 *
 * A false positive needs an argument, not a threshold. Widening a config number
 * to silence one token hides the whole class of finding in every future run and
 * leaves no trace of the decision; an ignore entry removes exactly one value and
 * carries the reasoning next to it, where the next reader — human or agent —
 * can disagree with it. `reason` is required for that reason, and `load.ts`
 * refuses a config whose entry lacks one.
 *
 * Suppression is never silent: `audit` prints every entry that matched, so a
 * clean verdict still shows what was argued away to reach it.
 *
 * ponytail: exact/suffix path and trailing-`*` prefix matching, no glob library.
 * Config loading rejects interior `*`; add a matcher when
 * an engagement needs one.
 */
export type Suppression = {
  entry: IgnoreEntry;
  /** how many extracted values this entry removed from that rule's input */
  matched: number;
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

function fileMatches(file: string, patterns: string[] | undefined): boolean {
  if (patterns === undefined) return true;
  return patterns.some((p) => {
    if (p.endsWith('*')) return file.startsWith(p.slice(0, -1));
    return file === p || file.endsWith(`/${p}`);
  });
}

function valueMatches(v: RawValue, want: string | undefined): boolean {
  if (want === undefined || want === '*') return true;
  const target = norm(want);
  return norm(v.raw) === target || norm(v.provenance.tokenName ?? '') === target;
}

/** does this entry speak to this rule? `*` speaks to all of them. */
function ruleMatches(entry: IgnoreEntry, ruleId: string): boolean {
  return entry.rule === '*' || entry.rule === ruleId;
}

/**
 * The values one rule gets to judge, with the recorded exceptions removed.
 * Returns the matches so the report can say what was suppressed and why.
 */
export function applyIgnores(
  ruleId: string,
  values: RawValue[],
  ignores: IgnoreEntry[],
): { values: RawValue[]; suppressions: Suppression[] } {
  const relevant = ignores.filter((e) => ruleMatches(e, ruleId));
  if (relevant.length === 0) return { values, suppressions: [] };

  const counts = new Map<IgnoreEntry, number>();
  const kept = values.filter((v) => {
    const hit = relevant.find((e) => valueMatches(v, e.value) && fileMatches(v.provenance.file, e.files));
    if (hit === undefined) return true;
    counts.set(hit, (counts.get(hit) ?? 0) + 1);
    return false;
  });

  return {
    values: kept,
    suppressions: [...counts.entries()].map(([entry, matched]) => ({ entry, matched })),
  };
}
