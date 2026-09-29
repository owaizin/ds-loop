import { comparability } from '../commands/scorecard.ts';
import { contractRatios } from './contract-measurement.ts';
import type { RawValue } from './provenance.ts';

/** Extraction-only measurements: context still runs no rules. */
export function contractMeasurements(values: RawValue[]): Record<string, number | null> {
  const declarations = values.filter((v) => v.provenance.tokenName !== null);
  const colors = declarations.filter((v) => v.provenance.classification === 'color');
  return {
    declarations: declarations.length,
    colors: colors.length,
    distinctColors: new Set(colors.map((v) => v.raw.toLowerCase())).size,
    useSites: values.length - declarations.length,
    ...contractRatios(values),
  };
}

type Change = { measurement: string; before: number | null; after: number | null; delta?: number };
export type ContractDrift = {
  status: 'not-recorded' | 'not-checked' | 'instrument-changed' | 'drift' | 'unchanged';
  reason: string;
  recordedAt?: string;
  changes: Change[];
};

export function contractDrift(
  text: string | null,
  current: {
    adapters: string;
    configHash: string;
    measurements: Record<string, number | null>;
  },
): ContractDrift {
  const result = (status: ContractDrift['status'], reason: string): ContractDrift => ({
    status,
    reason,
    changes: [],
  });
  if (text === null) return result('not-recorded', 'DESIGN-SYSTEM.md not found; intent may live elsewhere.');
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const field = (key: string) => front?.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1].trim();
  const date = field('generated_at');
  const configHash = field('config_hash');
  // Legacy contracts already recorded the instrument and four extraction counts in prose.
  const adapters = field('adapters') ?? text.match(/^Read by (.+)\.$/m)?.[1].replace(/`/g, '');
  if (!date || !Number.isFinite(Date.parse(date)) || !configHash || !adapters)
    return result('not-checked', 'Contract has no complete dated instrument record; no comparison made.');
  const comparison = comparability({ adapters, configHash }, current);
  if (!comparison.clean)
    return { ...result('instrument-changed', `${comparison.reason}. No delta reported.`), recordedAt: date };
  if (current.adapters === 'none')
    return result('not-checked', 'No adapter reads this source; no measured source comparison is available.');
  let previous: Record<string, number | null>;
  try {
    const serialized = field('measurements');
    if (serialized) {
      const parsed: unknown = JSON.parse(serialized);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        !Object.entries(parsed).every(
          ([key, value]) =>
            key in current.measurements &&
            (value === null || (typeof value === 'number' && Number.isFinite(value))),
        )
      )
        throw new Error('invalid');
      previous = parsed as Record<string, number | null>;
    } else {
      const counts = text.match(
        /^- \*\*(\d+)\*\* token declarations · \*\*(\d+)\*\* colour, \*\*(\d+)\*\* distinct$/m,
      );
      const uses = text.match(/^- \*\*(\d+)\*\* use-site values/m);
      if (!counts || !uses) throw new Error('missing');
      previous = {
        declarations: Number(counts[1]),
        colors: Number(counts[2]),
        distinctColors: Number(counts[3]),
        useSites: Number(uses[1]),
      };
    }
    if (!Object.keys(previous).length) throw new Error('empty');
  } catch {
    return result('not-checked', 'Contract measurements are missing or invalid; no comparison made.');
  }
  const changes = Object.entries(previous).flatMap(([measurement, before]) => {
    const after = current.measurements[measurement];
    if (after === undefined || before === after) return [];
    return [
      { measurement, before, after, ...(before !== null && after !== null ? { delta: after - before } : {}) },
    ];
  });
  return {
    status: changes.length ? 'drift' : 'unchanged',
    recordedAt: date,
    changes,
    reason:
      'Compared recorded extraction measurements only; unchanged measurements do not prove unchanged code or intent.',
  };
}
