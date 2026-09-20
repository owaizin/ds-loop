import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adaptersFor } from '../adapters/registry.ts';

import type { LoadedConfig } from '../config/load.ts';
import { renderContract } from '../core/contract.ts';
import { buildCoverage, formatCoverage } from '../core/coverage.ts';
import { resolveSource } from '../core/source.ts';

/** the contract's home, and the first place `INTENT_SOURCES` looks for it */
const CONTRACT = 'DESIGN-SYSTEM.md';

/**
 * `context` — what a session needs to know before it does anything else.
 *
 * The skill's setup step required this command for a while before it existed,
 * which made an instruction document lie to the agent reading it. It reports only
 * what it can actually establish: which config was loaded, whether the project
 * declares a design system, and which adapters recognise the tree. No analysis,
 * no findings — run `audit` for those.
 */
export function context(target: string, loaded: LoadedConfig, opts: { writeContract?: boolean } = {}): void {
  const { meta, source, live } = resolveSource(target);
  const adapters = adaptersFor(source, loaded.config);

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
    // Agent instruction files first, because that is where a team writing for
    // agents puts the rules an agent is about to break. Learned the hard way: a
    // drawer pilot argued for three paragraphs that a radius convention might not
    // exist, while the repository's own AGENTS.md said "strict scale — no others
    // allowed" and named the exact utilities never to use. This command reported
    // only `docs/decisions/` because it was not looking here.
    'AGENTS.md',
    'CLAUDE.md',
    '.github/AGENTS.md',
    '.cursorrules',
    '.cursor/rules',
    // then the human-facing homes for the same intent
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
  // a decision directory is an intent source as much as a file is; only one of the
  // two can be read as text, and assuming otherwise crashed with EISDIR
  const found = INTENT_SOURCES.filter((p) => existsSync(join(source.root, p))).map((p) => ({
    path: p,
    isDir: statSync(join(source.root, p)).isDirectory(),
  }));

  if (found.length > 0) {
    const firstFile = found.find((f) => !f.isDir);
    const front = firstFile
      ? (readFileSync(join(source.root, firstFile.path), 'utf8').split('\n')[0] ?? '')
      : '';
    const shown = found.map((f) => (f.isDir ? `${f.path}/` : f.path)).join(', ');
    console.log(`  declared    ${shown}${front.startsWith('---') ? ' (frontmatter)' : ''}`);
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

  // Coverage limits belong here, once, at session setup. The guard cannot carry
  // them after every edit without becoming noise, and a severity floor legitimately
  // hides low findings — so this is the channel that states the scope up front.
  // No rules are run, so rule-judgement limits are not knowable yet; extraction
  // limits are, and those are the ones that silently shrink every later result.
  if (adapters.length > 0) {
    const values = adapters.flatMap((a) => a.extract(source, loaded.config));
    const coverage = buildCoverage(source.root, adapters, values, []);
    if (!coverage.complete) {
      console.log('\n  extraction limits (established now, not repeated after every edit)');
      for (const line of formatCoverage(coverage)) console.log(line);
      console.log('              a later clean audit is clean WITHIN this scope');
    }
    // This command runs no rules, so it cannot know which checks will be unable to
    // judge this source. That is only visible in an unfiltered audit, and the guard
    // hook filters at `high` — so nothing else will tell you.
    console.log('\n  not covered here');
    console.log('              which checks can JUDGE this source needs a rule run.');
    console.log('              run `ds-loop audit . --json` unfiltered once now, and');
    console.log('              again before calling any change complete: the guard');
    console.log('              filters at high severity and will not surface it.');
  }

  const contractPath = join(source.root, CONTRACT);
  const hasContract = existsSync(contractPath);

  if (opts.writeContract) {
    if (hasContract) {
      // Never merge, never clobber. What is there is prose someone wrote, and no
      // measurement is worth overwriting an argument.
      console.log(`\n  contract    ${CONTRACT} already exists — left untouched`);
      console.log('              delete it first if you want a fresh measurement pass');
    } else if (adapters.length === 0) {
      console.log(`\n  contract    not written — no adapter reads this tree, so there is`);
      console.log('              nothing measured to write down');
    } else {
      const values = adapters.flatMap((a) => a.extract(source, loaded.config));
      writeFileSync(
        contractPath,
        renderContract({
          label: meta.label,
          fixtureSha: meta.fixtureSha,
          config: loaded.config,
          adapters,
          values,
          coverage: buildCoverage(source.root, adapters, values, []),
          generatedAt: new Date().toISOString().slice(0, 10),
        }),
      );
      console.log(`\n  contract    wrote ${CONTRACT} — measured counts, plus the questions`);
      console.log('              ds-loop cannot answer. Fill the TODO lines; they are the');
      console.log('              ones every rule is currently guessing at.');
    }
  }

  console.log('\n  next        ds-loop audit .        every deterministic rule, severity-ranked');
  console.log('              ds-loop sweep .        the ΔE cutoff curve for this palette');
  if (!hasContract && !opts.writeContract && adapters.length > 0) {
    // Two rules tell a reader to record a sanctioned deviation in this file. Until
    // it exists, that instruction names a filename nobody has.
    console.log(`              ds-loop context --write-contract   start ${CONTRACT}`);
  }
  console.log('');
}
