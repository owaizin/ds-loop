import type { Adapter } from '../adapters/types.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { hashConfig } from '../config/schema.ts';
import { classifyForm } from '../rules/color.ts';
import { type Tier, classifyTier } from '../rules/tier.ts';
import type { Coverage } from './coverage.ts';
import { formatCoverage } from './coverage.ts';
import type { RawValue } from './provenance.ts';

/**
 * `DESIGN-SYSTEM.md` — the contract the rules are already arguing with.
 *
 * An optional starting document for teams without an existing decision home.
 * `context` locates it as an intent source; it does not interpret the prose or
 * apply exceptions from it. Rule configuration remains separate.
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
  L.push('The measurements below describe the values the adapters read. TODO marks decisions still needed.');
  L.push('`ds-loop context` can locate this file; an agent must read and apply its decisions.');
  L.push('Editing this document does not configure rules or suppress findings.');
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
    L.push('A flat name is not a defect. Configured patterns may still classify it; see the tier');
    L.push('counts below. Record the naming contract before interpreting a tier finding.');
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
    L.push('patterns did not recognise their names. Check the naming contract and configuration.');
    L.push('A valid model may also fall outside these tier checks; do not rename it just to obtain a match.');
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
  L.push('Resolve relevant questions from existing decisions or with the owner. Mark inapplicable');
  L.push('questions as such; these prompts do not require a three-tier model or a new architecture.');
  L.push('');
  L.push('- **Model and source** — what structure is adopted, and where is its source of truth? TODO');
  L.push('- **Primitive tier** — if used, how are palette/scale tokens named? TODO');
  L.push('- **Semantic tier** — if used, which names express roles and what do they mean? TODO');
  L.push('- **Component tier** — if used, how are component-owned tokens named? TODO');
  L.push('- **References** — which relationships are permitted by the adopted model? TODO');
  L.push(
    '- **Storage form** — which formats do the consumers require, and how are copies synchronized? TODO',
  );
  L.push('- **Scales** — which values are shared conventions, and where are local values intentional? TODO');
  L.push('');
  L.push('Where the model fits the engine, configure its naming patterns: `taxonomy.primitivePattern`,');
  L.push('`taxonomy.semanticNamespaces`, and `taxonomy.componentPattern`. Naming configuration does not');
  L.push('change permitted tier relationships. Record unsupported checks separately from passing checks.');
  L.push('');

  L.push('## Sanctioned deviations');
  L.push('');
  if (f.config.ignore.length === 0) {
    L.push(
      'None recorded in config. Check model applicability and configuration before adding an exception.',
    );
    L.push(
      'A justified exception uses a config `ignore` entry with a reason and the intended file/value scope.',
    );
    L.push('An exception excludes inputs from a check; it does not prove the excluded values are correct.');
  } else {
    L.push(
      ...table(
        f.config.ignore.map((e) => [
          `\`${e.rule}\``,
          `\`${e.value ?? '*'}\``,
          e.files === undefined
            ? 'all files'
            : e.files.length === 0
              ? 'no files'
              : e.files.map((file) => `\`${file}\``).join(', '),
          e.reason,
          e.createdAt ?? '—',
        ]),
        ['rule', 'value', 'files', 'reason', 'recorded'],
      ),
    );
    L.push('');
    L.push('Mirrored from your ds-loop config. The config is the source of truth; this table is the');
    L.push('version a human reads.');
  }
  L.push('');

  L.push('## Not checked');
  L.push('');
  // This command extracts values but runs no rules. Keep extraction limits while
  // preventing formatCoverage's all-rules-complete summary from claiming a rule run.
  L.push('```text');
  L.push(...formatCoverage({ ...f.coverage, complete: false }));
  L.push('```');
  L.push('');
  L.push('Which *rules* could not judge this source needs a rule run: `ds-loop audit . --json`,');
  L.push('unfiltered. The guard hook filters at high severity and will not surface it.');
  L.push('');
  return `${L.join('\n')}\n`;
}
