import type { Adapter } from '../adapters/types.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { hashConfig } from '../config/schema.ts';
import { classifyForm } from '../rules/color.ts';
import { type Tier, classifyTier } from '../rules/tier.ts';
import type { Coverage } from './coverage.ts';
import type { RawValue } from './provenance.ts';

/**
 * `DESIGN-SYSTEM.md` — the contract the rules are already arguing with.
 *
 * Two rules tell a reader to record a sanctioned deviation in this file, and
 * `context` reads it as an intent source, and nothing in the tool ever created
 * it. So the instruction pointed at a filename that did not exist, and the
 * deviation went unrecorded and got re-flagged every run.
 *
 * What this writes is MEASURED, never inferred: the namespaces, tiers, storage
 * forms and counts the adapters actually saw, each one a fact with a number
 * behind it. Everything the tool cannot know — what the naming convention is
 * SUPPOSED to be, which tiers a namespace is designed to have — is written as an
 * open question, marked TODO, in the reader's file to answer. A generated
 * sentence claiming a convention nobody stated would be exactly the fabrication
 * `context` already refuses to make about a missing file.
 *
 * ponytail: generated once, never merged. A file that exists is never rewritten —
 * it is prose someone edited, and no measurement is worth clobbering it.
 */

export type ContractFacts = {
  label: string;
  fixtureSha: string;
  config: DsOpsConfig;
  adapters: Adapter[];
  values: RawValue[];
  coverage: Coverage;
  generatedAt: string;
};

const TIERS: Tier[] = ['primitive', 'semantic', 'component', 'unknown'];

/**
 * The namespace a reader sees: the first segment after `--`, or the first two
 * when segment 0 is a brand prefix (`--ds-color-…`).
 *
 * A token with no second segment has no namespace — `--paper` is a name, not a
 * family — and printing it as `--paper-…` would invent a layer this system does
 * not have. Those are counted separately and reported as what they are.
 */
function namespacesOf(
  values: RawValue[],
  config: DsOpsConfig,
): { namespaces: Map<string, number>; flat: string[] } {
  const namespaces = new Map<string, number>();
  const flat: string[] = [];
  for (const v of values) {
    const name = v.provenance.tokenName;
    if (name === null) continue;
    const segs = name.toLowerCase().replace(/^--/, '').split('-');
    if (segs.length < 2) {
      if (!flat.includes(name)) flat.push(name);
      continue;
    }
    // when segment 0 is a brand prefix, the namespace people read is segment 1
    const ns =
      segs.length > 2 && config.taxonomy.semanticNamespaces.includes(segs[1] ?? '')
        ? `${segs[0]}-${segs[1]}`
        : (segs[0] ?? '');
    if (ns !== '') namespaces.set(ns, (namespaces.get(ns) ?? 0) + 1);
  }
  return { namespaces, flat };
}

function table(rows: string[][], headers: string[]): string[] {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
}

const topN = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

