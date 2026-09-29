import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { INSTALL_BLOCK } from '../src/commands/install.ts';

const root = new URL('../', import.meta.url);
const directory = new URL('skill/commands/', root);
// Plugin commands are namespaced under the plugin name, so these are typed
// `/ds-loop:start`, not `/ds-loop start`. The space form reads naturally and does not
// exist; asserting it here keeps README and the installed block from teaching it.
// No agent command may share a name with a CLI command. `/ds-loop audit` was left out
// for that reason and `drift` is here for the same one: `ds-loop guard` installs a hook,
// while the agent command is about catching values as they are written, and two different
// things answering to one name is how a user ends up running the wrong one.
const expected = [
  'start',
  'diagnose',
  'inventory',
  'foundations',
  'propose',
  'establish',
  'transform',
  'component',
  'document',
  'govern',
  'drift',
  'prove',
];
const files = readdirSync(directory);

test('the twelve agent commands are present with no extra commands', () => {
  assert.deepEqual([...files].sort(), expected.map((name) => `${name}.md`).sort());
});

for (const file of files) {
  test(`${file}: short evidence-first router with valid references and a finish line`, () => {
    const url = new URL(file, directory);
    const text = readFileSync(url, 'utf8');
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, 'needs frontmatter');
    assert.equal(frontmatter[1].match(/^name: (\S+)$/m)?.[1], file.replace(/\.md$/, ''));
    assert.match(frontmatter[1], /^description: \S[^\n]*$/m);
    assert.ok(text.trimEnd().split('\n').length < 40, 'must stay under 40 lines');

    const body = text.slice(frontmatter[0].length).trim();
    assert.deepEqual(
      [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
      ['Evidence first', 'Route', 'Finish line'],
    );
    const evidence = body.split('## Route')[0];
    assert.match(evidence, /Before replying, read .*instructions and the code/);
    assert.match(evidence, /Run `ds-loop context \.`.*`ds-loop audit \. --json`.*unfiltered/);
    assert.doesNotMatch(evidence, /--(?:min-severity|quiet|silent|target|files)\b/);
    assert.match(evidence, /coverage/);
    assert.match(evidence, /not-checked/);

    const route = body.split('## Route')[1].split('## Finish line')[0];
    assert.match(route, /\.\.\/(?:reference|practices)\/[^)]+\.md|\.\.\/SKILL\.md/);
    assert.match(route, /\.\.\/roles\/[^)]+\.md/);
    // Check all Markdown path references, including any future inline-code paths.
    const paths = [...text.matchAll(/(?:\.\.\/|\.\/)?(?:[\w.-]+\/)*[\w.-]+\.md(?:#[\w-]+)?/g)];
    assert.ok(paths.length > 0, 'needs a playbook or role reference');
    for (const [path] of paths) {
      // Link labels such as SKILL.md aren't paths; their link targets are checked below.
      if (!path.includes('/')) continue;
      assert.ok(statSync(new URL(path.split('#')[0], url)).isFile(), `missing reference: ${path}`);
    }
    for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      assert.ok(statSync(new URL(target.split('#')[0], url)).isFile(), `missing link: ${target}`);
    }
    const finish = body.split('## Finish line')[1];
    assert.ok(finish.trim().length > 0, 'needs a finish line');
    assert.match(finish, /Your team|You don't/i);
  });
}

test('plugin, install instructions and README expose every agent command', () => {
  const plugin = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', root), 'utf8'));
  assert.equal(plugin.skills, './skill');
  assert.equal(plugin.commands, './skill/commands');
  const readme = readFileSync(new URL('README.md', root), 'utf8');
  for (const name of expected) {
    assert.ok(INSTALL_BLOCK.includes(`\`/ds-loop:${name}\``), `install misses ${name}`);
    assert.match(readme, new RegExp(`\\| \x60/ds-loop:${name}\x60 \\|[^\\n]+\\|[^\\n]+\\|`));
  }
});
