import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { listCommitFiles, listWorkingChanges } from '../../shared/git';
import { isInsideIgnoredDirectory, isSourceFile, walkFiles } from '../../shared/workspace';
import type { Target } from './detectTarget';

export async function resolveTargetFiles({
  target,
  workspaceRoot,
  repositoryRoot,
}: {
  target: Target;
  workspaceRoot: string;
  repositoryRoot: string | undefined;
}): Promise<string[]> {
  const candidates = await listCandidates({ target, workspaceRoot, repositoryRoot });
  const reviewableFiles = candidates.filter(
    (file) => fs.existsSync(file) && isSourceFile(file) && !isInsideIgnoredDirectory(path.relative(workspaceRoot, file)),
  );
  return [...new Set(reviewableFiles)].sort();
}

async function listCandidates({
  target,
  workspaceRoot,
  repositoryRoot,
}: {
  target: Target;
  workspaceRoot: string;
  repositoryRoot: string | undefined;
}): Promise<string[]> {
  switch (target.kind) {
    case 'file':
      return [target.path];
    case 'folder':
      return walkFiles(target.path);
    case 'project':
      return walkFiles(target.project.sourceRoot);
    case 'commit':
      requireRepository(repositoryRoot, 'a commit target');
      return listCommitFiles({ cwd: repositoryRoot!, commit: target.commit, workspaceRoot });
    case 'workingChanges':
      requireRepository(repositoryRoot, 'the "changes" target');
      return listWorkingChanges({ cwd: repositoryRoot!, workspaceRoot });
    case 'glob':
      return walkFiles(target.baseDirectory).filter((file) =>
        minimatch(path.relative(target.baseDirectory, file), target.pattern, { dot: false }),
      );
  }
}

function requireRepository(repositoryRoot: string | undefined, targetLabel: string): void {
  if (!repositoryRoot) throw new Error(`${targetLabel} needs a git repository, and none was found above the workspace root`);
}