export function renderContract(f: ContractFacts): string {
  const declarations = f.values.filter((v) => v.provenance.tokenName !== null);
  const colors = declarations.filter((v) => v.provenance.classification === 'color');

  const tiers = new Map<Tier, number>();
  for (const v of declarations) {
    const t = classifyTier(v.provenance.tokenName, f.config);
    tiers.set(t, (tiers.get(t) ?? 0) + 1);
  }
  const forms = new Map<string, number>();
  for (const v of colors) {
    const form = classifyForm(v.raw);
    forms.set(form, (forms.get(form) ?? 0) + 1);
  }
  const { namespaces, flat } = namespacesOf(declarations, f.config);
  const useSites = f.values.filter((v) => v.provenance.tokenName === null).length;

  const L: string[] = [];
  L.push('---');
  L.push(`generated_by: ds-loop context --write-contract`);
  L.push(`source: ${f.label}`);
  L.push(`version: ${f.fixtureSha}`);
  L.push(`config_hash: ${hashConfig(f.config)}`);
  L.push(`generated_at: ${f.generatedAt}`);
  L.push('---');
  L.push('');
  L.push('# Design system contract');
  L.push('');
  L.push('Half measured, half unanswered. Everything under **Measured** is a count ds-loop took from this');
  L.push(
    'source. Everything marked TODO is a decision the tool cannot read off the code — answer it here and',
  );
  L.push('the rules stop guessing. `ds-loop context` reads this file back on every session.');
  L.push('');

  L.push('## Measured');
  L.push('');
  L.push(`Read by ${f.adapters.map((a) => `\`${a.id}@${a.version}\``).join(' + ')}.`);
  L.push('');
  L.push(
    `- **${declarations.length}** token declarations · **${colors.length}** colour, **${new Set(colors.map((v) => v.raw.toLowerCase())).size}** distinct`,
  );
  L.push(`- **${useSites}** use-site values (a value written where it is used, not declared)`);
  L.push('');

  if (namespaces.size > 0) {
    L.push('### Namespaces in use');
    L.push('');
    L.push(
      ...table(
        topN(namespaces, 12).map(([ns, n]) => [`\`--${ns}-…\``, String(n), 'TODO — what does this hold?']),
        ['namespace', 'tokens', 'intent'],
      ),
    );
    if (namespaces.size > 12) L.push(`| … | ${namespaces.size - 12} more | |`);
    L.push('');
  }
  if (flat.length > 0) {
    L.push(
      `**${flat.length}** token(s) have no namespace at all — a bare name, not a family: ${flat
        .slice(0, 8)
        .map((n) => `\`${n}\``)
        .join(', ')}${flat.length > 8 ? ', …' : ''}.`,
    );
    L.push('');
    L.push('That is a measurement, not a defect. A flat set is a legitimate choice for a small');
    L.push('system; it does mean the tier rules have nothing to read, so say below whether the');
    L.push('flatness is the design.');
    L.push('');
  }

  L.push('### Tiers, as the configured patterns read them');
  L.push('');
  L.push(
    ...table(
      TIERS.filter((t) => (tiers.get(t) ?? 0) > 0).map((t) => [t, String(tiers.get(t) ?? 0)]),
      ['tier', 'tokens'],
    ),
  );
  L.push('');
  if ((tiers.get('unknown') ?? 0) > 0) {
    L.push(
      `\`unknown\` is not a verdict about those ${tiers.get('unknown')} tokens — it means the configured`,
    );
    L.push('patterns did not recognise their names. Either the names are inconsistent, or');
    L.push('`taxonomy.primitivePattern` / `semanticNamespaces` / `componentPattern` do not describe this');
    L.push('system yet. Decide which, below.');
    L.push('');
  }

  if (forms.size > 0) {
    L.push('### Colour storage forms');
    L.push('');
    L.push(
      ...table(
        [...forms.entries()].sort((a, b) => b[1] - a[1]).map(([form, n]) => [form, String(n)]),
        ['form', 'values'],
      ),
    );
    L.push('');
  }

  L.push('## Contract — TODO');
  L.push('');
  L.push('Unanswered. ds-loop cannot read intent off code, and a generated sentence claiming a');
  L.push('convention nobody stated would be worse than a blank.');
  L.push('');
  L.push('- **Primitive tier** — how is a palette/scale token named here? TODO');
  L.push('- **Semantic tier** — which namespaces are semantic, and what does each one mean? TODO');
  L.push('- **Component tier** — do component-owned tokens exist, and how are they named? TODO');
  L.push(
    '- **Tier depth** — does every namespace have all three tiers? Name the ones designed with two. TODO',
  );
  L.push('- **Storage form** — which colour notation is canonical, and why? TODO');
  L.push('- **Scales** — which spacing / type / radius scale is a token allowed to reference? TODO');
  L.push('');
  L.push('When these are answered, put the matching patterns in your ds-loop config so the rules read');
  L.push('this system instead of a default: `taxonomy.primitivePattern`, `taxonomy.semanticNamespaces`,');
  L.push('`taxonomy.componentPattern`.');
  L.push('');

  L.push('## Sanctioned deviations');
  L.push('');
  if (f.config.ignore.length === 0) {
    L.push('None recorded. A rule that is wrong about one token belongs here, as a config `ignore`');
    L.push('entry with a `reason` — not as a widened threshold, which silences the whole class.');
  } else {
    L.push(
      ...table(
        f.config.ignore.map((e) => [`\`${e.rule}\``, `\`${e.value ?? '*'}\``, e.reason, e.createdAt ?? '—']),
        ['rule', 'value', 'why it is not drift', 'recorded'],
      ),
    );
    L.push('');
    L.push('Mirrored from your ds-loop config. The config is the source of truth; this table is the');
    L.push('version a human reads.');
  }
  L.push('');

  L.push('## Not checked');
  L.push('');
  const unread = Object.entries(f.coverage.unreadFormats);
  if (unread.length > 0) {
    L.push(
      `Formats no adapter reads: ${unread.map(([ext, n]) => `${n}× \`${ext}\``).join(', ')}. Styling in`,
    );
    L.push('those files is outside every finding below, clean or not.');
  } else {
    L.push('Every format present in this tree was read by some adapter.');
  }
  L.push('');
  if (f.coverage.unreadTokenFiles.length > 0) {
    L.push(`Files whose name claims to hold tokens, in a format nothing reads:`);
    for (const p of f.coverage.unreadTokenFiles.slice(0, 8)) L.push(`- \`${p}\``);
    L.push('');
  }
  L.push('Which *rules* could not judge this source needs a rule run: `ds-loop audit . --json`,');
  L.push('unfiltered. The guard hook filters at high severity and will not surface it.');
  L.push('');
  return `${L.join('\n')}\n`;
}
