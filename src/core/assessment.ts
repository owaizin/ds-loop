/** Authored assessment, separate from deterministic audit output. No implied business impact. */
export type Assessment = {
  client: string;
  scope: string;
  preparedBy: string;
  sourceRevision: string;
  sourceState: string;
  executive: {
    headline: string;
    recommendation: string;
    stakes: string;
    decision: string;
    decisionOwner: string;
    investment: string;
    alternatives: { option: string; tradeoff: string }[];
    preserve: string[];
  };
  measures: {
    label: string;
    numerator: number;
    denominator: number;
    definition: string;
    evidence: string[];
  }[];
  areas: {
    name: string;
    state: 'action' | 'retain' | 'review' | 'not-assessed';
    conclusion: string;
    coverage: string;
    unknowns: string;
    evidence: string[];
  }[];
  findings: {
    id: string;
    title: string;
    priority: 'now' | 'next' | 'later';
    basis: 'source' | 'runtime' | 'interview' | 'inference';
    observation: string;
    consequence: string;
    recommendation: string;
    alternative: string;
    limits: string;
    verification: string[];
    evidence: string[];
  }[];
  work: {
    id: string;
    title: string;
    owner: string;
    dependsOn: string[];
    findings: string[];
    changes: string;
    acceptance: string[];
    estimate: {
      low: number;
      high: number;
      unit: 'person-hours';
      basis: string;
      confidence: 'low' | 'medium' | 'high';
    };
  }[];
  evidence: {
    id: string;
    title: string;
    kind: 'source' | 'measurement' | 'runtime' | 'interview' | 'reference';
    ref: string;
    capturedAt: string;
    excerpt: string;
    limitation: string;
  }[];
};

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const states = ['action', 'retain', 'review', 'not-assessed'];

