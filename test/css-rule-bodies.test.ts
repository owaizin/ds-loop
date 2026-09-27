import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cssRuleBodiesAdapter } from '../src/adapters/css-rule-bodies.ts';
import { audit } from '../src/commands/audit.ts';
import { scan } from '../src/commands/scan.ts';
import { scorecard } from '../src/commands/scorecard.ts';
import { sweep } from '../src/commands/sweep.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { loadConfig } from '../src/config/load.ts';
import { hashConfig } from '../src/config/schema.ts';
import { VALUE_CATEGORIES } from '../src/core/provenance.ts';

const RULE = 'token/raw-value-in-style';
function tree<T>(files: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'ds-loop-style-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      writeFileSync(join(dir, file), text);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function extract(dir: string, only?: string[]) {
  return cssRuleBodiesAdapter.extract(
    { root: dir, fixtureSha: 'fixture', label: 'test', only },
    DEFAULT_CONFIG,
  );
}
function capture<T>(fn: () => T) {
  const lines: string[] = [];
  const old = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(' '));
  try {
    return { value: fn(), output: lines.join('\n') };
  } finally {
    console.log = old;
  }
}

test('ordinary CSS: all requested categories, full provenance, no token declarations duplicated', () => {
  tree(
    {
      'a.css': `:root { --ds-palette-gray-500: #333; }
.btn {
 color:#333; background:#fff; background-color:rgb(1, 2, 3); border-color:red;
 padding:0 12px; margin-inline:auto 1rem; gap:2ch;
 font-size:1rem; font-weight:700; line-height:1.4;
 border-radius:4px / 8px; box-shadow:0 2px 4px #000;
 z-index:10; transition-duration:150ms; animation-duration:0.5s, 1s;
}`,
    },
    (dir) => {
      const values = extract(dir);
      assert.equal(values.length, 15);
      assert.deepEqual(
        [...new Set(values.map((v) => v.provenance.category))].sort(),
        [...VALUE_CATEGORIES].sort(),
      );
      assert.ok(values.every((v) => v.provenance.tokenName === null && v.provenance.surface === 'style'));
      assert.ok(
        values.every(
          (v) => v.provenance.adapterId === 'css-rule-bodies' && v.provenance.adapterVersion === '0.1.0',
        ),
      );
      assert.equal(values[0]?.provenance.line, 3);
      assert.equal(values[0]?.provenance.selector, '.btn');
      assert.equal(values[0]?.provenance.fixtureSha, 'fixture');
      assert.ok(values.every((v) => v.provenance.classification !== 'ambiguous'));
    },
  );
});

test('lexical boundaries: comments, quoted content and URLs never become declarations', () => {
  tree(
    {
      'a.css': `/* .fake { color:#bad; padding:99px } */
.real {
 content: "padding:88px; color:#bad; }";
 background:url("data:image/svg+xml; color:#bad; padding:77px; }");
 background-image:url(data:image/svg+xml;color:#bad;);
 color: #abc; /* margin:66px */
}`,
    },
    (dir) => {
      const values = extract(dir);
      assert.equal(values.length, 2);
      assert.equal(values[0]?.provenance.classification, 'excluded');
      assert.equal(values[1]?.raw, '#abc');
      assert.equal(values[1]?.provenance.line, 6);
      const hits = audit(dir, { silent: true }).findings.filter((f) => f.ruleId === RULE);
      assert.equal(hits.length, 1);
      assert.equal(hits[0]?.data?.count, 1);
    },
  );
});

test('multiline values, nested conditions/selectors and final declaration without semicolon', () => {
  tree(
    {
      'a.css': `@media (min-width: 600px) {
 @supports (display:grid) {
  .card:hover {
   padding:
      12px
      16px;
   &:focus { color: #123 }
   margin: 4px;
  }
 }
}
@font-face { font-weight: 400; }
@property --foo { initial-value: 12px; }
`,
    },
    (dir) => {
      const values = extract(dir);
      assert.equal(values.length, 3);
      assert.equal(values[0]?.provenance.line, 4);
      assert.match(values[0]?.raw ?? '', /12px\s+16px/);
      assert.match(values[1]?.provenance.selector ?? '', /@media.*@supports.*\.card:hover.*&:focus/);
      assert.equal(values[1]?.provenance.line, 7);
      assert.match(values[2]?.provenance.selector ?? '', /\.card:hover$/);
    },
  );
});

