import fs from 'node:fs';
import path from 'node:path';
import { isCommit } from '../../shared/git';
import type { WorkspaceProject } from '../../shared/workspace';

export type Target =
  | { kind: 'file'; path: string }
  | { kind: 'folder'; path: string }
  | { kind: 'glob'; pattern: string; baseDirectory: string }
  | { kind: 'commit'; commit: string }
  | { kind: 'workingChanges' }
  | { kind: 'project'; project: WorkspaceProject };

export type TargetKind = Target['kind'];

const WORKING_CHANGES_ALIASES = ['changes', 'working', 'diff'];
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const GLOB_CHARACTERS = /[*?[\]{}]/;

export async function detectTarget({
  value,
  workspaceRoot,
  invocationDirectory,
  projects,
}: {
  value: string;
  workspaceRoot: string;
  invocationDirectory: string;
  projects: WorkspaceProject[];
}): Promise<Target | undefined> {
  const isWorkingChanges = WORKING_CHANGES_ALIASES.includes(value.toLowerCase());
  if (isWorkingChanges) return { kind: 'workingChanges' };

  const existingPath = [path.resolve(invocationDirectory, value), path.resolve(workspaceRoot, value)].find((candidate) =>
    fs.existsSync(candidate),
  );
  if (existingPath) {
    return fs.statSync(existingPath).isDirectory() ? { kind: 'folder', path: existingPath } : { kind: 'file', path: existingPath };
  }

  const project = projects.find(({ name }) => name === value);
  if (project) return { kind: 'project', project };

  const looksLikeCommit = COMMIT_PATTERN.test(value) || value === 'HEAD' || value.startsWith('HEAD~');
  if (looksLikeCommit && (await isCommit({ cwd: workspaceRoot, reference: value }))) return { kind: 'commit', commit: value };

  const looksLikeGlob = GLOB_CHARACTERS.test(value);
  if (looksLikeGlob) return { kind: 'glob', pattern: value, baseDirectory: invocationDirectory };

  return undefined;
}

export const describeTargets = (targets: Target[], workspaceRoot: string) =>
  targets.map((target) => describeTarget(target, workspaceRoot)).join(' + ');

export function describeTarget(target: Target, workspaceRoot: string): string {
  switch (target.kind) {
    case 'file':
    case 'folder':
      return `${target.kind} ${path.relative(workspaceRoot, target.path)}`;
    case 'glob':
      return `glob ${target.pattern}`;
    case 'commit':
      return `commit ${target.commit}`;
    case 'workingChanges':
      return 'current git changes';
    case 'project':
      return `project ${target.project.name}`;
  }
}
