import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { decide } from '../src/commands/decide.ts';
import { DEFAULT_CONFIG } from '../src/config/defaults.ts';
import { importSpecifiers } from '../src/core/consumers.ts';
import { analyseFileImports } from '../src/core/file-imports.ts';
import { annotateFindings, formatDimensions } from '../src/core/finding-dimensions.ts';
import { reportData } from '../src/core/report-data.ts';

function project(files: Record<string, string>, run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'ds-loop-dimensions-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const fixture = {
  'index.ts': "import './Button'; import './theme.css';",
  'Button.tsx': '<button className="bg-[#123456]" />',
  'Archive.tsx': '<button className="bg-[#abcdef]" />',
  'theme.css': ':root{--color-a:#123456;--color-b:#123456}',
  'other.css': ':root{--color-c:#abcdef}',
};

test('all literal evidence survives; reached ratios are additive and old ratios retain exact meaning', () => {
  project(fixture, (root) => {
    const report = audit(root, { silent: true });
    const f = report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup')!;
    assert.equal(f.data?.count, 2);
    assert.equal(f.dimensions?.reached.state, 'mixed');
    assert.deepEqual(f.dimensions?.occurrences, { all: 2, reached: 1, noStaticImporter: 1, unresolved: 0 });
    assert.equal(
      f.dimensions?.locations.find((l) => l.file === 'Archive.tsx')?.reached.basis,
      'No static importer found.',
    );
    assert.equal(report.ratios['literal-colors-per-distinct'], 1.5);
    assert.equal(report.ratios['colors-per-distinct-in-scope'], 1.5);
    assert.equal(report.ratios['ambiguous-share'], 0);
    assert.equal(report.ratios['literal-colors-per-distinct:reached'], 2);
    assert.equal(report.ratios['colors-per-distinct-in-scope:reached'], 2);
    for (const output of [
      JSON.stringify(reportData(report)),
      formatDimensions(report.findingEvidence!).join('\n'),
    ])
      assert.doesNotMatch(output, /\bdead\b|\bunused\b|safe to delete|\bunreachable\b/i);
  });
});

