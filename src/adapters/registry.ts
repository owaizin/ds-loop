import { DEFAULT_CONFIG } from '../config/defaults.ts';
import type { DsOpsConfig } from '../config/schema.ts';
import { cssCustomPropsAdapter } from './css-custom-props.ts';
import { tailwindJsxAdapter } from './tailwind-jsx.ts';
import type { Adapter, SourceRef } from './types.ts';

/**
 * Every storage format ds-loop can read. One list, so `audit`, `scan` and
 * `sweep` can never disagree about what is readable.
 *
 * EVERY matching adapter runs, not the first — a real React app declares tokens
 * in `.css` and then uses (or bypasses) them in `.tsx`, and half that picture is
 * not an audit. Values stay attributable: each one carries its own
 * `adapterId`/`adapterVersion`.
 */
export const ADAPTERS: Adapter[] = [cssCustomPropsAdapter, tailwindJsxAdapter];

export function adaptersFor(source: SourceRef, config: DsOpsConfig = DEFAULT_CONFIG): Adapter[] {
  return ADAPTERS.filter((a) => a.detect(source, config));
}

/** manifest label: `css-custom-props@0.1.0 + tailwind-jsx@0.1.0` */
export function adapterLabel(adapters: Adapter[]): string {
  return adapters.length === 0 ? 'none' : adapters.map((a) => `${a.id}@${a.version}`).join(' + ');
}
