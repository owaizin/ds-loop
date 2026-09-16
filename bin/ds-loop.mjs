#!/usr/bin/env node
/**
 * ds-loop launcher — the one-command entry point (`npx ds-loop audit .`).
 *
 * Two worlds to serve, and this file's whole job is telling them apart:
 *
 *   Installed package  ->  dist/cli.js exists. Plain JS, imported directly.
 *   Git checkout       ->  only src/cli.ts. Node runs the TypeScript itself.
 *
 * The published artifact must be JS: Node refuses to strip types for any file
 * under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING), so shipping
 * the TypeScript straight to npm cannot work. `npm run build` emits dist, and
 * `prepack` runs it, which is why a published install never type-strips at all.
 * Zero *runtime* dependencies is unchanged — that is the commitment that mattered.
 *
 * In a checkout, Node >= 22.18 strips types with no flag; 22.6-22.17 needs
 * --experimental-strip-types, so we re-exec once. `--no-warnings` suppresses
 * Node's ExperimentalWarning, which is true but not the user's problem.
 *
 * Set DS_LOOP_LAUNCHER=import|spawn to force a branch (used by the tests).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = join(ROOT, 'dist', 'cli.js');
const SOURCE = join(ROOT, 'src', 'cli.ts');

// argv is already [node, thisFile, ...args] and the CLI reads argv.slice(2),
// so importing in-process needs no argv rewriting and keeps process.exitCode.
if (existsSync(BUILT)) {
  await import(pathToFileURL(BUILT).href);
} else if (!existsSync(SOURCE)) {
  console.error('ds-loop: no dist/cli.js and no src/cli.ts — the install is incomplete.');
  process.exit(1);
} else {
  const native = Boolean(process.features?.typescript);
  const mode = process.env.DS_LOOP_LAUNCHER ?? (native ? 'import' : 'spawn');

  if (mode === 'import') {
    await import(pathToFileURL(SOURCE).href);
  } else if (process.allowedNodeEnvironmentFlags.has('--experimental-strip-types')) {
    const res = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', SOURCE, ...process.argv.slice(2)],
      { stdio: 'inherit' },
    );
    process.exit(res.status ?? 1);
  } else {
    console.error(
      `ds-loop needs Node 22.6 or newer — found ${process.version}.
Install a current Node (https://nodejs.org) and run the same command again.`,
    );
    process.exit(1);
  }
}