test('accepted explicit decision scope is named; proposals and mere evidence links are not permission', () => {
  project(fixture, (root) => {
    const file = decide(root, {
      decision: 'Keep illustration colors',
      owner: 'Design',
      alternatives: 'Tokenize',
      evidence: ['Archive.tsx'],
      covers: [{ rule: 'token/raw-value-in-markup', files: ['Archive.tsx'] }],
    });
    assert.match(readFileSync(file, 'utf8'), /## Covers/);
    const report = audit(root, { silent: true });
    const f = report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup')!;
    assert.equal(f.dimensions?.declaredIntentional.state, 'partial');
    assert.ok(f.dimensions?.declaredIntentional.records[0].source.endsWith('keep-illustration-colors.md'));
    writeFileSync(file, readFileSync(file, 'utf8').replace('Status: accepted', 'Status: proposed'));
    assert.equal(
      audit(root, { silent: true }).findings.find((f) => f.ruleId === 'token/raw-value-in-markup')?.dimensions
        ?.declaredIntentional.state,
      'not-recorded',
    );
  });
});

test('exceptions retain complete evidence and domain hints do not change historical extraction ratios', () => {
  project({ ...fixture, 'domain.css': ':root{--chart-series:#aabbcc}' }, (root) => {
    const config = {
      ...DEFAULT_CONFIG,
      taxonomy: { ...DEFAULT_CONFIG.taxonomy, nonColorTokenHints: ['chart'] },
      ignore: [
        { rule: 'token/raw-value-in-markup', files: ['Archive.tsx'], reason: 'Fixed illustration palette' },
      ],
    };
    const report = audit(root, { config, silent: true });
    assert.equal(report.findings.find((f) => f.ruleId === 'token/raw-value-in-markup')?.data?.count, 1);
    const evidence = report.findingEvidence!.find((f) => f.ruleId === 'token/raw-value-in-markup')!;
    assert.equal(evidence.data?.count, 2);
    assert.equal(evidence.dimensions?.declaredIntentional.records[0].source, 'config.ignore[0]');
    assert.ok(report.findingEvidence!.some((f) => f.dimensions?.domainValue.hints.includes('chart')));
    assert.equal(report.ratios['literal-colors-per-distinct'], 1.5);
    const filtered = audit(root, { config, silent: true, minSeverity: 'blocking' });
    assert.equal(filtered.findings.length, 0);
    assert.deepEqual(filtered.findingTotals, report.findingTotals);
  });
});

test('shared lexer ignores comments and strings; alias inheritance, reexports and extension mapping resolve', () => {
  assert.equal(importSpecifiers('// import x from "./x"\nconst x = "import y from z";').length, 0);
  project(
    {
      'tsconfig.json': '{"compilerOptions":{"baseUrl":".","paths":{"~/*":["src/*"],"lib/*":["src/lib/*"]}}}',
      'src/tsconfig.json': '{"extends":"../tsconfig.json"}',
      'src/main.ts':
        "import '~/Button'; export {x} from 'lib/x'; import './y.js'; import('./dynamic'); require('./required');",
      'src/Button.tsx': '',
      'src/lib/x.ts': '',
      'src/y.ts': '',
      'src/dynamic.ts': '',
      'src/required.ts': '',
    },
    (root) => {
      const graph = analyseFileImports(root);
      for (const name of ['src/Button.tsx', 'src/lib/x.ts', 'src/y.ts'])
        assert.equal(graph.files[name].state, 'reached', name);
      for (const name of ['src/dynamic.ts', 'src/required.ts'])
        assert.equal(graph.files[name].state, 'no-static-importer', name);
      writeFileSync(join(root, 'src/main.ts'), "import 'customAlias/Button';");
      const unresolved = analyseFileImports(root);
      assert.equal(unresolved.files['src/Button.tsx'].state, 'unresolved');
      assert.equal(unresolved.unresolved[0].specifier, 'customAlias/Button');
    },
  );
});

test('full occurrence lists remain complete past old sample caps and file-scoped scans state their limit', () => {
  project(
    {
      'index.ts': "import './many.css'",
      'many.css': Array.from({ length: 65 }, (_, i) => `.x${i}{padding:13px}`).join('\n'),
    },
    (root) => {
      const report = audit(root, { silent: true });
      const f = report.findings.find((f) => f.ruleId === 'token/raw-value-in-style')!;
      assert.equal(f.dimensions?.occurrences.reached, 65);
      const single = audit(join(root, 'many.css'), { silent: true });
      assert.ok(single.findings.every((f) => f.dimensions?.reached.state === 'unresolved'));
    },
  );
});

test('unresolved relative queries and missing configured aliases never imply importer absence', () => {
  project(
    {
      'tsconfig.json': '{"compilerOptions":{"paths":{"@/*":["missing/*"]}}}',
      'main.ts': "import './theme.css?inline'; import '@/theme';",
      'theme.css': '.x{color:red}',
    },
    (root) => {
      const graph = analyseFileImports(root);
      assert.equal(graph.files['theme.css'].state, 'unresolved');
      assert.equal(graph.unresolved.length, 2);
    },
  );
});

test('human summary and full output preserve the same claim boundary as JSON', () => {
  project(fixture, (root) => {
    for (const options of [{}, { all: true }, { json: true }]) {
      const lines: string[] = [];
      const log = console.log;
      console.log = (...args) => {
        lines.push(args.join(' '));
      };
      try {
        audit(root, options);
      } finally {
        console.log = log;
      }
      assert.doesNotMatch(lines.join('\n'), /\bdead\b|\bunused\b|safe to delete|\bunreachable\b/i);
      assert.match(lines.join('\n'), /reached|static importer/);
    }
  });
});

test('a workspace subpath export is not substituted for an absent root export', () => {
  project(
    {
      'package.json': '{"workspaces":["packages/*"]}',
      'packages/ui/package.json': '{"name":"@example/ui","exports":{"./button":"./button.ts"}}',
      'packages/ui/button.ts': 'export const button = 1;',
      'main.ts': "import '@example/ui';",
    },
    (root) => {
      const graph = analyseFileImports(root);
      assert.equal(graph.files['packages/ui/button.ts'].state, 'unresolved');
      assert.equal(graph.files['packages/ui/button.ts'].importers.length, 0);
    },
  );
});

// Uncertainty has to reach as far as its cause does and no further. This was one
// boolean: any specifier the resolver could not follow turned every importerless file
// in the tree unresolved, so across Primer, Excalidraw and PostHog the absence label
// fired on exactly zero files. A monorepo always has at least one such specifier.
test('an import that cannot be followed clouds what it might name, not the whole tree', () => {
  project(
    {
      'package.json': '{}',
      'app/main.ts': "import '@theme/Layout';\nimport './used.ts';",
      'app/used.ts': 'export const a = 1;',
      'app/Layout.ts': 'export const layout = 1;',
      'unrelated/orphan.css': '.a{color:#111}',
    },
    (root) => {
      const graph = analyseFileImports(root);
      assert.equal(graph.files['app/used.ts'].state, 'reached');
      // `@theme/Layout` could be this file, so its absence cannot be established.
      assert.equal(graph.files['app/Layout.ts'].state, 'unresolved');
      // It could not be this one, and a far-away unresolved import must not say so.
      assert.equal(graph.files['unrelated/orphan.css'].state, 'no-static-importer');
    },
  );
});

// Stylesheets are where most findings in this tool live, and a sheet pulled in by
// another sheet has no JavaScript importer at all. Excalidraw is the case:
// `variables.module.scss` is reached only through Sass `@use`.
test('a stylesheet reached only by @use or @import is reached', () => {
  project(
    {
      'package.json': '{}',
      'css/_variables.scss': '$brand: #3b5bdb;',
      'css/theme.scss': "@use './variables';\n",
      'css/base.css': "@import './theme.css';\n",
      'css/theme.css': '.a{color:#111}',
    },
    (root) => {
      const graph = analyseFileImports(root);
      assert.equal(graph.files['css/_variables.scss'].state, 'reached');
      assert.equal(graph.files['css/theme.css'].state, 'reached');
    },
  );
});

test('exact graph-backed file:line synthesises a location and retains recorded intent', () => {
  project(fixture, (root) => {
    const graph = analyseFileImports(root);
    const finding = {
      ruleId: 'docs/undocumented-shared-component',
      severity: 'low' as const,
      summary: 'Missing docs',
      where: 'Button.tsx:1',
      fix: 'Document it',
    };
    const config = {
      ...DEFAULT_CONFIG,
      ignore: [{ rule: finding.ruleId, files: ['Button.tsx'], reason: 'Documented elsewhere' }],
    };
    decide(root, {
      decision: 'External docs',
      owner: 'Design',
      alternatives: 'Local docs',
      evidence: ['Button.tsx:1'],
      covers: [{ rule: finding.ruleId, files: ['Button.tsx'] }],
    });
    const annotated = annotateFindings([finding], graph, config, root)[0];
    assert.equal(annotated.evidence, undefined);
    assert.equal(annotated.dimensions?.locations.length, 1);
    assert.equal(annotated.dimensions?.reached.state, 'reached');
    assert.equal(annotated.dimensions?.declaredIntentional.state, 'recorded');
    assert.equal(annotated.dimensions?.declaredIntentional.records.length, 2);
    assert.equal(annotated.dimensions?.locations[0].line, 1);
    for (const where of [
      'Button.tsx:1; Archive.tsx:1',
      'Button.tsx:1 …',
      'Missing.tsx:1',
      'some prose',
      'Button.tsx:0',
      'Button.tsx:1\n',
    ]) {
      const result = annotateFindings([{ ...finding, where }], graph, config, root)[0];
      assert.equal(result.dimensions?.locations.length, 0, where);
      assert.equal(result.dimensions?.reached.state, 'unresolved', where);
    }
    assert.equal(
      annotateFindings([{ ...finding, where: 'Archive.tsx:1', evidence: [] }], graph, config, root)[0]
        .dimensions?.reached.state,
      'no-static-importer',
    );
  });
});

test('declared package names do not cloud files; undeclared scoped names and aliases still do', () => {
  project(
    {
      'main.ts':
        "import '@testing-library/react'; import '@theme/Layout'; import 'lodash/fp'; import '@external/tools/helper'; import '~/theme'; import '@/custom'; import 'lib/local';",
      'react.ts': '',
      'Layout.tsx': '',
      'fp.ts': '',
      'helper.ts': '',
      'theme.ts': '',
      'custom.ts': '',
      'local.ts': '',
      'nested/package.json': JSON.stringify({
        devDependencies: { lodash: '*', '@testing-library/react': '*' },
        peerDependencies: { '@external/tools': '*' },
      }),
    },
    (root) => {
      let graph = analyseFileImports(root);
      for (const file of ['react.ts', 'fp.ts', 'helper.ts'])
        assert.equal(graph.files[file].state, 'no-static-importer', file);
      // `@theme/Layout` is a Docusaurus alias, undeclared anywhere: it must still cloud.
      for (const file of ['Layout.tsx', 'theme.ts', 'custom.ts', 'local.ts'])
        assert.equal(graph.files[file].state, 'unresolved', file);
      writeFileSync(join(root, 'nested/package.json'), '{}');
      graph = analyseFileImports(root);
      assert.equal(graph.files['react.ts'].state, 'unresolved');
      assert.equal(graph.files['fp.ts'].state, 'unresolved');
      assert.equal(graph.files['helper.ts'].state, 'unresolved');
    },
  );
});

test('declared workspace subpaths retain source resolution and uncertainty', () => {
  project(
    {
      'package.json': JSON.stringify({ workspaces: ['packages/*'], dependencies: { '@example/ui': '*' } }),
      'packages/ui/package.json': JSON.stringify({
        name: '@example/ui',
        exports: { './button': './button.ts' },
      }),
      'packages/ui/button.ts': '',
      'packages/ui/other.ts': '',
      'main.ts': "import '@example/ui/button'; import '@example/ui/missing';",
    },
    (root) => {
      const graph = analyseFileImports(root);
      assert.equal(graph.files['packages/ui/button.ts'].state, 'reached');
      assert.equal(graph.files['packages/ui/other.ts'].state, 'unresolved');
    },
  );
});