test('reference-only, fallback, mixed calc, literal calc and unclassified expressions stay distinct', () => {
  tree(
    {
      'a.css': `.x {
 padding:var(--space);
 margin:var(--space, 12px) var(--other, var(--fallback, 0));
 gap:calc(var(--space) + 2px);
 font-size:calc(1rem + 2px);
 line-height:calc(var(--leading) * var(--scale));
 border-radius:env(safe-area-inset-top, 0px);
 color:lab(50% 20 30);
}`,
    },
    (dir) => {
      const values = extract(dir);
      assert.deepEqual(
        values.map((v) => v.provenance.classification),
        ['reference', 'reference', 'mixed', 'style-literal', 'ambiguous', 'ambiguous', 'ambiguous'],
      );
      assert.deepEqual(values[1]?.refs, ['--space', '--other', '--fallback']);
      const report = audit(dir, { silent: true });
      assert.equal(report.styleInventory.spacing?.references, 2);
      assert.equal(report.styleInventory.spacing?.mixed, 1);
      assert.equal(report.styleInventory.spacing?.tokenizationRatio, 2 / 3);
      assert.equal(report.ratios['style-tokenization-spacing'], 0.667);
      assert.equal(report.styleInventory.radius?.tokenizationRatio, null);
      assert.equal(report.ratios['style-tokenization-radius'], undefined);
      assert.ok(report.coverage.couldNotJudge.includes(RULE));
      assert.equal(report.coverage.complete, false);
    },
  );
});

test('files scope and source tree exclusions are honored', () => {
  tree(
    {
      'a.css': '.a{color:#111}',
      'b.css': '.b{color:#222}',
      'dist/bundle.css': '.c{color:#333}',
      'theme.scss': '.d{color:#444}',
    },
    (dir) => {
      assert.equal(extract(dir).length, 2);
      const report = audit(dir, { files: [join(dir, 'a.css')], silent: true });
      assert.equal(report.styleInventory.color?.occurrences, 1);
      assert.equal(report.styleInventory.color?.topFiles[0]?.file, 'a.css');
      assert.deepEqual(extract(dir, []), []);
      assert.equal(extract(join(dir, 'b.css'))[0]?.raw, '#222');
    },
  );
});

test('inventory is unfiltered; new-rule JSON keeps all hits; human output is grouped', () => {
  tree(
    {
      'a.css': Array.from({ length: 125 }, (_, i) => `.a${i}{padding:12px}`).join('\n'),
      'b.css': '.b{padding:var(--space, 12px); transition-duration:100ms}',
    },
    (dir) => {
      const full = audit(dir, { silent: true });
      const group = full.findings.find((f) => f.ruleId === RULE && f.data?.category === 'spacing');
      assert.equal((group?.data?.hits as unknown[]).length, 125);
      assert.match(group?.where ?? '', /117 more/);
      assert.equal(full.styleInventory.spacing?.occurrences, 126);
      assert.equal(full.styleInventory.spacing?.distinctValues, 2);
      assert.deepEqual(full.styleInventory.spacing?.topFiles, [
        { file: 'a.css', occurrences: 125 },
        { file: 'b.css', occurrences: 1 },
      ]);
      const ignored = audit(dir, {
        silent: true,
        minSeverity: 'blocking',
        config: {
          ...DEFAULT_CONFIG,
          ignore: [{ rule: RULE, value: '12px', reason: 'Intentional local spacing' }],
        },
      });
      assert.deepEqual(ignored.styleInventory, full.styleInventory);
      assert.deepEqual(ignored.ratios, full.ratios);
      assert.equal(ignored.findings.length, 0);
      assert.ok(ignored.suppressions.some((s) => s.rule === RULE && s.matched === 125));
      const parsed = JSON.parse(capture(() => audit(dir, { json: true })).output);
      assert.equal(
        parsed.findings.find((f: { data?: { category: string } }) => f.data?.category === 'spacing').data.hits
          .length,
        125,
      );
      const human = capture(() => audit(dir)).output;
      assert.match(human, /CSS property inventory/);
      assert.match(human, /project permission not judged/);
      assert.doesNotMatch(human, /padding: 12px at a.css:125/);
      const row = capture(() => scorecard(dir, { dryRun: true })).value.row;
      assert.equal(row.ratios['style-tokenization-spacing'], 0.008);
      assert.equal('styleInventory' in row, false);
      assert.equal(row.findings[RULE], 126, 'category groups accumulate under the stable rule id');
    },
  );
});

