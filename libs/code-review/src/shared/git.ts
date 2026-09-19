import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runCommand } from './exec';
import { isPathInside } from './isPathInside';

export type WorkingTreeSnapshot = Map<string, string>;

const git = async ({ cwd, args }: { cwd: string; args: string[] }) => {
  const result = await runCommand({ command: 'git', args, cwd, timeoutMs: 60_000 });
  return { ...result, lines: result.stdout.split('\n').filter(Boolean) };
};

/**
 * Every git command below runs from the REPOSITORY root (not the caller's `cwd`) and joins
 * returned paths to that same root. Git's own path-relativization (relative to the invoking
 * cwd by default) would otherwise silently break once `cwd` is a workspace nested inside a
 * larger repository — running from the true root and filtering afterwards is what keeps a
 * nested workspace root correct.
 */
export async function findRepositoryRoot({ cwd }: { cwd: string }): Promise<string | undefined> {
  const result = await git({ cwd, args: ['rev-parse', '--show-toplevel'] });
  return result.exitCode === 0 ? result.lines[0] : undefined;
}

export async function isCommit({ cwd, reference }: { cwd: string; reference: string }): Promise<boolean> {
  const result = await git({ cwd, args: ['cat-file', '-t', reference] });
  return result.exitCode === 0 && result.stdout.trim() === 'commit';
}

const filterToWorkspace = ({ files, workspaceRoot }: { files: string[]; workspaceRoot: string }) =>
  files.filter((file) => isPathInside({ child: file, parent: workspaceRoot }));

export async function listCommitFiles({
  cwd,
  commit,
  workspaceRoot,
}: {
  cwd: string;
  commit: string;
  workspaceRoot: string;
}): Promise<string[]> {
  const repositoryRoot = (await findRepositoryRoot({ cwd })) ?? cwd;
  const result = await git({ cwd: repositoryRoot, args: ['show', '--name-only', '--pretty=format:', commit] });
  const files = result.lines.map((file) => path.join(repositoryRoot, file));
  return filterToWorkspace({ files, workspaceRoot });
}

export async function listWorkingChanges({
  cwd,
  workspaceRoot,
}: {
  cwd: string;
  workspaceRoot: string;
}): Promise<string[]> {
  const repositoryRoot = (await findRepositoryRoot({ cwd })) ?? cwd;
  const tracked = await git({ cwd: repositoryRoot, args: ['diff', '--name-only', 'HEAD'] });
  const untracked = await git({ cwd: repositoryRoot, args: ['ls-files', '--others', '--exclude-standard'] });
  const uniqueFiles = new Set([...tracked.lines, ...untracked.lines]);
  const files = [...uniqueFiles].map((file) => path.join(repositoryRoot, file));
  return filterToWorkspace({ files, workspaceRoot });
}

export async function isWorkingTreeDirty({ cwd }: { cwd: string }): Promise<boolean> {
  const status = await git({ cwd, args: ['status', '--porcelain'] });
  return status.lines.length > 0;
}

export async function snapshotWorkingTree({ cwd }: { cwd: string }): Promise<WorkingTreeSnapshot> {
  const changedFiles = await listWorkingChanges({ cwd, workspaceRoot: cwd });
  return new Map(changedFiles.map((file) => [file, hashFile(file)]));
}

export async function listChangedSince({
  cwd,
  snapshot,
}: {
  cwd: string;
  snapshot: WorkingTreeSnapshot;
}): Promise<string[]> {
  const current = await snapshotWorkingTree({ cwd });
  const touchedPaths = new Set([...snapshot.keys(), ...current.keys()]);
  return [...touchedPaths].filter((file) => snapshot.get(file) !== current.get(file));
}

export async function findReferences({ cwd, text }: { cwd: string; text: string }): Promise<string[]> {
  const result = await git({
    cwd,
    args: ['grep', '-n', '-I', '--fixed-strings', '--untracked', text, '--', '.', ':!**/node_modules/**'],
  });
  return result.lines;
}

function hashFile(file: string): string {
  if (!fs.existsSync(file)) return 'deleted';
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
}
