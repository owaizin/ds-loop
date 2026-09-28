import type { AuditReport } from '../commands/audit.ts';
import type { Finding } from '../rules/types.ts';
import type { Provenance } from './provenance.ts';
import type { FindingSuggestion, TokenCandidate, TokenSuggestion } from './token-suggestions.ts';

type IndexedFinding = Omit<Finding, 'suggestion'> & {
  suggestion?: Omit<FindingSuggestion, 'values'> & {
    values: (Omit<TokenSuggestion, 'candidates'> & { candidates: { candidateRef: number }[] })[];
  };
};

/** Lossless wire format. Matching operates on expanded evidence; files store shared records once. */
export function reportData(report: AuditReport) {
  const declarations: Provenance[] = [];
  const declarationIds = new Map<string, number>();
  const candidates: (Omit<TokenCandidate, 'declarations'> & { declarationRefs: number[] })[] = [];
  const candidateIds = new Map<string, number>();
  const intern = <T>(value: T, list: T[], ids: Map<string, number>): number => {
    const key = JSON.stringify(value);
    let id = ids.get(key);
    if (id === undefined) {
      id = list.length;
      list.push(value);
      ids.set(key, id);
    }
    return id;
  };
  const findings: IndexedFinding[] = report.findings.map(({ suggestion, ...f }) => ({
    ...f,
    ...(suggestion
      ? {
          suggestion: {
            ...suggestion,
            values: suggestion.values.map((s) => ({
              ...s,
              candidates: s.candidates.map(({ declarations: evidence, ...c }) => ({
                candidateRef: intern(
                  { ...c, declarationRefs: evidence.map((d) => intern(d, declarations, declarationIds)) },
                  candidates,
                  candidateIds,
                ),
              })),
            })),
          },
        }
      : {}),
  }));
  return { ...report, findings, suggestionIndex: { candidates, declarations } };
}

/** Expand by reference, without copying shared evidence at every use site. */
export function expandReportData(data: ReturnType<typeof reportData>): AuditReport {
  const { suggestionIndex, ...report } = data;
  const candidates = suggestionIndex.candidates.map(({ declarationRefs, ...c }) => ({
    ...c,
    declarations: declarationRefs.map((id) => suggestionIndex.declarations[id]),
  }));
  return {
    ...report,
    findings: report.findings.map(({ suggestion, ...f }) => ({
      ...f,
      ...(suggestion
        ? {
            suggestion: {
              ...suggestion,
              values: suggestion.values.map((s) => ({
                ...s,
                candidates: s.candidates.map((c) => candidates[c.candidateRef]),
              })),
            },
          }
        : {}),
    })),
  };
}

export type SerializedAuditReport = ReturnType<typeof reportData>;