test('category severity loads, is validated, changes hash and respects rule-wide override', () => {
  tree(
    {
      'a.css': '.x{color:red;padding:2px;transition-duration:150ms}',
      'config.json': JSON.stringify({ style: { severity: { duration: 'high', color: 'low' } } }),
    },
    (dir) => {
      const config = loadConfig(join(dir, 'config.json')).config;
      assert.equal(config.style.severity.spacing, 'high');
      assert.notEqual(hashConfig(config), hashConfig(DEFAULT_CONFIG));
      const findings = audit(dir, { config, silent: true }).findings.filter((f) => f.ruleId === RULE);
      assert.equal(findings.find((f) => f.data?.category === 'duration')?.severity, 'high');
      assert.equal(findings.find((f) => f.data?.category === 'color')?.severity, 'low');
      const override = audit(dir, { config, silent: true, severityOverrides: { [RULE]: 'blocking' } });
      assert.ok(override.findings.filter((f) => f.ruleId === RULE).every((f) => f.severity === 'blocking'));
      for (const severity of [{ color: 'urgent' }, { typo: 'high' }]) {
        writeFileSync(join(dir, 'config.json'), JSON.stringify({ style: { severity } }));
        assert.throws(() => loadConfig(join(dir, 'config.json')), /invalid style.severity/);
      }
    },
  );
});

test('hundreds of CSS use sites cannot change palette rules, scan palette, or sweep curve', () => {
  tree(
    {
      'tokens.css':
        ':root{--palette-gray-100:#111;--palette-gray-200:#112;--brand:#111;--accent:#111;--other:rgb(1,2,3)}',
    },
    (dir) => {
      const before = audit(dir, { silent: true });
      const beforeScan = capture(() => scan(dir)).output;
      const beforeSweep = capture(() => sweep(dir)).value;
      writeFileSync(
        join(dir, 'uses.css'),
        Array.from(
          { length: 400 },
          (_, i) => `.x${i}{color:#${(i + 4096).toString(16)};background:#111;padding:var(--space, 0)}`,
        ).join('\n'),
      );
      const after = audit(dir, { silent: true });
      assert.deepEqual(
        after.findings.filter((f) => f.ruleId.startsWith('color/')),
        before.findings.filter((f) => f.ruleId.startsWith('color/')),
      );
      assert.equal(after.ratios['literal-colors-per-distinct'], before.ratios['literal-colors-per-distinct']);
      assert.equal(
        after.ratios['colors-per-distinct-in-scope'],
        before.ratios['colors-per-distinct-in-scope'],
      );
      assert.equal(
        after.findings.some((f) => f.ruleId === 'token/tier-model-undetectable'),
        false,
      );
      const afterScan = capture(() => scan(dir)).output;
      assert.equal(
        afterScan.match(/\d+ distinct literals {2}-> {2}\d+ clusters/)?.[0],
        beforeScan.match(/\d+ distinct literals {2}-> {2}\d+ clusters/)?.[0],
      );
      const afterSweep = capture(() => sweep(dir)).value;
      assert.equal(afterSweep.distinctLiterals, beforeSweep.distinctLiterals);
      assert.deepEqual(afterSweep.curve, beforeSweep.curve);
      assert.equal(afterSweep.verdict, beforeSweep.verdict);
    },
  );
});

