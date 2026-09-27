import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';
import type { TokenSuggestion } from '../src/core/token-suggestions.ts';

function project(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-suggest-'));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function suggestions(dir: string, opts: Parameters<typeof audit>[1] = {}): TokenSuggestion[] {
  return audit(dir, { silent: true, ...opts }).findings.flatMap((f) =>
    (f.suggestion?.values ?? []).map((s) => ({
      ...s,
      limits: [...s.limits, ...(f.suggestion?.resolutionLimits.flatMap((r) => r.details) ?? [])],
    })),
  );
}
function preferred(s: TokenSuggestion) {
  return s.candidates.filter((c) => c.preferred).map((c) => c.token);
}

test('alias chains resolve; equivalent hex and RGB spellings retain every candidate and prefer aliases', () => {
  project(
    {
      'tokens.css':
        ':root{--palette-gray-500:#333;--color-text:var(--palette-gray-500);--color-body:var(--color-text)}',
      'a.css': '.x{color:rgb(51,51,51)}',
    },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'ambiguous');
      assert.equal(s.candidates.length, 3);
      assert.deepEqual(preferred(s), ['--color-body', '--color-text']);
      assert.ok(s.candidates.every((c) => c.match === 'exact'));
      const chain = s.candidates.find((c) => c.token === '--color-body')!;
      assert.deepEqual(chain.aliasChain, ['--color-body', '--color-text', '--palette-gray-500']);
      assert.equal(chain.declarations.length, 3);
      assert.ok(chain.declarations.every((p) => p.file === 'tokens.css' && p.line === 1));
    },
  );
});

test('one alias is preferred without losing its primitive; rem uses the configured root', () => {
  project(
    { 'tokens.css': ':root{--space-2:0.5rem;--space-control:var(--space-2)}', 'a.css': '.x{padding:8px}' },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'exact');
      assert.deepEqual(preferred(s), ['--space-control']);
      assert.equal(s.candidates.length, 2);
      assert.match(s.limits.join(' '), /rootFontSize=16/);
      const config = { ...DEFAULT_CONFIG, suggestions: { rootFontSize: 20, lengthTolerancePx: 1 } };
      assert.equal(suggestions(dir, { config })[0].status, 'no-token');
      writeFileSync(join(dir, 'a.css'), '.x{padding:10px}');
      assert.equal(suggestions(dir, { config })[0].status, 'exact');
    },
  );
});

test('nearest lengths retain all candidates within tolerance and expose equally near ambiguity', () => {
  project(
    {
      'tokens.css': ':root{--space-small:8px;--space-large:10px;--space-3:12px}',
      'a.css': '.x{padding:9px}',
    },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'ambiguous');
      assert.equal(s.candidates.length, 2);
      assert.ok(s.candidates.every((c) => c.match === 'nearest' && c.distance === 1 && c.metric === 'px'));
      const config = { ...DEFAULT_CONFIG, suggestions: { rootFontSize: 16, lengthTolerancePx: 0.5 } };
      assert.equal(suggestions(dir, { config })[0].status, 'no-token');
    },
  );
});

test('nearest colors obey ΔE and never match across alpha values', () => {
  project(
    { 'tokens.css': ':root{--color-text:#333;--color-overlay:#34343480}', 'a.css': '.x{color:#343434}' },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'nearest');
      assert.deepEqual(preferred(s), ['--color-text']);
      assert.equal(s.candidates[0].metric, 'ΔE');
      assert.ok(s.candidates[0].distance > 0);
      assert.equal(
        suggestions(dir, { config: { ...DEFAULT_CONFIG, clustering: { deltaE: 0 } } })[0].status,
        'no-token',
      );
    },
  );
});

test('percentage RGB is equivalent, but fractional RGB is not rounded into an exact match', () => {
  project(
    {
      'tokens.css': ':root{--color-text:#333}',
      'a.css': '.x{color:rgb(20% 20% 20%);background:rgb(51.4 51.4 51.4)}',
    },
    (dir) => {
      const s = suggestions(dir);
      assert.equal(s[0].status, 'exact');
      assert.equal(s[1].status, 'nearest');
    },
  );
});

test('duplicate names across modes cannot be selected even when only one definition matches', () => {
  project(
    { 'tokens.css': ':root{--color-text:#333}\n.dark{--color-text:#fff}', 'a.css': '.x{color:#333}' },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'ambiguous');
      assert.match(s.limits.join(' '), /Multiple declarations/);
      writeFileSync(join(dir, 'tokens.css'), ':root{--color-text:#333}\n.dark{--color-text:#333}');
      const same = suggestions(dir)[0];
      assert.equal(same.candidates.length, 2, 'same name/value, distinct declarations retained');
      assert.deepEqual(
        same.candidates.map((c) => c.declarations[0].line),
        [1, 2],
      );
    },
  );
});

test('alias cycles, missing targets and computed recipes are reported, not guessed from fallback', () => {
  project(
    {
      'tokens.css':
        ':root{--a:var(--b);--b:var(--a);--missing:var(--absent, 8px);--recipe:calc(var(--a) + 8px)}',
      'a.css': '.x{padding:8px}',
    },
    (dir) => {
      const [s] = suggestions(dir);
      assert.equal(s.status, 'no-token');
      assert.match(s.limits.join(' '), /Alias cycle/);
      assert.match(s.limits.join(' '), /Missing alias target/);
      assert.match(s.limits.join(' '), /Unresolved expression/);
    },
  );
});

