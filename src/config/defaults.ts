import type { DsOpsConfig } from './schema.ts';

/**
 * UNCALIBRATED defaults.
 *
 * These are deliberately neutral starting points, not recommendations. The whole
 * premise of ds-loop is that the right ΔE cutoff is discovered per-source by the
 * `sweep` command, then recorded in ds-loop-calibration. Running `scan` with these
 * defaults tells you the shape of the data, not the answer.
 *
 * ΔE 2.3 is the classic "just noticeable difference" figure. It is here because
 * it is a defensible neutral, not because it is correct for any given palette.
 */
export const DEFAULT_CONFIG: DsOpsConfig = {
  clustering: {
    deltaE: 2.3,
  },
  taxonomy: {
    shadowTokenHints: ['shadow', 'elevation', 'glow', 'ring-offset'],
    shadowAlphaCeiling: 0.25,
    nonColorTokenHints: ['gradient', 'backdrop', 'scrim-opacity'],
    // spacing, type and radius come off a scale; width/height/inset/transform
    // are geometry and are excluded on purpose. Measured on a real design system:
    // 241 dimension hits, of which ~28 of 40 sampled were geometry, not drift.
    // Tailwind's colour utilities. Only used to read the value half of a NAMED
    // utility (bg-slate-900); arbitrary colour values are judged without it.
    // `shadow` and `ring-offset` are left out on purpose: a shadow colour is part
    // of an elevation recipe, the same carve-out shadowTokenHints makes in CSS.
    colorUtilities: [
      'bg',
      'text',
      'border',
      'ring',
      'fill',
      'stroke',
      'outline',
      'divide',
      'placeholder',
      'caret',
      'accent',
      'decoration',
      'from',
      'via',
      'to',
    ],
    // Tailwind's default palette families plus the two absolutes. These are the
    // framework's colours, not the system's: `bg-white` is the same white in
    // every theme, which is how a light-mode card survived into dark mode.
    stockPaletteFamilies: [
      'white',
      'black',
      'slate',
      'gray',
      'grey',
      'zinc',
      'neutral',
      'stone',
      'red',
      'orange',
      'amber',
      'yellow',
      'lime',
      'green',
      'emerald',
      'teal',
      'cyan',
      'sky',
      'blue',
      'indigo',
      'violet',
      'purple',
      'fuchsia',
      'pink',
      'rose',
    ],
    scaleUtilities: [
      'p',
      'px',
      'py',
      'pt',
      'pr',
      'pb',
      'pl',
      'ps',
      'pe',
      'm',
      'mx',
      'my',
      'mt',
      'mr',
      'mb',
      'ml',
      'ms',
      'me',
      'gap',
      'gap-x',
      'gap-y',
      'space-x',
      'space-y',
      'text',
      'leading',
      'tracking',
      'indent',
      'rounded',
      'rounded-t',
      'rounded-r',
      'rounded-b',
      'rounded-l',
      'rounded-tl',
      'rounded-tr',
      'rounded-br',
      'rounded-bl',
      'border',
      'border-x',
      'border-y',
      'border-t',
      'border-r',
      'border-b',
      'border-l',
    ],
    // chart/series/category tokens are named for their colour on purpose; they are
    // not palette primitives, even though `--chart-1` looks like a scale step
    categoryTokenHints: ['chart', 'series', 'category', 'subject'],
    // `raw`/`palette`/`scale`/`ref` anywhere, OR a trailing numeric scale step
    // (--slate-500, --amber-9), OR a trailing named scale step
    // (--font-size-xs, --line-height-tight, --radius-full). Tailwind and Radix both
    // use this shape.
    primitivePattern:
      '(^|-)(raw|palette|scale|ref)(-|$)|-\\d{1,4}$|-(xs|sm|md|lg|xl|xxs|xxl|2xl|3xl|4xl|base|none|full|tight|snug|normal|relaxed|loose)$',
    // a token named for a widget right after the --ns- prefix (--ds-button-bg).
    // checked AFTER the semantic-namespace test, so --ds-color-bg-skeleton stays semantic.
    componentPattern:
      '^--[a-z0-9]+-(button|btn|card|input|field|badge|chip|tag|tab|modal|dialog|drawer|sheet|popover|tooltip|toast|banner|alert|avatar|checkbox|radio|switch|slider|select|menu|table|accordion|breadcrumb|pagination|progress|spinner|skeleton|divider)(-|$)',
    semanticNamespaces: [
      'color',
      'type',
      'text',
      'font',
      'space',
      'spacing',
      'size',
      'elevation',
      'shadow',
      'motion',
      'transition',
      'radius',
      'border',
      'opacity',
      'z',
    ],
    reservedSemanticTerms: [
      'blue',
      'green',
      'red',
      'orange',
      'yellow',
      'purple',
      'violet',
      'pink',
      'teal',
      'cyan',
      'sky',
      'indigo',
      'fuchsia',
      'rose',
      'lime',
      'emerald',
      'amber',
      'slate',
      'gray',
      'grey',
      'zinc',
      'stone',
      'neutral',
    ],
    // measured on two real repos: one classified 0 of 17 referencing tokens, the
    // other 2 of 71. Both looked like a clean tier pass and neither was checked.
    tierCoverageFloor: 0.5,
  },
  sweep: {
    min: 0.5,
    max: 12,
    step: 0.25,
  },
};
