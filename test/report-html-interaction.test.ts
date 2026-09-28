import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { REPORT_SCRIPT } from '../src/core/report-html-assets.ts';

/** Minimal DOM contract for the shipped script; this does not test browser layout. */
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
  onclick?: () => void;
  oninput?: () => void;
  onchange?: (event: { target: { value: string } }) => void;
  listeners: Record<string, () => void> = {};
  append(...nodes: Element[]) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes: Element[]) {
    this.children = [];
    this.append(...nodes);
  }
  setAttribute() {}
  addEventListener(event: string, fn: () => void) {
    this.listeners[event] = fn;
  }
}
test('10,001 findings browse lazily, paginate, search the final hit and preserve text', () => {
  const data = new Element();
  const theme = new Element();
  const root = new Element();
  const group = new Element();
  const host = new Element();
  const findings = Array.from({ length: 10001 }, (_, i) => ({
    ruleId: 'token/example',
    severity: 'high',
    summary: '</script><img onerror=alert(1)>',
    where: `a.css:${i + 1}`,
    fix: 'Review this value.',
  }));
  data.textContent = JSON.stringify({
    report: { findings },
    groups: [{ indices: findings.map((_, i) => i) }],
    swatches: {},
    suggestions: {},
  });
  host.dataset.group = '0';
  group.append(host);
  const document = {
    documentElement: root,
    getElementById: (id: string) => (id === 'audit-data' ? data : theme),
    createElement: () => new Element(),
    querySelectorAll: (selector: string) => (selector === '[data-group]' ? [host] : []),
  };
  new Script(REPORT_SCRIPT).runInNewContext({ document });
  assert.equal(host.children.length, 0, 'closed group must not mount findings');
  group.open = true;
  group.listeners.toggle();
  const [search, status, list, controls] = host.children;
  assert.equal(list.children.length, 30);
  assert.equal(status.textContent, '1–30 of 10001 findings');
  assert.equal(list.children[0].children[0].textContent, findings[0].summary);
  controls.children[1].onclick!();
  assert.equal(status.textContent, '31–60 of 10001 findings');
  search.value = 'a.css:10001';
  search.oninput!();
  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].children[1].textContent, 'a.css:10001');
  assert.equal(status.textContent, '1–1 of 1 findings');
  search.value = 'no matching source';
  search.oninput!();
  assert.equal(list.children.length, 0);
  assert.equal(status.textContent, 'No matching findings');
  theme.onchange!({ target: { value: 'dark' } });
  assert.equal(root.dataset.theme, 'dark');
});
