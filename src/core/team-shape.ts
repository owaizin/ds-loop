import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { type ConsumersReport, analyseConsumers } from './consumers.ts';
import { listFiles } from './files.ts';

export type ShapeFact = { label: string; value: string; files: string[] };
export type PackageShape = {
  name: string;
  file: string;
  private: boolean | null;
  exports: boolean | null;
  application: boolean;
};
export type TeamShape = {
  facts: ShapeFact[];
  packages: PackageShape[];
  productionConsumers: string[];
  workspaceChecked: boolean;
};

/** Structural observations only. Absence is reported within the named search scope. */
export function teamShape(root: string, consumers: ConsumersReport = analyseConsumers(root)): TeamShape {
  const packages: PackageShape[] = [];
  const facts: ShapeFact[] = [];
  const manifests = new Map([
    ['package.json', '(root)'],
    ...consumers.packages.map((p) => [join(p.dir, 'package.json'), p.name] as [string, string]),
  ]);
  for (const [file, name] of manifests) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, file), 'utf8'));
      const entry = {
        name,
        file,
        private: typeof pkg.private === 'boolean' ? pkg.private : pkg.private === undefined ? false : null,
        exports: pkg.exports !== undefined,
        application: Object.values(pkg.scripts ?? {}).some(
          (s) => typeof s === 'string' && /\b(next (?:dev|start|build)|vite(?: |$)|react-scripts)\b/.test(s),
        ),
      };
      packages.push(entry);
      facts.push({
        label: `Package ${name}`,
        value: `private: ${pkg.private === undefined ? 'not declared (npm default: false)' : String(pkg.private)}; exports: ${entry.exports ? 'declared' : 'not declared'}; application command: ${entry.application ? 'found' : 'not found'}`,
        files: [file],
      });
    } catch {
      facts.push({
        label: `Package ${name}`,
        value: 'not checked — manifest missing or unreadable',
        files: [file],
      });
    }
  }
  facts.unshift({
    label: 'Workspace packages',
    value:
      consumers.status === 'checked'
        ? consumers.packages.map((p) => p.name).join(', ')
        : 'not checked — no supported workspace packages resolved',
    files: ['package.json', 'pnpm-workspace.yaml'],
  });
  const productionConsumers: string[] = [];
  for (const c of consumers.consumers) {
    const uses = c.uses.filter((u) => u.production > 0 && u.target !== c.package);
    if (uses.length) productionConsumers.push(c.package);
    facts.push({
      label: `Production imports from ${c.package}`,
      value: uses.length ? uses.map((u) => u.target).join(', ') : 'not found in supported imports',
      files: [
        join(c.dir, 'package.json'),
        ...uses.flatMap((u) => u.samples.map((s) => `${s.file}:${s.line}`)),
      ],
    });
  }
  const owners = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];
  facts.push({
    label: 'Code owners',
    value:
      !existsSync(root) || !statSync(root).isDirectory()
        ? 'not checked — target is not a directory'
        : owners.some((p) => existsSync(join(root, p)))
          ? 'found'
          : 'not found in checked locations',
    files: owners,
  });
  let storiesIncomplete = false;
  const stories = listFiles(root, ['.ts', '.tsx', '.js', '.jsx', '.mdx'], () => {
    storiesIncomplete = true;
  }).filter((p) => /\.(?:stories|story)\./.test(p));
  const directory = existsSync(root) && statSync(root).isDirectory();
  facts.push({
    label: 'Stories',
    value: !directory
      ? 'not checked — target is not a directory'
      : storiesIncomplete
        ? 'not checked — source discovery was incomplete'
        : stories.length
          ? 'found'
          : 'not found in supported source tree',
    files: stories.length ? stories.map((p) => relative(root, p)) : ['. (source walker scope)'],
  });
  // ponytail: components/ui is a single-app convention, not proof of shared UI.
  // Upgrade to symbol-level local component usage before claiming adoption.
  const ui = ['components/ui', 'src/components/ui'].filter(
    (p) => existsSync(join(root, p)) && statSync(join(root, p)).isDirectory(),
  );
  facts.push({
    label: 'Single-app UI directory heuristic',
    value: ui.length
      ? 'found (not proof of reuse)'
      : directory
        ? 'not found in checked locations'
        : 'not checked',
    files: ui.length ? ui : ['components/ui', 'src/components/ui'],
  });
  return { facts, packages, productionConsumers, workspaceChecked: consumers.status === 'checked' };
}

export function formatTeamShape(shape: TeamShape): string[] {
  return shape.facts.map((f) => `${f.label}: ${f.value} — ${f.files.join(', ') || 'not checked'}`);
}
