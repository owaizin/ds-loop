import type { SourceRef } from '../adapters/types.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import type { FixtureMeta } from '../core/fixture.ts';
import type { RawValue } from '../core/provenance.ts';

export type Severity = 'blocking' | 'high' | 'medium' | 'low';

/** the slice of a design system a rule speaks to — used to route `audit <target>` */
export type RuleTarget = 'tokens' | 'color' | 'spacing' | 'typography' | 'elevation' | 'motion';

export type Finding = {
  ruleId: string;
  severity: Severity;
  /** one-line statement of the defect */
  summary: string;
  /** where — token name, file:line, or a count */
  where: string;
  /** what to do about it */
  fix: string;
  /** what breaks if it is left alone — copied from the rule when the finding is built */
  impact?: string;
  /** machine-readable payload for scorecards and diffs */
  data?: Record<string, unknown>;
};

export type RuleContext = {
  meta: FixtureMeta;
  source: SourceRef;
  config: DsOpsConfig;
  /** every value the adapter pulled, pre-classified */
  values: RawValue[];
  /** just the ones classified `color` */
  colors: RawValue[];
};

export type Rule = {
  id: string;
  title: string;
  /**
   * What breaks if this finding is ignored — one line, in domain vocabulary.
   *
   * A severity label ranks findings against each other; it does not tell a
   * reader what it costs to leave one alone, and "I don't know the risk and
   * impact" was the first thing a real user said to a nine-finding audit. This
   * is the answer, and it belongs on the rule because the cost is a property of
   * the defect, not of the run.
   */
  impact: string;
  targets: RuleTarget[];
  /** deterministic — no LLM, no network. returns zero findings when the system is clean. */
  run(ctx: RuleContext): Finding[];
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  blocking: 0,
  high: 1,
  medium: 2,
  low: 3,
};
