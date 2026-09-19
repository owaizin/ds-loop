import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Severity } from '../rules/types.ts';
import { DEFAULT_CONFIG } from './defaults.ts';
import type { DsOpsConfig, IgnoreEntry } from './schema.ts';
import { parseYamlLite } from './yaml-lite.ts';

/**
 * ds-loop reads its own config, and — for interop — a `.ds-ops-config.yml` in
 * the Murphy Trueman `design-system-ops` format (that filename is his, kept
 * verbatim so a team already running his skill pack points ds-loop at the same
 * file): the `system:` block seeds context, the `severity:` block maps onto
 * ds-loop rule severities.
 */

const MURPHY_SEVERITY_TO_RULES: Record<string, string[]> = {
  hardcoded_color: ['color/semantic-holds-literal', 'color/mixed-storage-forms'],
  wrong_tier_reference: ['token/tier-leakage'],
  tier_leakage: ['token/tier-leakage'],
  naming_violation: ['token/semantic-name-describes-appearance'],
};

const LEVEL_MAP: Record<string, Severity> = {
  critical: 'blocking',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export type LoadedConfig = {
  config: DsOpsConfig;
  severityOverrides: Record<string, Severity>;
  system: Record<string, unknown> | null;
  source: string;
};

export function loadConfig(explicitPath: string | undefined, cwd = process.cwd()): LoadedConfig {
  if (explicitPath) {
    const raw = JSON.parse(readFileSync(explicitPath, 'utf8'));
    return {
      config: mergeConfig(raw),
      severityOverrides: raw.severityOverrides ?? {},
      system: raw.system ?? null,
      source: explicitPath,
    };
  }

  for (const name of [
    '.ds-loop-config.yml',
    '.ds-loop-config.yaml',
    'ds-loop.config.json',
    '.ds-ops-config.yml', // Murphy Trueman design-system-ops interop
    '.ds-ops-config.yaml',
  ]) {
    const p = join(cwd, name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    const parsed = (name.endsWith('.json') ? JSON.parse(text) : parseYamlLite(text)) as Record<
      string,
      unknown
    >;
    return {
      config: mergeConfig(parsed),
      severityOverrides: severityOverridesFrom(parsed),
      system: (parsed.system as Record<string, unknown>) ?? null,
      source: p,
    };
  }

  return { config: DEFAULT_CONFIG, severityOverrides: {}, system: null, source: 'defaults' };
}

function mergeConfig(user: Record<string, unknown>): DsOpsConfig {
  const u = user as Partial<DsOpsConfig>;
  return {
    clustering: { ...DEFAULT_CONFIG.clustering, ...u.clustering },
    taxonomy: { ...DEFAULT_CONFIG.taxonomy, ...u.taxonomy },
    sweep: { ...DEFAULT_CONFIG.sweep, ...u.sweep },
    ignore: readIgnores(u.ignore),
  };
}

/**
 * An exception without an argument is a threshold in disguise: it silences a
 * finding and records nothing a later reader can disagree with. A config that
 * tries it fails to load rather than loading with the entry dropped, because a
 * dropped entry would look like the exception was honoured.
 */
function readIgnores(raw: unknown): IgnoreEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error('config: `ignore` must be a list of exception entries');
  return raw.map((e, i) => {
    const entry = e as Partial<IgnoreEntry>;
    if (typeof entry.rule !== 'string' || entry.rule === '') {
      throw new Error(`config: ignore[${i}] needs a \`rule\` — a rule id, or \`*\` for every rule`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      throw new Error(
        `config: ignore[${i}] (${entry.rule}) needs a \`reason\` — say why this is not a finding, in your own words. An exception without an argument is a threshold in disguise.`,
      );
    }
    return {
      rule: entry.rule,
      ...(entry.value !== undefined ? { value: entry.value } : {}),
      ...(Array.isArray(entry.files) ? { files: entry.files } : {}),
      reason: entry.reason,
      ...(entry.createdAt !== undefined ? { createdAt: entry.createdAt } : {}),
    };
  });
}

function severityOverridesFrom(parsed: Record<string, unknown>): Record<string, Severity> {
  const out: Record<string, Severity> = { ...(parsed.severityOverrides as Record<string, Severity>) };
  const sev = parsed.severity as Record<string, string> | undefined;
  if (sev) {
    for (const [murphyKey, level] of Object.entries(sev)) {
      const mapped = LEVEL_MAP[level];
      const ruleIds = MURPHY_SEVERITY_TO_RULES[murphyKey];
      if (mapped && ruleIds) for (const id of ruleIds) out[id] = mapped;
    }
  }
  return out;
}
