import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type Decision = {
  /** Explicit rule/file/value scope; evidence links alone do not declare permission. */
  covers?: { rule: string; files: string[]; value?: string }[];
  decision: string;
  alternatives: string;
  evidence: string[];
  owner: string;
  date?: string;
  problem?: string;
  consequences?: string;
  reconsider?: string;
  status?: 'accepted' | 'proposed';
};

/** Exclusive creation preserves previous decisions, including concurrent same-title writes. */
export function decide(root: string, input: Decision): string {
  for (const field of ['decision', 'alternatives', 'owner'] as const)
    if (typeof input[field] !== 'string' || !input[field].trim()) throw new Error(`decide requires ${field}`);
  if (
    !Array.isArray(input.evidence) ||
    !input.evidence.length ||
    input.evidence.some((e) => typeof e !== 'string' || !e.trim())
  )
    throw new Error('decide requires evidence refs');
  if (
    input.covers !== undefined &&
    (!Array.isArray(input.covers) ||
      input.covers.some(
        (c) =>
          !c ||
          typeof c.rule !== 'string' ||
          !c.rule.trim() ||
          !Array.isArray(c.files) ||
          !c.files.length ||
          c.files.some((f) => typeof f !== 'string' || !f.trim() || f.includes('*')) ||
          (c.value !== undefined && (typeof c.value !== 'string' || !c.value.trim())),
      ))
  )
    throw new Error('decide covers needs a rule, exact file paths and an optional string value');
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error('decide date must be a real YYYY-MM-DD date');
  const status = input.status ?? 'accepted';
  if (status !== 'accepted' && status !== 'proposed')
    throw new Error('decide status must be accepted or proposed');
  const dir = join(resolve(root), 'docs', 'decisions');
  mkdirSync(dir, { recursive: true });
  const slug =
    input.decision
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'decision';
  const body = `# ${input.decision.trim()}\n\nDate: ${date}\nOwner: ${input.owner.trim()}\nStatus: ${status}\n\n## Decision\n\n${input.decision.trim()}\n\n## Alternatives\n\n${input.alternatives.trim()}\n\n## Evidence\n\n${input.evidence.map((e) => `- ${e.trim()}`).join('\n')}\n${[
    ['Problem', input.problem],
    ['Consequences', input.consequences],
    ['Reconsider when', input.reconsider],
  ]
    .filter(([, v]) => v)
    .map(([heading, value]) => `\n## ${heading}\n\n${value}\n`)
    .join(
      '',
    )}${input.covers?.length ? `\n## Covers\n\n${input.covers.map((c) => `- ${JSON.stringify(c)}`).join('\n')}\n` : ''}`;
  for (let n = 1; ; n++) {
    const file = join(dir, `${date}-${slug}${n === 1 ? '' : `-${n}`}.md`);
    try {
      writeFileSync(file, body, { flag: 'wx' });
      return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
}
