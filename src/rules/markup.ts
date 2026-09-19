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

/**
 * A use site names the CSS framework's own palette — `bg-white`,
 * `text-slate-900`, `border-zinc-200` — instead of the theme token that carries
 * that role. Distinct from `token/raw-value-in-markup`: nothing here is
 * hardcoded in the literal sense, and the class is valid Tailwind. It is still
 * outside the system, because a stock palette entry resolves to one value in
 * every mode: the theme cannot reach it, so dark mode and a rebrand both miss it.
 *
 * shadcn/ui states the contract this encodes: semantic theme tokens exist so you
 * "override those tokens in your CSS to change the look of your app without
 * rewriting component classes". A stock palette class is the case where you have
 * to rewrite the class. https://ui.shadcn.com/docs/theming
 *
 * Fires only when the run also read theme colour tokens. Without a token layer
 * there is no system being bypassed, and the finding would be noise on every
 * plain Tailwind app.
 */
export const stockPaletteUtilityRule: Rule = {
  id: 'token/stock-palette-utility',
  title: 'Use site names the framework palette instead of a theme token',
  impact:
    'A theme switch cannot reach these classes: they resolve to the same value in every mode, so a light card stays light in dark mode and a rebrand misses them entirely.',
  targets: ['tokens', 'color'],
  run(ctx: RuleContext): Finding[] {
    const offenders = ctx.values.filter((v) => v.provenance.classification === 'palette-utility');
    if (offenders.length === 0) return [];

    // the token layer, read by the CSS adapter — the thing being bypassed
    const themeTokens = ctx.colors.filter((v) => v.provenance.tokenName !== null);
    if (themeTokens.length === 0) return [];

    const distinct = new Set(offenders.map((v) => `${v.provenance.property}-${v.raw}`));
    const files = new Set(offenders.map((v) => v.provenance.file));
    // a stock colour under a `dark:` variant is the author hand-rolling the
    // theme switch the token layer already does — worth naming separately.
    const themed = offenders.filter((v) => (v.provenance.selector ?? '').includes('dark'));

    return [
      {
        ruleId: this.id,
        severity: 'medium',
        summary: `${offenders.length} use site(s) name the framework palette instead of a theme token (${distinct.size} distinct across ${files.size} file(s)${themed.length > 0 ? `, ${themed.length} under a dark: variant` : ''})`,
        where: offenders
          .slice(0, 8)
          .map(
            (v) =>
              `${v.provenance.property}-${v.raw}${v.provenance.selector ? ` (${v.provenance.selector})` : ''} at ${v.provenance.file}:${v.provenance.line}`,
          )
          .join('; '),
        fix: `Replace each with the semantic utility that reads the token (bg-surface, text-muted-foreground). A stock palette class is theme-blind: it renders the same value in every mode, so a light card stays light in dark mode. ${themed.length > 0 ? 'The dark: variants are the token layer being re-implemented by hand — delete the variant, not just the class. ' : ''}This audit checks structure, not rendering: confirm the swap in the browser in both modes.`,
        data: {
          count: offenders.length,
          distinct: distinct.size,
          files: files.size,
          underDarkVariant: themed.length,
          hits: offenders.slice(0, 40).map((v) => ({
            utility: v.provenance.property,
            value: v.raw,
            variants: v.provenance.selector,
            where: `${v.provenance.file}:${v.provenance.line}`,
          })),
        },
      },
    ];
  },
};
