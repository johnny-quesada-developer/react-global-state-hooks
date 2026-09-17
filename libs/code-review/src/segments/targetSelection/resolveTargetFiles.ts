import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { listCommitFiles, listWorkingChanges } from '../../shared/git';
import { isInsideIgnoredDirectory, isSourceFile, walkFiles } from '../../shared/workspace';
import type { Target } from './detectTarget';

export async function resolveTargetFiles({
  target,
  workspaceRoot,
}: {
  target: Target;
  workspaceRoot: string;
}): Promise<string[]> {
  const candidates = await listCandidates({ target, workspaceRoot });
  const reviewableFiles = candidates.filter(
    (file) =>
      fs.existsSync(file) &&
      isSourceFile(file) &&
      !isInsideIgnoredDirectory(path.relative(workspaceRoot, file)),
  );
  return [...new Set(reviewableFiles)].sort();
}

async function listCandidates({
  target,
  workspaceRoot,
}: {
  target: Target;
  workspaceRoot: string;
}): Promise<string[]> {
  switch (target.kind) {
    case 'file':
      return [target.path];
    case 'folder':
      return walkFiles(target.path);
    case 'nxProject':
      return walkFiles(target.project.sourceRoot);
    case 'commit':
      return listCommitFiles({ cwd: workspaceRoot, commit: target.commit });
    case 'workingChanges':
      return listWorkingChanges({ cwd: workspaceRoot });
    case 'glob':
      return walkFiles(target.baseDirectory).filter((file) =>
        minimatch(path.relative(target.baseDirectory, file), target.pattern, { dot: false }),
      );
  }
}
