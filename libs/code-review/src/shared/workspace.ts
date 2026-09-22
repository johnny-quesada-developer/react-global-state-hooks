import fs from 'node:fs';
import path from 'node:path';

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
export const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'coverage', '.git', '.nx', '.review'];

export interface WorkspaceProject {
  name: string;
  root: string;
  sourceRoot: string;
}

/**
 * Optional, Nx-only project discovery — used solely as a fallback source for the `project`
 * target kind when the consumer's settings don't declare `projects` explicitly. Never required:
 * a plain, non-Nx consumer either lists `projects` in settings.ts or simply doesn't use that
 * target kind. Reads `nx.json`'s `workspaceLayout` for the folder names when present, defaulting
 * to the common `libs`/`apps` pair otherwise.
 */
export function discoverNxProjects(workspaceRoot: string): WorkspaceProject[] {
  const nxConfigFile = path.join(workspaceRoot, 'nx.json');
  if (!fs.existsSync(nxConfigFile)) return [];

  const nxConfig = readJsonSafely(nxConfigFile) as { workspaceLayout?: { libsDir?: string; appsDir?: string } };
  const groupDirectories = [nxConfig.workspaceLayout?.libsDir ?? 'libs', nxConfig.workspaceLayout?.appsDir ?? 'apps'];

  return groupDirectories
    .map((group) => path.join(workspaceRoot, group))
    .filter((groupDirectory) => fs.existsSync(groupDirectory))
    .flatMap((groupDirectory) =>
      fs
        .readdirSync(groupDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => readNxProject(path.join(groupDirectory, entry.name))),
    );
}

function readNxProject(root: string): WorkspaceProject {
  const projectJsonPath = path.join(root, 'project.json');
  const fallback: WorkspaceProject = { name: path.basename(root), root, sourceRoot: root };
  const projectJson = readJsonSafely(projectJsonPath) as { name?: string; sourceRoot?: string } | undefined;
  if (!projectJson) return fallback;

  const workspaceRoot = path.dirname(path.dirname(root));
  const sourceRoot = projectJson.sourceRoot ? path.join(workspaceRoot, projectJson.sourceRoot) : root;
  return { name: projectJson.name ?? fallback.name, root, sourceRoot };
}

function readJsonSafely(file: string): unknown {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

export function findOwningPackageRoot({ file, workspaceRoot }: { file: string; workspaceRoot: string }): string {
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