test('Tailwind finding JSON and human blocks remain byte-identical to the pre-change run', () => {
  const baseline = JSON.parse(
    readFileSync(new URL('./fixtures/tailwind-findings.json', import.meta.url), 'utf8'),
  );
  tree(
    {
      'tokens.css': ':root { --ds-palette-blue-500: #1da1f2; }\n',
      'Card.tsx': 'const card = <div className="bg-[#1da1f2] p-[13px] text-[14px] bg-white" />;\n',
    },
    (dir) => {
      const { value: report, output } = capture(() => audit(dir));
      const findings = report.findings.filter((f) =>
        ['token/raw-value-in-markup', 'token/stock-palette-utility'].includes(f.ruleId),
      );
      assert.equal(JSON.stringify(findings), JSON.stringify(baseline.findings));
      for (const block of baseline.blocks) {
        assert.ok(block.length > 0);
        assert.ok(output.includes(block));
      }
    },
  );
});

test('nested conditional declarations retain selector context and exact source values', () => {
  tree(
    {
      'a.css': `.x {
 @media (hover:hover) {
  color: #123 /* explanation */ !important;
  @supports (display:grid) { padding:var(--space, 2px); }
 }
}`,
    },
    (dir) => {
      const values = extract(dir);
      assert.equal(values.length, 2);
      assert.equal(values[0]?.raw, '#123 /* explanation */ !important');
      assert.equal(values[0]?.provenance.classification, 'color');
      assert.match(values[0]?.provenance.selector ?? '', /\.x > @media/);
      assert.equal(values[0]?.provenance.line, 3);
      assert.equal(values[1]?.provenance.classification, 'reference');
    },
  );
});

test('target routing filters style categories without narrowing the extraction inventory', () => {
  tree(
    { 'a.css': '.x{color:red;padding:2px;font-size:12px;box-shadow:0 0 2px red;transition-duration:1s}' },
    (dir) => {
      const report = audit(dir, { target: 'color', silent: true });
      assert.deepEqual(
        report.findings.filter((f) => f.ruleId === RULE).map((f) => f.data?.category),
        ['color'],
      );
      assert.equal(report.styleInventory.spacing?.occurrences, 1);
      const motion = audit(dir, { target: 'motion', silent: true });
      assert.deepEqual(
        motion.findings.filter((f) => f.ruleId === RULE).map((f) => f.data?.category),
        ['duration'],
      );
    },
  );
});

test('motion shorthands retain whole recipes; animation names and iteration counts are not times', () => {
  tree(
    {
      'a.css': `.x {
 transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1) 50ms, color 1s linear;
 animation: spin 2s steps(3) 3;
 animation: spin-100 infinite;
 animation: spin 3;
 transition: var(--motion);
 animation-duration: var(--duration, 1s);
 animation: spin var(--duration) 3;
}`,
    },
    (dir) => {
      const values = extract(dir);
      assert.deepEqual(
        values.map((v) => v.provenance.classification),
        ['style-literal', 'style-literal', 'excluded', 'excluded', 'reference', 'reference', 'ambiguous'],
      );
      assert.equal(audit(dir, { silent: true }).styleInventory.duration?.tokenizationRatio, 0.5);
    },
  );
});

test('unclassified styles are not low-alpha colors and coverage survives filters and exceptions', () => {
  tree(
    {
      'a.css':
        '.x{padding:env(safe-area-inset-top, 2px);animation-duration:env(--duration, 1s);margin:calc(var(--x) + env(--y, 2px))}',
    },
    (dir) => {
      const config = { ...DEFAULT_CONFIG, ignore: [{ rule: RULE, reason: 'Review separately' }] };
      const report = audit(dir, { config, silent: true, minSeverity: 'high' });
      assert.equal(report.findings.length, 0);
      assert.equal(report.coverage.undecided.count, 0);
      assert.equal(report.coverage.unclassifiedStyles?.count, 3);
      assert.equal(report.coverage.complete, false);
      assert.equal(report.styleInventory.spacing?.unclassified, 2);
      const human = capture(() => audit(dir)).output;
      assert.match(human, /CSS property expression\(s\) unclassified/);
      assert.doesNotMatch(human, /low-alpha colour\(s\)/);
    },
  );
});
