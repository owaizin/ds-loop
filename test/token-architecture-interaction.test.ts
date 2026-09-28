import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { TOKEN_SCRIPT } from '../src/core/token-architecture-html.ts';

/** Browser interaction contract only; not a layout screenshot test. */
class Element {
  children: Element[] = [];
  parentElement?: Element;
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  textContent = '';
  className = '';
  value = '';
  open = false;
  disabled = false;
  listeners: Record<string, () => void> = {};
  append(...nodes: Element[]) {
    for (const n of nodes) {
      n.parentElement = this;
      this.children.push(n);
    }
  }
  replaceChildren(...nodes: Element[]) {
    this.children = [];
    this.append(...nodes);
  }
  addEventListener(event: string, fn: () => void) {
    this.listeners[event] = fn;
  }
  scrollIntoView() {}
  focus() {}
}
test('10k tokens mount 30 results, find the last token and browse a cycle safely', () => {
  const hosts = new Map(
    ['token-groups', 'token-edges', 'token-search', 'token-results', 'token-detail'].map((id) => [
      id,
      new Element(),
    ]),
  );
  const a = {
    tokens: Array.from({ length: 10000 }, (_, i) => ({
      name: `--token-${i}`,
      tier: 'unknown',
      aliasDepth: null,
      cycle: i === 9999,
      declarations: [
        {
          file: 'a.css',
          line: i + 1,
          value: '</script><b>literal text</b>',
          selector: '.dark',
          mode: true,
          sourceOrder: i,
        },
      ],
    })),
    groups: [],
    edges: [],
    references: [{ from: '--token-9999', to: '--token-9999', file: 'a.css', line: 10000, property: 'color' }],
    health: { undeclared: [] },
  };
  const document = {
    getElementById: (id: string) => hosts.get(id),
    querySelectorAll: () => [],
    createElement: () => new Element(),
  };
  const el = (_tag: string, text?: string) => {
    const e = new Element();
    e.textContent = text ?? '';
    return e;
  };
  new Script(TOKEN_SCRIPT).runInNewContext({ payload: { report: { tokenArchitecture: a } }, document, el });
  const results = hosts.get('token-results')!;
  assert.equal(results.children[1].children.length, 30);
  const search = hosts.get('token-search')!;
  search.value = '--token-9999';
  search.listeners.input();
  assert.equal(results.children[1].children.length, 1);
  results.children[1].children[0].listeners.click();
  const detail = hosts.get('token-detail')!;
  assert.equal(detail.children[0].textContent, '--token-9999');
  const deps = detail.children[5];
  deps.open = true;
  deps.listeners.toggle();
  assert.equal(deps.children[1].children[1].children.length, 1, 'cycle is visited once');
  assert.equal(
    detail.children[4].children[1].children[0].children[0].textContent,
    '</script><b>literal text</b>',
  );
});
