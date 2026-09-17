import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
export const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'coverage', '.git', '.nx', '.review'];

export interface NxProject {
  name: string;
  root: string;
  sourceRoot: string;
}

export function findWorkspaceRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  while (current !== path.dirname(current)) {
    const isNxWorkspace = fs.existsSync(path.join(current, 'nx.json'));
    if (isNxWorkspace) return current;
    current = path.dirname(current);
  }
  return path.resolve(startDirectory);
}

export function listNxProjects(workspaceRoot: string): NxProject[] {
  return ['libs', 'apps']
    .map((group) => path.join(workspaceRoot, group))
    .filter((groupDirectory) => fs.existsSync(groupDirectory))
    .flatMap((groupDirectory) =>
      fs
        .readdirSync(groupDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => readNxProject(path.join(groupDirectory, entry.name))),
    );
}

function readNxProject(root: string): NxProject {
  const projectJsonPath = path.join(root, 'project.json');
  const fallback = { name: path.basename(root), root, sourceRoot: root };
  if (!fs.existsSync(projectJsonPath)) return fallback;

  try {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    const workspaceRoot = path.dirname(path.dirname(root));
    const sourceRoot = projectJson.sourceRoot ? path.join(workspaceRoot, projectJson.sourceRoot) : root;
    return { name: projectJson.name ?? fallback.name, root, sourceRoot };
  } catch {
    return fallback;
  }
}

export function findOwningPackageRoot({
  file,
  workspaceRoot,
}: {
  file: string;
  workspaceRoot: string;
}): string {
  let current = path.dirname(file);
  while (current.startsWith(workspaceRoot) && current !== workspaceRoot) {
    const hasPackageJson = fs.existsSync(path.join(current, 'package.json'));
    if (hasPackageJson) return current;
    current = path.dirname(current);
  }
  return workspaceRoot;
}

export function isSourceFile(file: string): boolean {
  return SOURCE_EXTENSIONS.includes(path.extname(file));
}

export function isInsideIgnoredDirectory(file: string): boolean {
  return file.split(path.sep).some((segment) => IGNORED_DIRECTORIES.includes(segment));
}

export function walkFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED_DIRECTORIES.includes(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

export const toRelative = (workspaceRoot: string, file: string) => path.relative(workspaceRoot, file);

export function readIfExists(file: string, maxCharacters = 6000): string | undefined {
  if (!fs.existsSync(file)) return undefined;
  const content = fs.readFileSync(file, 'utf8');
  return content.length > maxCharacters ? `${content.slice(0, maxCharacters)}\n/* …truncated… */` : content;
}
