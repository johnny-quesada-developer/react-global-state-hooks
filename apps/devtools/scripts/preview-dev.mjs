#!/usr/bin/env node
// Local mock dev server (with HMR).
//
// Usage: yarn preview:dev [example]
//   example: devtools | dev | todolist | todo | todos   (default: devtools)
//
// Runs the Vite DEV SERVER (hot module replacement) on the local mock page
// (index.local.html -> src/index.dev.tsx) with the chosen mock example baked in
// via the PREVIEW_MOCK_EXAMPLE env var -> Vite `define` -> src/index.dev.tsx.
//
// Unlike `vite preview` (which serves a static, already-built bundle), this
// watches your source and hot-reloads on every change.

import { spawnSync } from 'node:child_process';

const example = (process.argv[2] ?? 'devtools').toLowerCase().trim();

const known = new Set(['devtools', 'dev', 'todolist', 'todo', 'todos']);
if (!known.has(example)) {
  console.warn(`[preview:dev] Unknown example "${example}". Falling back to "devtools".`);
  console.warn(`[preview:dev] Known examples: ${[...known].join(', ')}`);
}

// VITE_-prefixed so Vite auto-exposes it to client code via import.meta.env
// (works identically for the dev server and for `vite build`).
const env = { ...process.env, VITE_MOCK_EXAMPLE: example };

// Start the Vite dev server (HMR), opening the local mock page directly.
const result = spawnSync('yarn', ['vite', '--mode', 'development', '--open', '/index.local.html'], {
  stdio: 'inherit',
  shell: true,
  env,
});

process.exit(result.status ?? 0);
