import fs from 'node:fs';
import path from 'node:path';
import { findReferences } from '../../../shared/git';
import { findOwningPackageRoot } from '../../../shared/workspace';

export interface ReferenceUpdate {
  file: string;
  line: number;
  before: string;
  after: string;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function findFilesReferencing({
  filePath,
  workspaceRoot,
}: {
  filePath: string;
  workspaceRoot: string;
}): Promise<string[]> {
  const hits = await findReferences({ cwd: workspaceRoot, text: path.basename(filePath) });
  const referencingFiles = hits.map((hit) => path.join(workspaceRoot, hit.slice(0, hit.indexOf(':'))));
  return [...new Set(referencingFiles)].filter(
    (file) => file !== filePath && !file.includes(`${path.sep}.review${path.sep}`),
  );
}

export function updateMovedFileReferences({
  referencingFiles,
  oldPath,
  newPath,
  workspaceRoot,
}: {
  referencingFiles: string[];
  oldPath: string;
  newPath: string;
  workspaceRoot: string;
}): ReferenceUpdate[] {
  const fileName = path.basename(oldPath);
  const parentDirectoryName = path.basename(path.dirname(oldPath));
  const pathTokenPattern = new RegExp(`[\\w@.\\-/]*${escapeRegExp(fileName)}(?![\\w])`, 'g');
  const domainSegment = path.relative(path.dirname(oldPath), newPath).split(path.sep).join('/');

  return referencingFiles
    .filter((file) => fs.existsSync(file))
    .flatMap((referencingFile) => {
      const baseDirectories = [
        path.dirname(referencingFile),
        findOwningPackageRoot({ file: referencingFile, workspaceRoot }),
        workspaceRoot,
      ];

      const pointsToMovedFile = (token: string) => {
        const isThisFileName = token === fileName || token.endsWith(`/${fileName}`);
        if (!isThisFileName) return false;
        const resolvedCandidates = baseDirectories.map((base) => path.resolve(base, token));
        const resolvesToOldPath = resolvedCandidates.includes(oldPath);
        const resolvesToAnotherExistingFile = resolvedCandidates.some(
          (candidate) => candidate !== oldPath && fs.existsSync(candidate),
        );
        const endsWithSameParentFolder = token.endsWith(`${parentDirectoryName}/${fileName}`);
        return resolvesToOldPath || (endsWithSameParentFolder && !resolvesToAnotherExistingFile);
      };

      const updates: ReferenceUpdate[] = [];
      const lines = fs.readFileSync(referencingFile, 'utf8').split('\n');
      const updatedLines = lines.map((line, index) => {
        const updatedLine = line.replace(pathTokenPattern, (token) =>
          pointsToMovedFile(token) ? `${token.slice(0, -fileName.length)}${domainSegment}` : token,
        );
        if (updatedLine !== line)
          updates.push({
            file: referencingFile,
            line: index + 1,
            before: line.trim(),
            after: updatedLine.trim(),
          });
        return updatedLine;
      });

      if (updates.length) fs.writeFileSync(referencingFile, updatedLines.join('\n'));
      return updates;
    });
}
