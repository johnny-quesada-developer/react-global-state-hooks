#!/usr/bin/env node
/**
 * Remote validation of what is actually PUBLISHED on npm for our packages.
 *
 * For each publishable package it queries the npm registry for the `latest` and `beta` dist-tags
 * and compares them against the LOCAL version (what `yarn publish:pkg` / `publish:beta` would
 * deploy). Prerelease versions (e.g. 1.0.0-beta.0) are flagged "(beta)".
 *
 * Status per package:
 *   in-sync   local === npm latest
 *   ahead     local > npm latest      (not yet published — a deploy would ship it)
 *   behind    local < npm latest      (registry is ahead of the repo)
 *   unpub     nothing on npm latest
 *
 * Usage:
 *   node scripts/versions-remote.mjs [--json]
 *     --json   Emit the data as JSON instead of a table.
 *
 * Requires network access to the npm registry. Unreachable/unpublished tags show "-".
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const semver = require('semver');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

// Same publishable set / order as publish-all.mjs.
const PACKAGES = [
  { cwd: 'libs/monkey_patch' },
  { cwd: 'libs/universal' },
  { cwd: 'libs/web' },
  { cwd: 'libs/mobile' },
];

const NONE = '-';

function localVersion(cwd) {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspaceRoot, cwd, 'package.json'), 'utf8')).version ?? NONE;
  } catch {
    return NONE;
  }
}

/** `npm view <pkg>@<tag> version` -> version string, or NONE when the tag is absent / offline. */
function npmDistTagVersion(name, tag) {
  try {
    const out = execFileSync('npm', ['view', `${name}@${tag}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || NONE;
  } catch {
    return NONE;
  }
}

function statusOf(local, latest) {
  if (latest === NONE) return 'unpub';
  if (local === NONE) return 'unknown';
  if (semver.eq(local, latest)) return 'in-sync';
  return semver.gt(local, latest) ? 'ahead' : 'behind';
}

function label(version) {
  if (version === NONE) return NONE;
  return semver.prerelease(version) ? `${version} (beta)` : version;
}

function main() {
  const asJson = process.argv.includes('--json');

  const rows = PACKAGES.map((p) => {
    const name = JSON.parse(fs.readFileSync(path.join(workspaceRoot, p.cwd, 'package.json'), 'utf8')).name;
    const local = localVersion(p.cwd);
    const latest = npmDistTagVersion(name, 'latest');
    const beta = npmDistTagVersion(name, 'beta');
    return { name, local, latest, beta, status: statusOf(local, latest) };
  });

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const cols = [
    { head: 'PACKAGE', get: (r) => r.name },
    { head: 'LOCAL', get: (r) => label(r.local) },
    { head: 'NPM latest', get: (r) => label(r.latest) },
    { head: 'NPM beta', get: (r) => label(r.beta) },
    { head: 'STATUS', get: (r) => r.status },
  ];

  const widths = cols.map((c) => Math.max(c.head.length, ...rows.map((r) => c.get(r).length)));
  const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');

  console.log(line(cols.map((c) => c.head)));
  console.log(line(widths.map((w) => '-'.repeat(w))));
  for (const row of rows) console.log(line(cols.map((c) => c.get(row))));

  console.log('\nStatus: in-sync (local = npm latest) | ahead (not yet published) | behind | unpub');
  console.log('(beta) marks a prerelease version.');
}

main();
