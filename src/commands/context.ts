import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adaptersFor } from '../adapters/registry.ts';
import type { LoadedConfig } from '../config/load.ts';
import { resolveSource } from '../core/source.ts';

/**
 * `context` — what a session needs to know before it does anything else.
 *
 * The skill's setup step required this command for a while before it existed,
 * which made an instruction document lie to the agent reading it. It reports only
 * what it can actually establish: which config was loaded, whether the project
 * declares a design system, and which adapters recognise the tree. No analysis,
 * no findings — run `audit` for those.
 */
export function context(target: string, loaded: LoadedConfig): void {
  const { meta, source, live } = resolveSource(target);
  const adapters = adaptersFor(source);

  console.log(`\n  ds-loop context — ${meta.label}`);
  console.log(`  ${live ? 'live scan' : 'fixture'} at ${source.root}`);
  console.log(`  version ${meta.fixtureSha}\n`);

  console.log(`  config      ${loaded.source}`);
  const overrides = Object.keys(loaded.severityOverrides);
  if (overrides.length > 0)
    console.log(`              ${overrides.length} severity override(s): ${overrides.join(', ')}`);
  if (loaded.source === 'defaults') {
    console.log('              UNCALIBRATED — thresholds are neutral starting points.');
    console.log('              Run `ds-loop sweep` before trusting a ΔE cutoff on this palette.');
  }

  // Intent is not only ever written in a DESIGN-SYSTEM.md. It lives in contribution
  // guides, ADRs, component contracts and team decisions, and treating one missing
  // filename as "nothing states the intent" is an overclaim about someone's project.
  const INTENT_SOURCES = [
    'DESIGN-SYSTEM.md',
    'docs/DESIGN-SYSTEM.md',
    'CONTRIBUTING.md',
    'docs/CONTRIBUTING.md',
    '.github/CONTRIBUTING.md',
    'docs/adr',
    'docs/decisions',
    'STYLEGUIDE.md',
    'docs/design-system.md',
  ];
  const found = INTENT_SOURCES.filter((p) => existsSync(join(source.root, p)));

  if (found.length > 0) {
    const primary = found[0]!;
    const front = readFileSync(join(source.root, primary), 'utf8').split('\n')[0] ?? '';
    console.log(`  declared    ${found.join(', ')}${front.startsWith('---') ? ' (frontmatter)' : ''}`);
    console.log('              read these before treating any finding as drift — a value that');
    console.log('              disagrees with a stated convention is drift; one that disagrees');
    console.log('              with nothing is a convention nobody wrote down yet.');
  } else {
    console.log(`  declared    none found in ${INTENT_SOURCES.length} usual places`);
    console.log('              which is not the same as "this team has no conventions". Intent');
    console.log('              also lives in component contracts, lint configs, review habits,');
    console.log('              and decisions never written down. Ask before assuming absence:');
    console.log('              an absent agreement is not a violated one, and a convention you');
    console.log('              have not found is not a convention that does not exist.');
  }

  if (adapters.length === 0) {
    console.log('  adapters    none recognise this tree — no token files or class strings found.');
  } else {
    console.log(`  adapters    ${adapters.map((a) => `${a.id}@${a.version}`).join(' + ')}`);
  }

  console.log('\n  next        ds-loop audit .        every deterministic rule, severity-ranked');
  console.log('              ds-loop sweep .        the ΔE cutoff curve for this palette\n');
}
