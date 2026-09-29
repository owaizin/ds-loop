import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const skill = new URL('../skill/', import.meta.url);
const practices = ['documenting', 'governing', 'maintaining', 'migrating', 'starting', 'storybook'];
const roles = [
  'architect',
  'auditor',
  'components',
  'consultant',
  'docs',
  'foundations',
  'governor',
  'migrator',
];
const read = (path: string) => readFileSync(new URL(path, skill), 'utf8');

for (const [directory, required] of [
  ['practices', practices],
  ['roles', roles],
] as const) {
  test(`${directory}: required files exist and every file retains its contract`, () => {
    const files = readdirSync(new URL(`${directory}/`, skill)).filter((file) => file.endsWith('.md'));
    for (const name of required) assert.ok(files.includes(`${name}.md`), `missing ${directory}/${name}.md`);
    for (const file of files) {
      const text = read(`${directory}/${file}`);
      if (directory === 'practices') {
        const citations = [...text.matchAll(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g)];
        assert.ok(citations.length > 0, `${file}: needs a published URL citation`);
        for (const citation of citations) assert.ok(new URL(citation[1]).hostname.includes('.'));
      } else {
        assert.ok(text.trimEnd().split('\n').length < 150, `${file}: must stay under 150 lines`);
        const handoff = text.match(/^## Hand-off\n+([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] ?? '';
        assert.ok(handoff.trim(), `${file}: needs a hand-off`);
        assert.match(
          handoff,
          /\b(?:consultant|auditor|architect|foundations|components|docs|migrator|governor)\b/i,
        );
      }
      for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        if (/^https?:/.test(match[1])) continue;
        const target = new URL(match[1].split('#')[0], new URL(`${directory}/${file}`, skill));
        assert.ok(existsSync(target), `${file}: broken hand-off or playbook link ${match[1]}`);
      }
    }
  });
}

test('entry point routes to all roles and consultant links every practice', () => {
  const entry = read('SKILL.md');
  const routing = read('reference/routing.md');
  const consultant = read('roles/consultant.md');
  assert.match(routing, /\| Request \|[^\n]*\| Role \|/);
  for (const role of roles) {
    assert.ok(entry.includes(`roles/${role}.md`), `entry point misses ${role}`);
    assert.ok(routing.includes(`roles/${role}.md`), `routing misses ${role}`);
  }
  for (const practice of practices) assert.ok(consultant.includes(`../practices/${practice}.md`));
  assert.match(consultant, /our own opinion/);
  assert.match(read('reference/consult.md'), /roles\/consultant\.md/);
});
