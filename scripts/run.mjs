#!/usr/bin/env node
/**
 * Monorepo task dispatcher.
 *
 * Translates a single package.json script into a target-aware Nx invocation so that every
 * existing script has the shape `yarn <task> <project> [extra nx/executor flags...]`.
 *
 *   yarn test web            -> nx run web:test
 *   yarn test:debug web      -> nx run web:test:debug
 *   yarn build web           -> nx run web:build
 *   yarn lint web            -> nx run web:lint
 *
 * When no project is given, the task runs across every project that defines it:
 *
 *   yarn test                -> nx run-many -t test
 *
 * The task name is passed as the first arg by the root package.json wrapper
 * (`node scripts/run.mjs <task>`). Everything the user typed after `yarn <task>` arrives in
 * argv after that: the first non-flag token is treated as the project, the rest are forwarded
 * to Nx untouched.
 *
 * Known projects are discovered from the `libs/*` workspaces so new libs (universal,
 * react-native) work without touching this file.
 *
 * `yarn test:coverage html` opens a report once the run finishes: `html` is consumed here, not
 * forwarded to Nx. `yarn test:coverage <project> html` opens that project's own
 * `coverage/index.html`; `yarn test:coverage html` (no project, i.e. the whole monorepo) merges
 * every project's coverage into one combined report at the workspace root and opens that.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeCoverageReports } from './mergeCoverageReports.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
// Projects live under libs/* (publishable packages) and apps/* (non-published apps).
const projectDirs = [path.join(workspaceRoot, 'libs'), path.join(workspaceRoot, 'apps')];

/** Read the Nx project name and root dir for every project under libs/* and apps/*. */
function discoverProjects() {
  const projects = new Map();
  for (const dir of projectDirs) {
    if (!fs.existsSync(dir)) continue;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const root = path.join(dir, entry.name);
      const projectJson = path.join(root, 'project.json');
      let name = entry.name;
      if (fs.existsSync(projectJson)) {
        try {
          name = JSON.parse(fs.readFileSync(projectJson, 'utf8')).name ?? name;
        } catch {
          // fall through to the folder name
        }
      }
      projects.set(name, root);
    }
  }
  return projects;
}

/** Whether a project's project.json declares the given Nx target (i.e. Nx would actually run it). */
function projectDefinesTarget(root, task) {
  const projectJson = path.join(root, 'project.json');
  if (!fs.existsSync(projectJson)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
    return Boolean(parsed.targets && parsed.targets[task]);
  } catch {
    return false;
  }
}

/** Open a file with the OS default handler, without blocking or failing the script on error. */
function openInBrowser(file) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [file]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', file]]
        : ['xdg-open', [file]];
  spawnSync(command, args, { stdio: 'ignore' });
}

const [task, ...rest] = process.argv.slice(2);

if (!task) {
  console.error('[run] missing task name. Usage: node scripts/run.mjs <task> [project] [...flags]');
  process.exit(1);
}

const projects = discoverProjects();
const wantsHtmlReport = task === 'test:coverage' && rest.some((arg) => arg.toLowerCase() === 'html');

// First non-flag token that matches a known project is the target, and a case-insensitive
// "html" (only meaningful for test:coverage) is consumed here. Anything else is forwarded to Nx
// (flags, or a project name we do not recognize -> let Nx report it).
let project;
const passthrough = [];
for (const arg of rest) {
  if (wantsHtmlReport && arg.toLowerCase() === 'html') continue;
  if (!project && !arg.startsWith('-') && projects.has(arg)) {
    project = arg;
    continue;
  }
  passthrough.push(arg);
}

const nxArgs = project
  ? ['nx', 'run', `${project}:${task}`, ...passthrough]
  : ['nx', 'run-many', '-t', task, ...passthrough];

const result = spawnSync('yarn', nxArgs, {
  cwd: workspaceRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(`[run] failed to start nx: ${result.error.message}`);
  process.exit(1);
}

if (wantsHtmlReport && project) {
  const reportFile = path.join(projects.get(project), 'coverage', 'index.html');
  if (fs.existsSync(reportFile)) {
    console.log(`[run] opening ${project} coverage report: ${path.relative(workspaceRoot, reportFile)}`);
    openInBrowser(reportFile);
  } else {
    console.error(`[run] --html requested, but ${path.relative(workspaceRoot, reportFile)} was not found.`);
  }
} else if (wantsHtmlReport) {
  // Only projects that actually declare the task (i.e. the ones Nx just ran) may contribute to
  // the merge — a leftover coverage-final.json from an unrelated project must not sneak in.
  const coverageProjects = new Map([...projects].filter(([, root]) => projectDefinesTarget(root, task)));
  const merged = mergeCoverageReports({ projects: coverageProjects, workspaceRoot });
  if (!merged) {
    console.error('[run] --html requested, but no project produced a coverage-final.json to merge.');
  } else {
    console.log(
      `[run] combined coverage report (${merged.projectsIncluded.join(', ')}): ${path.relative(workspaceRoot, merged.reportFile)}`,
    );
    openInBrowser(merged.reportFile);
  }
}

process.exit(result.status ?? 0);
