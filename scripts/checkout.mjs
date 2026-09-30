import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Fetch one public repository at its pinned SHA into a fresh OS temp directory, run `use`
 * on the checkout, and always remove it. Dev-only network access; every Git mutation
 * stays inside that directory. `cache` fetches the pinned object from a local clone.
 */
export function withCheckout(row, { cache, pin = false }, use) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-checkout-'));
  const git = (...args) =>
    execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    git('init', '--quiet');
    git('remote', 'add', 'origin', row.url);
    if (pin && !row.sha) row.sha = git('ls-remote', 'origin', 'HEAD').split(/\s/)[0];
    if (!/^[a-f0-9]{40}$/.test(row.sha ?? '')) throw new Error(`Invalid pin: ${row.name}`);
    git('fetch', '--quiet', '--depth=1', cache ? resolve(cache) : 'origin', row.sha);
    git('checkout', '--quiet', '--detach', 'FETCH_HEAD');
    for (const file of [row.scanPath, row.licenseFile]) {
      if (typeof file !== 'string' || file.startsWith('/') || file.split(/[\\/]/).includes('..'))
        throw new Error('Reference paths must stay inside the checkout');
    }
    return use(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
