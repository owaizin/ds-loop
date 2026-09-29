import { resolve } from 'node:path';
import { analyseConsumers } from '../core/consumers.ts';

/** Package/subpath, bare export name, or package/subpath#Export. Never a deletion verdict. */
export function impact(specifier: string, path = '.', opts: { json?: boolean; silent?: boolean } = {}) {
  if (!specifier?.trim()) throw new Error('impact needs a package subpath or named export');
  const consumers = analyseConsumers(resolve(path));
  const [qualified, name] = specifier.split('#');
  const packageQuery = consumers.packages.some(
    (p) => qualified === p.name || qualified.startsWith(`${p.name}/`),
  );
  const hits = (consumers.imports ?? []).filter((hit) => {
    if (hit.kind !== 'static') return false;
    if (name !== undefined) return hit.specifier === qualified && hit.names.includes(name);
    return packageQuery ? hit.specifier === specifier : hit.names.includes(specifier);
  });
  const result = {
    status: consumers.status,
    specifier,
    production: hits.filter((h) => h.production),
    storiesAndTests: hits.filter((h) => !h.production),
    unconsumedExports: consumers.unconsumedExports,
    limits: [
      'Static import analysis only: re-export chains, dynamic imports, require calls and runtime composition are not resolved. Namespace imports cannot establish named-export use.',
      'No static import found does not mean safe to delete. External consumers, relative cross-package imports and path aliases are outside this workspace analysis.',
      ...consumers.limits,
    ],
  };
  if (!opts.silent) {
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`ds-loop impact — ${specifier} · ${result.status}`);
      for (const [label, entries] of [
        ['Production', result.production],
        ['Stories/tests', result.storiesAndTests],
      ] as const) {
        console.log(`\n${label}`);
        if (!entries.length) console.log('  No static import found.');
        for (const h of entries) console.log(`  ${h.package} · ${h.file}:${h.line} · ${h.specifier}`);
      }
      console.log('\nExported subpaths with no production import found');
      for (const e of result.unconsumedExports)
        console.log(`  ${e.package} ${e.subpath}${e.storyOrTestOnly ? ' (stories/tests only)' : ''}`);
      for (const limit of result.limits) console.log(`  ${limit}`);
    }
  }
  return result;
}
