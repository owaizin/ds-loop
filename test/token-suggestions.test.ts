import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';
import { renderAuditHtml } from '../src/core/report-html.ts';
import { type TokenSuggestion, displayCandidates, formatSuggestion } from '../src/core/token-suggestions.ts';

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
      assert.equal(s.status, 'ambiguous');
      assert.deepEqual(preferred(s), ['--space-control']);
      assert.equal(s.candidates.length, 2);
      assert.match(s.limits.join(' '), /rootFontSize=16/);
      const config = { ...DEFAULT_CONFIG, suggestions: { rootFontSize: 20, lengthTolerancePx: 1 } };
      assert.equal(suggestions(dir, { config })[0].status, 'no-token');
      writeFileSync(join(dir, 'a.css'), '.x{padding:10px}');
      assert.equal(suggestions(dir, { config })[0].status, 'ambiguous');
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
        audit(dir, { all: true });
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

test('suggestions separate typography, spacing and shadow values in CSS and markup', () => {
  project(
    {
      'tokens.css':
        ':root{--space-3:12px;--type-sm:12px;--shadow-y:12px} .a{font-size:12px} .b{padding:12px}',
      'a.tsx': 'const x="p-[12px] text-[12px]";',
    },
    (dir) => {
      const all = suggestions(dir);
      for (const s of all) {
        assert.deepEqual(
          s.candidates.map((c) => c.token),
          [s.property === 'font-size' || s.property === 'text' ? '--type-sm' : '--space-3'],
        );
        assert.equal(s.status, 'exact');
      }
      assert.equal(all.length, 4);
    },
  );
});
test('unknown categories are labelled and lower ranked; equal known candidates remain ambiguous', () => {
  project({ 'a.css': ':root{--mystery:12px;--space-3:12px;--space-control:12px}.a{padding:12px}' }, (dir) => {
    const [s] = suggestions(dir);
    assert.equal(s.status, 'ambiguous');
    assert.equal(s.candidates.at(-1)?.token, '--mystery');
    assert.equal(s.candidates.at(-1)?.categoryMatch, 'unknown');
    assert.equal(s.candidates.at(-1)?.preferred, false);
  });
});
test('observed property use propagates through aliases and overrides name heuristics', () => {
  project(
    {
      'a.css':
        ':root{--space-misnamed:12px;--unknown:var(--space-misnamed)}.a{font-size:var(--unknown)}.b{font-size:12px;padding:12px}',
    },
    (dir) => {
      const all = suggestions(dir);
      const type = all.find((s) => s.property === 'font-size')!;
      assert.equal(type.status, 'ambiguous');
      assert.ok(type.candidates.every((c) => c.categories.includes('typography')));
      assert.ok(
        type.candidates.every((c) =>
          c.categoryEvidence.some((e) => e.source === 'usage' && e.file === 'a.css'),
        ),
      );
      assert.equal(all.find((s) => s.property === 'padding')!.status, 'no-token');
    },
  );
});

test('unknown-only matches never claim category certainty and configurable signals are validated', () => {
  project({ 'a.css': ':root{--mystery:12px}.a{padding:12px}' }, (dir) => {
    const [unknown] = suggestions(dir);
    assert.equal(unknown.status, 'ambiguous');
    assert.equal(unknown.candidates[0].categoryMatch, 'unknown');
    assert.equal(unknown.candidates[0].preferred, false);
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ suggestions: { categoryPatterns: { spacing: 'mystery' } } }));
    const config = loadConfig(path).config;
    assert.notEqual(hashConfig(config), hashConfig(DEFAULT_CONFIG));
    assert.equal(suggestions(dir, { config })[0].status, 'exact');
    writeFileSync(path, JSON.stringify({ suggestions: { categoryPatterns: { spacing: '[' } } }));
    assert.throws(() => loadConfig(path), /regex/);
  });
});

