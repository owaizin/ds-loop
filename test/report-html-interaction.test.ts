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
  assert.equal(list.children[0].children[1].textContent, findings[0].summary);
  controls.children[1].onclick!();
  assert.equal(status.textContent, '31–60 of 10001 findings');
  search.value = 'a.css:10001';
  search.oninput!();
  assert.equal(list.children.length, 1);
  const details = list.children[0].children[3];
  details.open = true;
  details.listeners.toggle();
  assert.ok(details.children.some((n) => n.textContent === 'where: a.css:10001'));
  assert.equal(status.textContent, '1–1 of 1 findings');
  search.value = 'no matching source';
  search.oninput!();
  assert.equal(list.children.length, 0);
  assert.equal(status.textContent, 'No matching findings');
  theme.onchange!({ target: { value: 'dark' } });
  assert.equal(root.dataset.theme, 'dark');
});

test('suggestion table mounts three candidates and expands the remainder on demand', () => {
  const data = new Element();
  const root = new Element();
  const theme = new Element();
  const host = new Element();
  const details = new Element();
  host.dataset.suggestions = '0';
  details.append(host);
  const candidates = Array.from({ length: 11 }, (_, i) => ({
    token: `--space-${i}`,
    match: 'nearest',
    distance: 1,
    metric: 'px',
    preferred: false,
    aliasChain: [`--space-${i}`],
    declarations: [],
    categoryMatch: 'same',
  }));
  data.textContent = JSON.stringify({
    report: {
      findings: [
        {
          suggestion: {
            values: [
              {
                value: '13px',
                file: 'a.css',
                line: 1,
                property: 'padding',
                category: 'spacing',
                status: 'ambiguous',
                candidates,
              },
            ],
          },
        },
      ],
    },
    swatches: {},
  });
  const document = {
    documentElement: root,
    getElementById: (id: string) => (id === 'audit-data' ? data : theme),
    createElement: () => new Element(),
    querySelectorAll: (selector: string) => (selector === '[data-suggestions]' ? [host] : []),
  };
  new Script(REPORT_SCRIPT).runInNewContext({ document });
  details.open = true;
  details.listeners.toggle();
  const table = host.children[0].children[0];
  const cell = table.children[1].children[0].children[3];
  assert.equal(cell.children.length, 4);
  const more = cell.children[3];
  assert.equal(more.children[0].textContent, '+8 more');
  assert.equal(more.children.length, 1);
  more.open = true;
  more.listeners.toggle();
  assert.equal(more.children.length, 9);
  assert.ok(more.children[1].textContent.includes('--space-2'));
});
