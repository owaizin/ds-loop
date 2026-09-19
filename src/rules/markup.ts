import type { Finding, Rule, RuleContext } from './types.ts';

/**
 * A component hardcodes a colour or a length at the use site instead of
 * referencing the design system: `bg-[#1da1f2]`, `p-[13px]`, `text-[14px]`.
 *
 * This is the other half of `color/semantic-holds-literal` and
 * `token/raw-dimension-in-semantic`: those two catch a token *declaration*
 * holding a literal, this catches a literal that never reached the token layer
 * at all. It is also the signature failure of generated code — an agent that
 * cannot find the right token reaches for a bracket, and the value is now
 * invisible to every theme, rebrand and audit that reads the token files.
 *
 * Keyed on `tokenName === null` (a use site, not a declaration), so it holds for
 * any future adapter that reads markup, not just Tailwind classes.
 */
export const rawValueInMarkupRule: Rule = {
  id: 'token/raw-value-in-markup',
  title: 'Component hardcodes a colour or length instead of referencing a token',
  impact:
    'The value is invisible to every theme, rebrand and audit that reads the token files — a rebrand ships and these sites keep the old colour.',
  targets: ['tokens', 'color', 'spacing', 'typography'],
  run(ctx: RuleContext): Finding[] {
    const offenders = ctx.values.filter(
      (v) =>
        v.provenance.tokenName === null &&
        (v.provenance.classification === 'color' || v.provenance.classification === 'dimension'),
    );
    if (offenders.length === 0) return [];

    const colors = offenders.filter((v) => v.provenance.classification === 'color');
    const dims = offenders.length - colors.length;
    const distinct = new Set(offenders.map((v) => v.raw.toLowerCase())).size;

    // the token layer read by a different adapter answers the only question that
    // matters for remediation: does a token already carry this exact value? If
    // it does, the fix is a swap, not a design decision.
    const declared = new Map<string, string>();
    for (const v of ctx.values) {
      const name = v.provenance.tokenName;
      if (name && v.provenance.classification !== 'reference') declared.set(norm(v.raw), name);
    }
    const covered = offenders
      .map((v) => ({ value: v.raw, token: declared.get(norm(v.raw)) }))
      .filter((h): h is { value: string; token: string } => h.token !== undefined);

    const swaps =
      covered.length === 0
        ? ''
        : `${dedupePairs(covered)
            .slice(0, 6)
            .map((h) => `${h.value} is already ${h.token}`)
            .join('; ')}. Swap those first. `;

    return [
      {
        ruleId: this.id,
        severity: 'high',
        summary: `${offenders.length} hardcoded value(s) at use sites bypass the token layer (${colors.length} colour, ${dims} length; ${distinct} distinct${covered.length > 0 ? `, ${covered.length} already declared as a token` : ''})`,
        where: offenders
          .slice(0, 8)
          .map(
            (v) =>
              `${v.provenance.property}-[${v.raw}]${v.provenance.selector ? ` (${v.provenance.selector})` : ''} at ${v.provenance.file}:${v.provenance.line}`,
          )
          .join('; '),
        fix: `${swaps}Replace each with the scale step or token that covers it — a utility that names the scale (bg-surface, p-4) or var(--token) via an arbitrary value. If no token matches the value, add one to the system first; a bracket is the system being bypassed, not extended.`,
        data: {
          count: offenders.length,
          colors: colors.length,
          dimensions: dims,
          distinct,
          alreadyDeclared: dedupePairs(covered),
          hits: offenders.slice(0, 40).map((v) => ({
            utility: v.provenance.property,
            value: v.raw,
            variants: v.provenance.selector,
            where: `${v.provenance.file}:${v.provenance.line}`,
            adapter: v.provenance.adapterId,
          })),
        },
      },
    ];
  },
};

const norm = (raw: string) => raw.replace(/\s+/g, ' ').trim().toLowerCase();

function dedupePairs(pairs: { value: string; token: string }[]): { value: string; token: string }[] {
  const byValue = new Map<string, { value: string; token: string }>();
  for (const p of pairs) if (!byValue.has(norm(p.value))) byValue.set(norm(p.value), p);
  return [...byValue.values()];
}
