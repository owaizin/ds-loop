import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { documentationCoverage } from '../src/rules/docs.ts';

function fixture(stories: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'docs-'));
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ workspaces: ['packages/*'] }),
    'packages/ui/package.json': JSON.stringify({ name: 'ui', exports: '.' }),
    'packages/ui/Button.tsx':
      'export interface ButtonProps { label: string }\nexport function Button(props: ButtonProps) { return <button>{props.label}</button>; }',
    'packages/ui/Card.tsx': 'export const Card = () => <div />;',
  };
  if (stories) files['packages/ui/Button.stories.tsx'] = 'export const Basic = () => <Button label="Hi" />;';
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  return root;
}
test('documentation ratios locate missing exported components and separate evidence categories', () => {
  const root = fixture(true);
  const p = documentationCoverage(root).packages[0];
  assert.equal(p.ratios.documented, 0.5);
  assert.equal(p.ratios.story, 0.5);
  assert.equal(p.ratios.types, 0.5);
  assert.equal(p.ratios.example, 0.5);
  assert.equal(p.components.find((c) => c.name === 'Card')!.line, 1);
  const report = audit(root, { silent: true });
  assert.ok(
    report.findings.some(
      (f) => f.ruleId === 'docs/undocumented-shared-component' && f.where.includes('Card.tsx:1'),
    ),
  );
  assert.equal(report.ratios['docs-documented:ui'], 0.5);
});
test('no documentation convention and scoped scans are not checked, never zero documented', () => {
  const root = fixture(false);
  assert.equal(documentationCoverage(root).packages[0].ratios.documented, null);
  const report = audit(root, { silent: true, files: ['packages/ui/Card.tsx'] });
  assert.equal(report.documentation?.status, 'not-checked');
  assert.ok(!report.findings.some((f) => f.ruleId === 'docs/undocumented-shared-component'));
});

test('local export lists, adjacent Markdown and prop tables are evidence; private helpers are excluded', () => {
  const root = fixture(false);
  writeFileSync(
    join(root, 'packages/ui/Card.tsx'),
    'const Helper = () => <div />;\nconst Card = () => <article />;\nexport { Card };',
  );
  writeFileSync(join(root, 'packages/ui/Card.md'), '# Card\n<ArgsTable of={Card} />\n\n<Card />');
  const p = documentationCoverage(root).packages[0];
  assert.equal(p.status, 'checked');
  assert.equal(p.components.length, 2);
  const card = p.components.find((c) => c.name === 'Card')!;
  assert.equal(card.line, 2);
  assert.equal(card.types[0].line, 2);
  assert.equal(card.example[0].line, 4);
});

test('a standalone package with exports is supported and unrelated apps are excluded', () => {
  const root = fixture(true);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'standalone', exports: './index.ts' }));
  const result = documentationCoverage(root);
  assert.equal(result.packages[0].package, 'standalone');
  assert.equal(result.status, 'checked');
});
