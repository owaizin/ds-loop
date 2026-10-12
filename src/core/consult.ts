import { RULES } from '../rules/registry.ts';
import { type Assessment, checkAssessment } from './assessment.ts';
import { type Evidence, type Proposal, checkProposal } from './proposal.ts';

export type Claim = { text: string; evidence: Evidence[] };
export type Consult = {
  title: string;
  assessment?: Assessment;
  problem: Claim[];
  practices: (Claim & { system: string })[];
  after: Claim & { architecture: Proposal };
  plan: {
    effort?: string;
    title: string;
    changes: string;
    why: string;
    verification: string;
    evidence: Evidence[];
  }[];
  assumptions: Claim[];
};

const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const ruleIds = new Set(RULES.map((r) => r.id));
export function isEvidenceRef(ref: string): boolean {
  if (ruleIds.has(ref) || /^(?![a-z]+:)(?!.*[\r\n])[^<>]+:[1-9]\d*(?::[1-9]\d*)?$/i.test(ref)) return true;
  try {
    const url = new URL(ref);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Validate all sections in one pass. Citations are references, not verification of an agent's claim. */
export function checkConsult(input: unknown): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!object(input)) return { errors: ['consult must be a JSON object'], warnings };
  const fields = (row: Record<string, unknown>, keys: string[], path: string) => {
    for (const key of keys) if (!text(row[key])) errors.push(`${path}.${key} must be a non-empty string`);
  };
  const evidence = (row: Record<string, unknown>, path: string) => {
    if (!Array.isArray(row.evidence)) {
      errors.push(`${path}.evidence must be an array (use [] for unsupported claims)`);
      return;
    }
    if (!row.evidence.length) warnings.push(`${path}: unsupported — no evidence refs`);
    row.evidence.forEach((e, i) => {
      if (!object(e) || !text(e.ref) || !isEvidenceRef(e.ref))
        errors.push(`${path}.evidence[${i}].ref must be file:line, a registered rule ID or an HTTP(S) URL`);
    });
  };
  fields(input, ['title'], 'consult');
  for (const key of ['problem', 'practices', 'plan', 'assumptions']) {
    const rows = input[key];
    if (!Array.isArray(rows)) {
      errors.push(`${key} must be an array`);
      continue;
    }
    if (key !== 'assumptions' && rows.length === 0) errors.push(`${key} must have at least one entry`);
    rows.forEach((row, i) => {
      const path = `${key}[${i}]`;
      if (!object(row)) {
        errors.push(`${path} must be an object`);
        return;
      }
      fields(
        row,
        key === 'plan'
          ? ['title', 'changes', 'why', 'verification']
          : key === 'practices'
            ? ['text', 'system']
            : ['text'],
        path,
      );
      if (key === 'plan' && row.effort !== undefined && !text(row.effort))
        errors.push(`${path}.effort must be a non-empty string`);
      evidence(row, path);
    });
  }
  if (!object(input.after)) errors.push('after must be an object');
  else {
    fields(input.after, ['text'], 'after');
    evidence(input.after, 'after');
    const checked = checkProposal(input.after.architecture);
    errors.push(...checked.errors.map((e) => `after.architecture: ${e}`));
    warnings.push(...checked.warnings.map((e) => `after.architecture: ${e}`));
    if (object(input.after.architecture)) {
      for (const key of ['nodes', 'edges']) {
        const rows = input.after.architecture[key];
        if (Array.isArray(rows))
          rows.forEach((row, i) => {
            if (object(row))
              evidence({ ...row, evidence: row.evidence ?? [] }, `after.architecture.${key}[${i}]`);
          });
      }
    }
  }
  if (input.assessment !== undefined) {
    const checked = checkAssessment(input.assessment);
    errors.push(...checked.errors);
    warnings.push(...checked.warnings);
  }
  return { errors, warnings };
}
