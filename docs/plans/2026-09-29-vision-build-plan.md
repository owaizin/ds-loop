# Vision build plan — 2026-09-29

This plan turns `VISION.md` (approved by the owner on 2026-09-29) into shippable phases.
Claude plans and verifies. Codex implements. The owner is asked only at phase boundaries.

Every phase keeps the engine rules in `CLAUDE.md`: no model calls, no network and no runtime
dependencies in `src/`; stable rule IDs; thresholds only in `config/`; no private names; the
`clean` / `issues` / `not-checked` distinction; and verified samples taken from real runs.

| # | Phase | What ships | Done when |
|---|---|---|---|
| 1 | **Consulting report + clear words** | `ds-loop report` writes one self-contained HTML deck with these sections: summary, the problem, before (state and architecture), ideal, after (proposed architecture), plan, and what could not be checked. The engine renders the evidence sections. The agent writes `consult.json` for the judgement sections. A clear-words layer gives every rule a plain title and description in human-facing output. The skill flow becomes: investigate, then offer "questions or go ahead", then consult, then report. | A fixture produces a complete deck. Terminal output is readable without our vocabulary. Tests pass. |
| 2 | **Live dashboard** | The report reads `.ds-scorecard/history.jsonl` and shows trends. The guard hook and CI regenerate it, so it always reflects the current code. | The dashboard shows a change after a commit that alters findings. |
| 3 | **Benchmark** | A pinned reference set of open-source products and open-source design systems, with published ratios and a reproducible build script. Team-shape facts choose which set applies. The report shows ranges, not grades. | The numbers can be reproduced from pinned SHAs. A mismatched instrument prints "not comparable". |
| 4 | **Agent team + elite practices** | Role definitions: auditor, architect, foundations, components, docs & Storybook, migration, governance. Playbooks covering how elite teams start, maintain, migrate, document and use Storybook, each with a citation. | A fresh agent session on a fixture routes to the right role and cites the practice it applies. |
| 5 | **More formats** | Token JSON (W3C DTCG and Style Dictionary), then SCSS. | Measured on a public repo nobody here wrote. |
| 6 | **Govern / document / communicate** | Docs coverage, deprecation impact (building on `consumers`), decision records, and a stakeholder report built from history. | Each one is measured on a real public repo. |
| 7 | **Package + distribute** | A Claude plugin, a Codex skill, a one-command install and a landing page. | A stranger can go from install to the report in under 30 minutes. |

Phases 1–2 build the experience the vision promises. Phases 3–6 widen what it knows. Phase 7
gets it into people's hands.
