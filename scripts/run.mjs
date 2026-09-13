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
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const libsDir = path.join(workspaceRoot, 'libs');

/** Read the Nx project name for every lib under libs/* (falls back to the folder name). */
function discoverProjects() {
  if (!fs.existsSync(libsDir)) return new Set();

  const names = new Set();
  for (const entry of fs.readdirSync(libsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const projectJson = path.join(libsDir, entry.name, 'project.json');
    if (fs.existsSync(projectJson)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
        names.add(parsed.name ?? entry.name);
        continue;
      } catch {
        // fall through to the folder name
      }
    }
    names.add(entry.name);
  }
  return names;
}

const [task, ...rest] = process.argv.slice(2);

if (!task) {
  console.error('[run] missing task name. Usage: node scripts/run.mjs <task> [project] [...flags]');
  process.exit(1);
}

const projects = discoverProjects();

// First non-flag token that matches a known project is the target. Anything else is forwarded
// to Nx (flags, or a project name we do not recognize -> let Nx report it).
let project;
const passthrough = [];
for (const arg of rest) {
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

process.exit(result.status ?? 0);
