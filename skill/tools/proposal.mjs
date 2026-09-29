#!/usr/bin/env node
// Proposal / decision visual for the ds-loop skill (report #4).
//
// The agent writes a proposal as JSON; this script checks it and renders one
// self-contained HTML page. It is deterministic and makes no model or network
// call. Judgement lives in the JSON; this file only enforces that every box and
// line says what it rests on:
//
//   observed     — seen in source or a rendered check; must cite evidence
//   inferred     — reasoned from evidence; must cite what it was inferred from
//   proposed     — a change; without evidence it renders as "unsupported"
//   not-checked  — no result, never a pass
//
// Usage:
//   node proposal.mjs check  <proposal.json>
//   node proposal.mjs render <proposal.json> --html <out.html> [--date YYYY-MM-DD]

import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The engine owns validation and rendering; this launcher works in a checkout and a published install.
import { existsSync } from 'node:fs';
const built = new URL('../../dist/core/proposal.js', import.meta.url);
if (
  !existsSync(built) &&
  !process.features?.typescript &&
  !process.execArgv.includes('--experimental-strip-types')
) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['--experimental-strip-types', ...process.argv.slice(1)], {
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}
const { checkProposal, renderProposal, STATUSES } = await import(
  existsSync(built) ? built.href : new URL('../../src/core/proposal.ts', import.meta.url).href
);
export { checkProposal, renderProposal, STATUSES };

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (!['check', 'render'].includes(cmd) || !file) {
    console.error(
      'usage: proposal.mjs check <proposal.json> | render <proposal.json> --html <out.html> [--date YYYY-MM-DD]',
    );
    return 2;
  }
  let p;
  try {
    p = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`proposal: cannot read ${file}: ${e.message}`);
    return 2;
  }
  const { errors, warnings } = checkProposal(p);
  for (const e of errors) console.error(`error: ${e}`);
  for (const w of warnings) console.error(`warning: ${w}`);
  if (errors.length) return 1;
  if (cmd === 'check') {
    console.log(
      `proposal ok — ${p.nodes.length} nodes, ${(p.edges ?? []).length} links, ${warnings.length} unsupported`,
    );
    return 0;
  }
  const i = rest.indexOf('--html');
  const out = i >= 0 ? rest[i + 1] : undefined;
  if (!out) {
    console.error('render needs --html <out.html>');
    return 2;
  }
  const d = rest.indexOf('--date');
  writeFileSync(out, renderProposal(p, { date: d >= 0 ? rest[d + 1] : '' }));
  console.log(`wrote ${out}`);
  return 0;
}

const self = realpathSync(fileURLToPath(import.meta.url));
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === self)
  process.exitCode = main(process.argv.slice(2));
