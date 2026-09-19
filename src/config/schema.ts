/**
 * The config object is the mechanism/policy seam.
 *
 * ds-loop (this repo) is policy-free mechanism. Every tuned number lives here as a
 * field with an UNCALIBRATED default. The calibrated values live in the private
 * `ds-loop-calibration` repo and are passed in at run time. Nothing in `src/`
 * outside this file may hardcode a threshold — if it does, the seam has leaked.
 *
 * The taxonomy hints below are the one place an opinion is baked into the open
 * engine on purpose (see README "The leaky seam"). They are still config, so a
 * consumer can override them, but the defaults carry a point of view.
 */

export type DsOpsConfig = {
  clustering: {
    /**
     * CIEDE2000 ΔE below which two colors are treated as the same design intent.
     * This single number decides whether a palette has 7 greys or 11.
     * UNCALIBRATED default — see ds-loop-calibration for tuned values per source.
     */
    deltaE: number;
  };
  taxonomy: {
    /** token-name substrings that force a color into `shadow-internal` */
    shadowTokenHints: string[];
    /** an rgba/hsla alpha at or below this is treated as shadow-internal, not a color */
    shadowAlphaCeiling: number;
    /** token-name substrings that mark a value as a sanctioned non-color (excluded, not ambiguous) */
    nonColorTokenHints: string[];
    /**
     * Utility prefixes whose arbitrary LENGTH value means the design scale was
     * bypassed — spacing, type, radius. Everything else (`w`, `h`, `top`,
     * `translate-y`) is geometry: a one-off layout number is what an arbitrary
     * value is legitimately for, and counting it as drift buries the real
     * findings. A hardcoded COLOUR is drift on any utility, so this does not
     * apply to colours.
     * UNCALIBRATED default — measured against one design system, not tuned.
     */
    scaleUtilities: string[];
    /**
     * Utility prefixes that set a COLOUR (`bg`, `text`, `border`, `ring`). Used
     * to spot a use site naming a stock palette entry — `bg-white`,
     * `text-slate-900` — instead of the theme token that carries that role.
     * UNCALIBRATED default — Tailwind's colour utilities, not tuned.
     */
    colorUtilities: string[];
    /**
     * Palette family names that ship with the CSS framework rather than with
     * this design system. A colour utility naming one of these is theme-blind:
     * it resolves to the same value in every mode, so a rebrand or a dark theme
     * cannot reach it. Empty list disables `token/stock-palette-utility`.
     * UNCALIBRATED default — Tailwind's default palette, not tuned.
     */
    stockPaletteFamilies: string[];
    /**
     * Share of referencing tokens that must match SOME tier pattern before the
     * tier rules are treated as having run. Below it, `token/tier-leakage`
     * cannot judge anything, and reporting nothing would read as a pass — so
     * `token/tier-model-undetectable` says so instead.
     * UNCALIBRATED default.
     */
    tierCoverageFloor: number;
    /**
     * RegExp source (case-insensitive) matching a PRIMITIVE token name — a raw
     * palette entry or numbered scale step. Anything not matching is treated as
     * a semantic token and is expected to be a var() reference, not a literal.
     * This is a judgment call about the target's convention; override per source.
     */
    primitivePattern: string;
    /**
     * Name segments that mark a token as a CATEGORY token — a chart series, a
     * subject colour — where the colour name IS the identity. These look like
     * numbered scale steps (`--chart-1`) and so match `primitivePattern`, which
     * made a source with no palette tier report ten primitives and get told to
     * "point each at a primitive". Identified in calibration row 007, still
     * misreporting three rows later.
     */
    categoryTokenHints: string[];
    /**
     * RegExp source (case-insensitive) matching a COMPONENT-tier token name
     * (button.background, card.padding). Component tokens may reference only
     * semantic tokens — never primitives, never upward.
     */
    componentPattern: string;
    /**
     * Token-name prefixes (after the namespace) that mark a token as living in
     * the design system's semantic space rather than being an unknown var.
     */
    semanticNamespaces: string[];
    /**
     * Terms that must not appear in a SEMANTIC token name — a semantic token
     * describing appearance (color.semantic.blue) is a primitive with extra
     * steps. Colour names, size words, generic qualifiers.
     */
    reservedSemanticTerms: string[];
  };
  sweep: {
    min: number;
    max: number;
    step: number;
  };
};

/**
 * Stable, order-independent digest of the whole config — one of the three causes a
 * measurement delta must be attributable to (source / adapter / threshold).
 *
 * The first version passed `Object.keys(config).sort()` as JSON.stringify's second
 * argument, believing it sorted keys. That argument is a property *allowlist*, and
 * it applies at every depth — so only the three top-level names survived and every
 * config on earth serialised to `{"clustering":{},"sweep":{},"taxonomy":{}}`. The
 * hash was the constant `5c40eb56` regardless of tuning, which means the threshold
 * leg of the attribution model never worked and every recorded `configHash` is
 * meaningless. Found 2026-09-17 by expecting a scorecard comparison to be flagged
 * dirty after a `--config` change and watching it pass.
 */
export function hashConfig(config: DsOpsConfig): string {
  let h = 5381;
  const json = stableStringify(config);
  for (let i = 0; i < json.length; i++) h = (h * 33) ^ json.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** JSON with object keys sorted at every depth, so key order cannot change the digest */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
