import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { audit } from '../src/commands/audit.ts';
import { scorecardRow } from '../src/commands/scorecard.ts';
import { renderConsultHtml } from '../src/core/consult-html.ts';
import { analyseConsumers } from '../src/core/consumers.ts';
import { renderDashboardHtml } from '../src/core/dashboard-html.ts';
import { findingReach, reachLimits, reached } from '../src/core/reach-html.ts';
import { renderAuditHtml } from '../src/core/report-html.ts';

const visible = (s: string) =>
  s.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, ' ');
for (const surface of ['audit', 'consult', 'dashboard']) {
  test(`${surface}: reached evidence, counts, once-only limits and absent fields`, () => {
    const root = mkdtempSync(join(tmpdir(), 'reach-html-'));
    try {
      writeFileSync(join(root, 'entry.ts'), "import './imported.css';");
      writeFileSync(join(root, 'imported.css'), '.a { color: #123456; padding: 13px; }');
      writeFileSync(join(root, 'orphan.css'), '.b { color: #abcdef; margin: 17px; border-radius: 9px; }');
      const report = audit(root, { silent: true });
      const consumers = analyseConsumers(root);
      const render = () =>
        surface === 'audit'
          ? renderAuditHtml(report)
          : surface === 'consult'
            ? renderConsultHtml(report, consumers, root)
            : renderDashboardHtml(report, scorecardRow(report, consumers), consumers, '', root);
      report.reachedRatios = { ...report.reachedRatios, 'style-tokenization-color': 0.375 };
      const html = render();
      const text = visible(html);
      assert.match(text, /No static importer found/);
      assert.match(text, /mixed/);
      if (surface !== 'audit') assert.match(text, /reached 37.5%/);
      if (surface !== 'dashboard') {
        assert.match(text, /occurrences · reached 1/);
        assert.match(text, /Tokenization:.*reached 0.0%/);
      }
      assert.match(text, /No static importer found · 1 located occurrences all \/ reached 0/);
      assert.match(text, /located occurrences all \/ reached [1-9]/);
      for (const f of report.findings) assert.ok(text.includes(findingReach(f)), f.ruleId);
      assert.ok(text.includes(reached(report.findingTotals?.reached)));
      for (const line of reachLimits(report)) assert.equal(text.split(line).length - 1, 1, line);
      assert.doesNotMatch(text, /\bdead\b|\bunused\b|safe to delete|\bunreachable\b/i);
      Reflect.deleteProperty(report, 'fileImports');
      Reflect.deleteProperty(report, 'findingEvidence');
      Reflect.deleteProperty(report, 'findingTotals');
      Reflect.deleteProperty(report, 'reachedStyleInventory');
      Reflect.deleteProperty(report, 'reachedRatios');
      for (const f of report.findings) Reflect.deleteProperty(f, 'dimensions');
      const old = visible(render());
      assert.match(old, /reached not measured/);
      assert.doesNotMatch(old, /reached 0/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
