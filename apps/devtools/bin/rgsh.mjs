#!/usr/bin/env node
// Launcher for the rgsh CLI. Runs the built bundle when it exists, and the TypeScript source
// through tsx when working from a checkout, so `yarn rgsh` works before and after `yarn build:cli`.
/* global process */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundle = `${root}dist-cli/rgsh.mjs`;

if (existsSync(bundle)) {
  await import(pathToFileURL(bundle).href);
} else {
  const source = `${root}src/cli/main.ts`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', source, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: root,
  });
  process.exit(result.status ?? 1);
}
