#!/usr/bin/env node
/**
 * Version bump helper for the monorepo.
 *
 * Bumps a target workspace package and cascades to every workspace package that depends on it
 * (transitively): each dependent has its dependency range on the changed package updated to the
 * new version (preserving the existing ^/~/exact operator) and its own version bumped by a minor.
 *
 * Usage:
 *   node scripts/version-bump.mjs <package> [releaseType] [--dry-run]
 *
 *   <package>      Folder name (e.g. "universal") or npm name (e.g. "react-hooks-global-states").
 *   releaseType    patch | minor | major | premajor | preminor | prepatch | prerelease
 *                  Applied to the TARGET package only. Default: minor.
 *                  Dependents are always bumped by a minor.
 *   --dry-run      Print the planned changes without writing any files.
 *
 * Examples:
 *   node scripts/version-bump.mjs universal minor
 *     -> react-hooks-global-states gets a minor bump; web + mobile update their dependency range
 *        on it and each get a minor bump too.
 *
 *   node scripts/version-bump.mjs universal patch --dry-run
 *     -> preview only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const semver = require('semver');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const projectDirs = [path.join(workspaceRoot, 'libs'), path.join(workspaceRoot, 'apps')];

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];
const DEPENDENT_RELEASE_TYPE = 'minor';

function fail(message) {
  console.error(`[version-bump] ${message}`);
  process.exit(1);
}

/** Load every workspace package.json under libs/* and apps/*. */
function loadWorkspacePackages() {
  const packages = [];
  for (const dir of projectDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = path.join(dir, entry.name, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      packages.push({ folder: entry.name, pkgPath, json });
    }
  }
  return packages;
}

/** Resolve the target package by folder name or npm name. */
function resolveTarget(packages, query) {
  const byFolder = packages.find((p) => p.folder === query);
  if (byFolder) return byFolder;
  const byName = packages.find((p) => p.json.name === query);
  if (byName) return byName;
  const known = packages.map((p) => `${p.folder} (${p.json.name})`).join('\n  ');
  fail(`unknown package "${query}". Known workspace packages:\n  ${known}`);
  return null;
}

/** Split a semver range into its leading operator (^, ~, >=, ...) and the version part. */
function splitRange(range) {
  const match = /^(\D*)(.*)$/.exec(range.trim());
  return { operator: match?.[1] ?? '', version: match?.[2] ?? range };
}

/** Bump a version by a release type, throwing on invalid input. */
function bump(version, releaseType) {
  const next = semver.inc(version, releaseType);
  if (!next) fail(`cannot apply "${releaseType}" to version "${version}".`);
  return next;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((a) => !a.startsWith('-'));
  const [query, releaseType = 'minor'] = positional;

  if (!query) {
    fail('missing package. Usage: node scripts/version-bump.mjs <package> [releaseType] [--dry-run]');
  }

  const validTypes = ['patch', 'minor', 'major', 'premajor', 'preminor', 'prepatch', 'prerelease'];
  if (!validTypes.includes(releaseType)) {
    fail(`invalid releaseType "${releaseType}". Expected one of: ${validTypes.join(', ')}`);
  }

  const packages = loadWorkspacePackages();
  const target = resolveTarget(packages, query);

  // Map npm name -> package record for quick lookups.
  const byName = new Map(packages.map((p) => [p.json.name, p]));

  // Track new versions per npm name as we compute the cascade.
  const newVersions = new Map();

  // 1. Bump the target.
  const targetOldVersion = target.json.version;
  const targetNewVersion = bump(targetOldVersion, releaseType);
  newVersions.set(target.json.name, targetNewVersion);

  // 2. BFS over dependents (transitive). A package is a dependent if any dep field references a
  //    name whose version we are changing.
  const changedNames = new Set([target.json.name]);
  const queue = [target.json.name];
  const dependentBumps = []; // { pkg, oldVersion, newVersion, updatedRanges: [{field,name,from,to}] }

  while (queue.length) {
    const changedName = queue.shift();
    for (const pkg of packages) {
      if (pkg.json.name === changedName) continue;
      if (changedNames.has(pkg.json.name)) continue; // already scheduled for a bump

      const references = DEP_FIELDS.some((field) => pkg.json[field]?.[changedName]);
      if (!references) continue;

      // This package depends on something we changed -> bump it (minor) and enqueue it so its own
      // dependents cascade too.
      const oldVersion = pkg.json.version;
      const nextVersion = bump(oldVersion, DEPENDENT_RELEASE_TYPE);
      newVersions.set(pkg.json.name, nextVersion);
      changedNames.add(pkg.json.name);
      queue.push(pkg.json.name);
      dependentBumps.push({ pkg, oldVersion, newVersion: nextVersion });
    }
  }

  // 3. Compute dependency-range rewrites for every package (target + dependents) against the full
  //    set of changed names.
  const edits = []; // { pkg, versionChange, rangeChanges: [] }

  function collectRangeChanges(pkg) {
    const rangeChanges = [];
    for (const field of DEP_FIELDS) {
      const deps = pkg.json[field];
      if (!deps) continue;
      for (const [name, range] of Object.entries(deps)) {
        if (!newVersions.has(name)) continue;
        const { operator } = splitRange(range);
        const nextRange = `${operator || '^'}${newVersions.get(name)}`;
        if (nextRange !== range) {
          rangeChanges.push({ field, name, from: range, to: nextRange });
        }
      }
    }
    return rangeChanges;
  }

  for (const pkg of packages) {
    const versionChange = newVersions.has(pkg.json.name)
      ? { from: pkg.json.version, to: newVersions.get(pkg.json.name) }
      : null;
    const rangeChanges = collectRangeChanges(pkg);
    if (versionChange || rangeChanges.length) {
      edits.push({ pkg, versionChange, rangeChanges });
    }
  }

  // 4. Report.
  console.log(`\n[version-bump] target: ${target.json.name} (${target.folder})`);
  console.log(`[version-bump] release: ${releaseType} on target, ${DEPENDENT_RELEASE_TYPE} on dependents`);
  console.log(`[version-bump] ${target.json.name}: ${targetOldVersion} -> ${targetNewVersion}`);
  if (dependentBumps.length) {
    console.log('[version-bump] cascading to dependents:');
    for (const d of dependentBumps) {
      console.log(`  - ${d.pkg.json.name} (${d.pkg.folder}): ${d.oldVersion} -> ${d.newVersion}`);
    }
  } else {
    console.log('[version-bump] no workspace dependents.');
  }

  console.log('\n[version-bump] file changes:');
  for (const edit of edits) {
    const lines = [];
    if (edit.versionChange) {
      lines.push(`    version: ${edit.versionChange.from} -> ${edit.versionChange.to}`);
    }
    for (const rc of edit.rangeChanges) {
      lines.push(`    ${rc.field}.${rc.name}: ${rc.from} -> ${rc.to}`);
    }
    console.log(`  ${path.relative(workspaceRoot, edit.pkg.pkgPath)}`);
    lines.forEach((l) => console.log(l));
  }

  if (dryRun) {
    console.log('\n[version-bump] dry run: no files written.');
    return;
  }

  // 5. Apply.
  for (const edit of edits) {
    const json = edit.pkg.json;
    if (edit.versionChange) json.version = edit.versionChange.to;
    for (const rc of edit.rangeChanges) {
      json[rc.field][rc.name] = rc.to;
    }
    fs.writeFileSync(edit.pkg.pkgPath, `${JSON.stringify(json, null, 2)}\n`);
  }

  console.log(`\n[version-bump] updated ${edits.length} package.json file(s).`);
}

main();