test('alias names are case-sensitive and fallback is not chosen over a resolved target', () => {
  project(
    {
      'tokens.css': ':root{--Tone:#333;--tone:#fff;--color-text:var(--Tone, #fff)}',
      'a.css': '.x{color:#333}',
    },
    (dir) => {
      const [s] = suggestions(dir);
      assert.deepEqual(preferred(s), ['--color-text']);
      assert.deepEqual(s.candidates.find((c) => c.token === '--color-text')?.aliasChain, [
        '--color-text',
        '--Tone',
      ]);
      assert.ok(!s.candidates.some((c) => c.token === '--tone'));
    },
  );
});

test('file-limited recommendations require associated token context, not unrelated themes', () => {
  project(
    {
      'theme.css': ':root{--color-text:#333}',
      'other.css': ':root{--color-unrelated:#333}',
      'Card.tsx': '<p className="text-[#333]" />',
    },
    (dir) => {
      const files = [join(dir, 'Card.tsx')];
      assert.equal(suggestions(dir, { files })[0].status, 'not-checked');
      const config = { ...DEFAULT_CONFIG, tokenContexts: [{ files: ['Card.tsx'], tokens: ['theme.css'] }] };
      const [s] = suggestions(dir, { files, config });
      assert.deepEqual(preferred(s), ['--color-text']);
      assert.equal(s.candidates.length, 1);
      assert.equal(audit(dir, { files, config, silent: true }).styleInventory.color, undefined);
      const broken = { ...config, tokenContexts: [{ files: ['Card.tsx'], tokens: ['missing.css'] }] };
      assert.equal(suggestions(dir, { files, config: broken })[0].status, 'not-checked');
    },
  );
});

test('markup and style share suggestions; JSON has all hits and human output adds a suggestion line', () => {
  project(
    {
      'tokens.css': ':root{--color-text:#333}',
      'Card.tsx': '<p className="text-[#333333]" />',
      'a.css': '.x{color:rgb(51 51 51)}',
    },
    (dir) => {
      const all = suggestions(dir);
      assert.equal(all.length, 2);
      assert.ok(all.every((s) => s.status === 'exact' && preferred(s)[0] === '--color-text'));
      const original = console.log;
      const lines: string[] = [];
      console.log = (...args: unknown[]) => lines.push(args.join(' '));
      try {
        audit(dir);
      } finally {
        console.log = original;
      }
      assert.match(lines.join('\n'), /suggest:.*exact/);
      assert.match(lines.join('\n'), /No automatic replacement/);
    },
  );
});

test('length matching does not invent equivalence for em, percentages or shorthands', () => {
  project(
    {
      'tokens.css': ':root{--space-unit:1em;--space-px:16px}',
      'a.css': '.x{padding:1rem;margin:50%;gap:8px 16px}',
    },
    (dir) => {
      const s = suggestions(dir);
      assert.deepEqual(preferred(s[0]), ['--space-px']);
      assert.equal(s[1].status, 'no-token');
      assert.equal(s[2].status, 'no-token');
    },
  );
});

test('suggestion config is validated, merges defaults and changes config hash', () => {
  project({}, (dir) => {
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ suggestions: { rootFontSize: 20 } }));
    const cfg = loadConfig(path).config;
    assert.equal(cfg.suggestions.lengthTolerancePx, 1);
    assert.notEqual(hashConfig(cfg), hashConfig(DEFAULT_CONFIG));
    for (const suggestions of [
      null,
      [],
      { rootFontSize: 0 },
      { rootFontSize: '20' },
      { lengthTolerancePx: -1 },
      { unknown: 1 },
    ]) {
      writeFileSync(path, JSON.stringify({ suggestions }));
      assert.throws(() => loadConfig(path), /config:/);
    }
  });
});

test('multiple var calls do not masquerade as one alias; markup collisions retain candidates without a swap', () => {
  project(
    {
      'tokens.css': ':root{--space-a:8px;--space-b:8px;--space-pair:var(--space-a, 1px) var(--space-b)}',
      'Card.tsx': '<p className="p-[8px]" />',
    },
    (dir) => {
      const report = audit(dir, { silent: true });
      const finding = report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup')!;
      const s = finding.suggestion!.values[0];
      assert.equal(s.status, 'ambiguous');
      assert.deepEqual(
        s.candidates.map((c) => c.token),
        ['--space-a', '--space-b'],
      );
      assert.match(
        finding.suggestion!.resolutionLimits.flatMap((r) => r.details).join(' '),
        /Unresolved expression: --space-pair/,
      );
      assert.deepEqual(finding.data?.alreadyDeclared, []);
      assert.doesNotMatch(finding.fix, /Swap those first/);
    },
  );
});

test('suggestions are uncapped even when legacy markup hits are capped at forty', () => {
  project(
    {
      'tokens.css': ':root{--color-text:#333}',
      'Card.tsx': Array.from({ length: 65 }, (_, i) => `const c${i}=<p className="text-[#333]" />;`).join(
        '\n',
      ),
    },
    (dir) => {
      const f = audit(dir, { silent: true }).findings.find((f) => f.ruleId === 'token/raw-value-in-markup')!;
      assert.equal((f.data?.hits as unknown[]).length, 40);
      assert.equal(f.suggestion?.values.length, 65);
      assert.equal(f.suggestion?.values[64].line, 65);
    },
  );
});
