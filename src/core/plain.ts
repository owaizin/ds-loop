import type { Coverage } from './coverage.ts';

export type PlainWords = { title: string; description: string };

/** Human wording only; never replaces the engine’s stable findings. */
export const PLAIN_RULES: Record<string, PlainWords> = {
  'docs/undocumented-shared-component': {
    title: 'Missing component guidance',
    description: 'No adjacent story or documentation page was found for this exported component.',
  },
  'token/raw-value-in-style': {
    title: 'Hard-coded styles',
    description:
      'Colours or spacing typed directly into CSS instead of using your design tokens, so a theme change can miss them.',
  },
  'token/raw-value-in-markup': {
    title: 'Hard-coded component styles',
    description: 'Values typed directly into component classes bypass shared design tokens.',
  },
  'token/stock-palette-utility': {
    title: 'Framework colours used directly',
    description: 'Components use framework palette names. Check whether those colours belong to your theme.',
  },
  'token/tier-leakage': {
    title: 'Components skip shared roles',
    description:
      'Component tokens refer directly to palette values instead of shared roles, which can make themes harder to change.',
  },
  'token/upstream-bypass': {
    title: 'Shared aliases are bypassed',
    description: 'Product styles reach into an upstream library instead of using the project’s own aliases.',
  },
  'token/tier-model-undetectable': {
    title: 'Token roles could not be identified',
    description:
      'The configured naming patterns do not identify enough token roles to check their relationships.',
  },
  'token/semantic-name-describes-appearance': {
    title: 'Token names describe looks',
    description:
      'Names describe a colour or size instead of the job a token does, which can become misleading when themes change.',
  },
  'token/var-missing-fallback': {
    title: 'Missing backup values',
    description: 'Token references have no fallback value to use when the referenced token is unavailable.',
  },
  'token/raw-dimension-in-semantic': {
    title: 'Sizes bypass the shared scale',
    description:
      'Role-based size tokens contain direct measurements instead of references to the shared scale.',
  },
  'color/semantic-holds-literal': {
    title: 'Role colours bypass the palette',
    description:
      'Role-based colour tokens contain direct colour values instead of references to the palette.',
  },
  'color/literal-duplicate-tokens': {
    title: 'Repeated colour values',
    description: 'Several tokens store the same colour. Check whether they should share a palette value.',
  },
  'color/near-duplicate-primitives': {
    title: 'Very similar palette colours',
    description:
      'Some palette colours are close in appearance. Review their intended uses before merging them.',
  },
  'color/mixed-storage-forms': {
    title: 'Colours use different formats',
    description: 'The palette mixes colour formats, making comparison and maintenance harder.',
  },
  'color/no-intent-plateau': {
    title: 'Palette structure needs review',
    description:
      'Colour grouping does not hold near the declared palette size across the configured comparison range. This does not prove the palette is wrong.',
  },
};

export const PLAIN_VERDICTS = {
  clean: {
    title: 'No problems found in the checks run',
    description: 'This describes only the code and checks covered below.',
  },
  issues: {
    title: 'Problems to review',
    description: 'These checks found possible problems. Their counts are not a quality grade.',
  },
  'not-checked': {
    title: 'Not checked',
    description: 'No supported reader checked this source. This is not a clean result.',
  },
};
export const PLAIN_COVERAGE = {
  documentation: {
    title: 'Component documentation',
    description: 'Local evidence of stories, pages, types and examples; presence is not quality.',
  },
  complete: {
    title: 'Checked within the supported scope',
    description: 'No additional gaps were reported; this is not a check of every product behaviour.',
  },
  partialReads: {
    title: 'What we read',
    description: 'Each reader checks only the parts of a file described here.',
  },
  unreadFormats: {
    title: 'File types we cannot read',
    description: 'Styling in these files was not checked.',
  },
  unreadTokenFiles: {
    title: 'Token files we cannot read',
    description: 'These likely token files use an unsupported format.',
  },
  unconvertible: {
    title: 'Colours we cannot compare',
    description: 'These colour values were recognised but could not be compared.',
  },
  undecided: {
    title: 'Colour roles need review',
    description: 'These colours may be overlays rather than palette entries.',
  },
  unclassifiedStyles: {
    title: 'Style expressions we cannot interpret',
    description: 'These expressions were read but could not be classified.',
  },
  excludedKeywords: {
    title: 'CSS keywords and generic fonts recognised and excluded',
    description: 'These components are not tokenizable literals.',
  },
  unclassifiedDeclarations: {
    title: 'Token values we cannot interpret',
    description: 'Aliases or composite values could not be evaluated.',
  },
  couldNotJudge: {
    title: 'Checks that could not reach a conclusion',
    description: 'These checks did not establish a clean result.',
  },
} satisfies Record<keyof Coverage, PlainWords>;

export function plainCoverage(c: Coverage): string[] {
  const lines = c.partialReads.map(
    (p) => `${PLAIN_COVERAGE.partialReads.title}: ${p.extensions.join(', ')} — ${p.reads}`,
  );
  if (!lines.length) lines.push('No supported reader checked this source.');
  for (const [ext, count] of Object.entries(c.unreadFormats))
    lines.push(`${PLAIN_COVERAGE.unreadFormats.title}: ${count} ${ext} files`);
  if (c.unreadTokenFiles.length)
    lines.push(`${PLAIN_COVERAGE.unreadTokenFiles.title}: ${c.unreadTokenFiles.join(', ')}`);
  for (const key of [
    'unconvertible',
    'undecided',
    'unclassifiedStyles',
    'unclassifiedDeclarations',
    'excludedKeywords',
  ] as const) {
    const row = c[key];
    if (row?.count) lines.push(`${PLAIN_COVERAGE[key].title}: ${row.count} — ${row.samples.join(', ')}`);
  }
  for (const id of c.couldNotJudge)
    lines.push(`${PLAIN_COVERAGE.couldNotJudge.title}: ${PLAIN_RULES[id]?.title ?? id} (${id})`);
  lines.push(
    c.complete
      ? PLAIN_COVERAGE.complete.description
      : 'Some checks are incomplete. Read the limits before relying on this result.',
  );
  if (c.documentation) {
    for (const p of c.documentation.packages)
      lines.push(
        `Component documentation · ${p.package}: ${p.ratios.documented === null ? 'not checked' : `${(p.ratios.documented * 100).toFixed(1)}% with a story or docs page`}`,
      );
    if (!c.documentation.packages.length)
      lines.push('Component documentation: not checked — no shared component inventory in scope.');
    lines.push(...c.documentation.limits);
  }
  return lines;
}
