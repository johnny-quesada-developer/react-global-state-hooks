import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runCommand } from './exec';

export type WorkingTreeSnapshot = Map<string, string>;

const git = async ({ cwd, args }: { cwd: string; args: string[] }) => {
  const result = await runCommand({ command: 'git', args, cwd, timeoutMs: 60_000 });
  return { ...result, lines: result.stdout.split('\n').filter(Boolean) };
};

export async function isCommit({ cwd, reference }: { cwd: string; reference: string }): Promise<boolean> {
  const result = await git({ cwd, args: ['cat-file', '-t', reference] });
  return result.exitCode === 0 && result.stdout.trim() === 'commit';
}

export async function listCommitFiles({ cwd, commit }: { cwd: string; commit: string }): Promise<string[]> {
  const result = await git({ cwd, args: ['show', '--name-only', '--pretty=format:', commit] });
  return result.lines.map((file) => path.join(cwd, file));
}

export async function listWorkingChanges({ cwd }: { cwd: string }): Promise<string[]> {
  const tracked = await git({ cwd, args: ['diff', '--name-only', 'HEAD'] });
  const untracked = await git({ cwd, args: ['ls-files', '--others', '--exclude-standard'] });
  const uniqueFiles = new Set([...tracked.lines, ...untracked.lines]);
  return [...uniqueFiles].map((file) => path.join(cwd, file));
}

export async function isWorkingTreeDirty({ cwd }: { cwd: string }): Promise<boolean> {
  const status = await git({ cwd, args: ['status', '--porcelain'] });
  return status.lines.length > 0;
}

export async function snapshotWorkingTree({ cwd }: { cwd: string }): Promise<WorkingTreeSnapshot> {
  const changedFiles = await listWorkingChanges({ cwd });
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
