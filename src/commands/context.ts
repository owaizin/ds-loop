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

  const declared = ['DESIGN-SYSTEM.md', 'docs/DESIGN-SYSTEM.md'].find((p) =>
    existsSync(join(source.root, p)),
  );
  if (declared) {
    const front = readFileSync(join(source.root, declared), 'utf8').split('\n').slice(0, 1).join('');
    console.log(`  declared    ${declared}${front.startsWith('---') ? ' (has frontmatter)' : ''}`);
  } else {
    console.log('  declared    no DESIGN-SYSTEM.md — nothing states what this system intends.');
    console.log('              An absent agreement is not a violated one: without a declared');
    console.log('              expectation, an arbitrary value is not yet evidence of drift.');
  }

  if (adapters.length === 0) {
    console.log('  adapters    none recognise this tree — no token files or class strings found.');
  } else {
    console.log(`  adapters    ${adapters.map((a) => `${a.id}@${a.version}`).join(' + ')}`);
  }

  console.log('\n  next        ds-loop audit .        every deterministic rule, severity-ranked');
  console.log('              ds-loop sweep .        the ΔE cutoff curve for this palette\n');
}