/** Validate cross-references and estimate assumptions before any report is written. */
export function checkAssessment(input: unknown): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!obj(input)) return { errors: ['assessment must be an object'], warnings };
  const fields = (row: Record<string, unknown>, keys: string[], path: string) => {
    for (const key of keys) if (!text(row[key])) errors.push(`${path}.${key} must be a non-empty string`);
  };
  const strings = (value: unknown, path: string, nonempty = false): string[] => {
    if (!Array.isArray(value) || !value.every(text) || (nonempty && !value.length)) {
      errors.push(`${path} must be ${nonempty ? 'a non-empty' : 'a'} string array`);
      return [];
    }
    return value;
  };
  const rows = (value: unknown, path: string, nonempty = false): Record<string, unknown>[] => {
    if (!Array.isArray(value) || (nonempty && !value.length)) {
      errors.push(`${path} must be an array${nonempty ? ' with at least one entry' : ''}`);
      return [];
    }
    return value.flatMap((row, i) => {
      if (obj(row)) return [row];
      errors.push(`${path}[${i}] must be an object`);
      return [];
    });
  };
  fields(input, ['client', 'scope', 'preparedBy', 'sourceRevision', 'sourceState'], 'assessment');
  if (!obj(input.executive)) errors.push('assessment.executive must be an object');
  else {
    fields(
      input.executive,
      ['headline', 'recommendation', 'stakes', 'decision', 'decisionOwner', 'investment'],
      'assessment.executive',
    );
    strings(input.executive.preserve, 'assessment.executive.preserve', true);
    rows(input.executive.alternatives, 'assessment.executive.alternatives', true).forEach((r, i) =>
      fields(r, ['option', 'tradeoff'], `assessment.executive.alternatives[${i}]`),
    );
  }
  const evidence = rows(input.evidence, 'assessment.evidence', true);
  const findings = rows(input.findings, 'assessment.findings');
  const work = rows(input.work, 'assessment.work', true);
  const ids = (items: Record<string, unknown>[], path: string) => {
    const seen = new Set<string>();
    for (const r of items) {
      if (!text(r.id) || !/^[a-zA-Z][\w-]*$/.test(r.id))
        errors.push(
          `${path}: id must start with a letter and contain only letters, digits, hyphens or underscores`,
        );
      else {
        if (seen.has(r.id)) errors.push(`${path}: duplicate id ${r.id}`);
        seen.add(r.id);
      }
    }
    return seen;
  };
  const evidenceIds = ids(evidence, 'assessment.evidence');
  const findingIds = ids(findings, 'assessment.findings');
  const workIds = ids(work, 'assessment.work');
  const references = (value: unknown, known: Set<string>, path: string, required = false) => {
    for (const id of strings(value, path, required))
      if (!known.has(id)) errors.push(`${path}: unknown reference ${id}`);
  };
  evidence.forEach((r, i) => {
    const path = `assessment.evidence[${i}]`;
    fields(r, ['title', 'ref', 'capturedAt', 'excerpt', 'limitation'], path);
    if (!['source', 'measurement', 'runtime', 'interview', 'reference'].includes(String(r.kind)))
      errors.push(`${path}.kind is invalid`);
    if (text(r.capturedAt) && !Number.isFinite(Date.parse(r.capturedAt)))
      errors.push(`${path}.capturedAt must be a date`);
    if (text(r.ref) && !/^(?:https?:\/\/[^\s<>]+|[^<>\r\n]+:[1-9]\d*(?::[1-9]\d*)?)$/.test(r.ref))
      errors.push(`${path}.ref must be an HTTP(S) URL or file:line`);
  });
  rows(input.measures, 'assessment.measures', true).forEach((r, i) => {
    const path = `assessment.measures[${i}]`;
    fields(r, ['label', 'definition'], path);
    if (
      typeof r.numerator !== 'number' ||
      !Number.isFinite(r.numerator) ||
      r.numerator < 0 ||
      typeof r.denominator !== 'number' ||
      !Number.isFinite(r.denominator) ||
      r.denominator <= 0 ||
      r.numerator > r.denominator
    )
      errors.push(`${path} requires finite 0 <= numerator <= denominator and denominator > 0`);
    references(r.evidence, evidenceIds, `${path}.evidence`, true);
  });
  const areas = rows(input.areas, 'assessment.areas', true);
  areas.forEach((r, i) => {
    const path = `assessment.areas[${i}]`;
    fields(r, ['name', 'conclusion', 'coverage', 'unknowns'], path);
    if (!states.includes(String(r.state))) errors.push(`${path}.state is invalid`);
    references(r.evidence, evidenceIds, `${path}.evidence`, r.state !== 'not-assessed');
  });
  findings.forEach((r, i) => {
    const path = `assessment.findings[${i}]`;
    fields(r, ['title', 'observation', 'consequence', 'recommendation', 'alternative', 'limits'], path);
    if (!['now', 'next', 'later'].includes(String(r.priority))) errors.push(`${path}.priority is invalid`);
    if (!['source', 'runtime', 'interview', 'inference'].includes(String(r.basis)))
      errors.push(`${path}.basis is invalid`);
    strings(r.verification, `${path}.verification`, true);
    references(r.evidence, evidenceIds, `${path}.evidence`, true);
  });
  work.forEach((r, i) => {
    const path = `assessment.work[${i}]`;
    fields(r, ['title', 'owner', 'changes'], path);
    references(r.dependsOn, workIds, `${path}.dependsOn`);
    references(r.findings, findingIds, `${path}.findings`);
    strings(r.acceptance, `${path}.acceptance`, true);
    if (!obj(r.estimate)) errors.push(`${path}.estimate must be an object`);
    else {
      const e = r.estimate;
      if (
        typeof e.low !== 'number' ||
        !Number.isFinite(e.low) ||
        e.low < 0 ||
        typeof e.high !== 'number' ||
        !Number.isFinite(e.high) ||
        e.high < e.low
      )
        errors.push(`${path}.estimate requires finite 0 <= low <= high`);
      if (e.unit !== 'person-hours') errors.push(`${path}.estimate.unit must be person-hours`);
      fields(e, ['basis'], `${path}.estimate`);
      if (!['low', 'medium', 'high'].includes(String(e.confidence)))
        errors.push(`${path}.estimate.confidence is invalid`);
    }
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`assessment.work: dependency cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const row = work.find((r) => r.id === id);
    if (Array.isArray(row?.dependsOn))
      for (const dep of row.dependsOn) if (typeof dep === 'string' && workIds.has(dep)) visit(dep);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of workIds) visit(id);
  return { errors, warnings };
}