test('unitless exact matches isolate weight, line height and z-index', () => {
  project(
    {
      'a.css':
        ':root{--font-weight-semibold:6e2 /* weight */ !important;--line-height-body:1.5;--z-dialog:600}.a{font-weight:600;line-height:1.50;z-index:600}.b{font-weight:601;line-height:600}',
    },
    (dir) => {
      const values = suggestions(dir);
      assert.deepEqual(
        values.find((s) => s.property === 'font-weight' && s.value === '600')!.candidates.map((c) => c.token),
        ['--font-weight-semibold'],
      );
      assert.equal(values.find((s) => s.property === 'font-weight' && s.value === '600')!.status, 'exact');
      assert.deepEqual(
        values
          .find((s) => s.property === 'line-height' && s.value === '1.50')!
          .candidates.map((c) => c.token),
        ['--line-height-body'],
      );
      assert.deepEqual(
        values.find((s) => s.property === 'z-index')!.candidates.map((c) => c.token),
        ['--z-dialog'],
      );
      assert.equal(values.find((s) => s.value === '601')!.status, 'no-token');
      assert.equal(values.find((s) => s.property === 'line-height' && s.value === '600')!.status, 'no-token');
    },
  );
});

test('unitless nearest requires a per-role tolerance and alias usage retains its role', () => {
  project(
    {
      'a.css':
        ':root{--font-weight-semibold:600;--type-action:var(--font-weight-semibold);--line-height-body:1.5}.a{font-weight:var(--type-action)}.b{font-weight:601;line-height:1.6}',
    },
    (dir) => {
      assert.ok(suggestions(dir).every((s) => s.status === 'no-token'));
      const path = join(dir, 'config.json');
      writeFileSync(
        path,
        JSON.stringify({ suggestions: { unitlessRoles: { 'font-weight': { tolerance: 2 } } } }),
      );
      const values = suggestions(dir, { config: loadConfig(path).config });
      const weight = values.find((s) => s.property === 'font-weight')!;
      assert.equal(weight.status, 'ambiguous');
      assert.ok(
        weight.candidates.every(
          (c) => c.match === 'nearest' && c.metric === 'unitless' && c.unitlessRole === 'font-weight',
        ),
      );
      assert.equal(values.find((s) => s.property === 'line-height')!.status, 'no-token');
      writeFileSync(
        path,
        JSON.stringify({ suggestions: { unitlessRoles: { 'font-weight': { tolerance: -1 } } } }),
      );
      assert.throws(() => loadConfig(path), /unitless/);
    },
  );
});

test('presentation keeps three ranked candidates, expandable overflow and complete JSON', () => {
  const declarations = Array.from({ length: 11 }, (_, i) => `--space-${i}:12px;`).join('');
  project({ 'a.css': `:root{${declarations}}.a{padding:13px}` }, (dir) => {
    const report = audit(dir, { silent: true });
    const finding = report.findings.find((f) => f.suggestion)!;
    const suggestion = finding.suggestion!;
    const s = suggestion.values[0];
    assert.equal(s.candidates.length, 11);
    assert.equal(s.status, 'ambiguous');
    const ranked = displayCandidates(s.candidates);
    const text = formatSuggestion(suggestion);
    assert.ok(text.includes('+8 more'));
    assert.ok(!text.includes(`${ranked[3].token} (`));
    const html = renderAuditHtml(report);
    assert.ok(html.includes('<summary>+8 more</summary>'));
    const data = JSON.parse(
      html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)![1],
    );
    assert.equal(
      data.report.findings.find((f: { suggestion?: unknown }) => f.suggestion).suggestion.values[0].candidates
        .length,
      11,
    );
    const ordered = displayCandidates([
      { ...ranked[0], token: '--z', match: 'nearest', preferred: true, distance: 0.1 },
      { ...ranked[0], token: '--c', match: 'exact', preferred: false, distance: 0 },
      { ...ranked[0], token: '--b', match: 'exact', preferred: true, distance: 0 },
      { ...ranked[0], token: '--a', match: 'exact', preferred: true, distance: 0 },
    ]);
    assert.deepEqual(
      ordered.map((c) => c.token),
      ['--a', '--b', '--c', '--z'],
    );
  });
});
