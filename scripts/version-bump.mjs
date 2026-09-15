#!/usr/bin/env node
/**
 * Version bump helper for the monorepo.
 *
 * Two modes:
 *
 * 1. SYNC-ALL (no package given): keep the whole monorepo in lockstep.
 *      node scripts/version-bump.mjs <releaseType|version> [--dry-run]
 *    Sets the root package.json AND every workspace package (libs/* + apps/*) to the SAME new
 *    version, then rewrites every cross-package dependency range to that version. The first arg is
 *    either a release type (bumps the root's current version) or an explicit version like 17.0.0
 *    (set everywhere verbatim). Use this when all packages are released together in sync.
 *
 * 2. TARGETED (package given): bump one package and cascade to its dependents.
 *      node scripts/version-bump.mjs <package> [releaseType] [--dry-run]
 *    Bumps the target package by <releaseType>; every workspace package that depends on it
 *    (transitively) has its dependency range updated to the new version (preserving the ^/~/exact
 *    operator) and its own version bumped by a minor.
 *
 * Arguments:
 *   <package>      Folder name (e.g. "universal") or npm name (e.g. "react-hooks-global-states").
 *   <releaseType>  patch | minor | major | premajor | preminor | prepatch | prerelease.
 *                  Default: minor.
 *   --dry-run      Print the planned changes without writing any files.
 *
 * Examples:
 *   node scripts/version-bump.mjs patch
 *     -> SYNC-ALL: root + all workspace packages bumped a patch to the same version; every
 *        cross-package range updated to match.
 *
 *   node scripts/version-bump.mjs 17.0.0
 *     -> SYNC-ALL: root + all workspace packages set to exactly 17.0.0; every cross-package range
 *        updated to ^17.0.0.
 *
 *   node scripts/version-bump.mjs universal minor
 *     -> TARGETED: react-hooks-global-states gets a minor bump; web + mobile update their range on
 *        it and each get a minor bump too.
 *
 *   node scripts/version-bump.mjs patch --dry-run
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
const VALID_TYPES = ['patch', 'minor', 'major', 'premajor', 'preminor', 'prepatch', 'prerelease'];

function fail(message) {
  console.error(`[version-bump] ${message}`);
  process.exit(1);
}

/** Load a package.json into a record with the fields the script needs. */
function loadPackage(folder, pkgPath) {
  const json = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return { folder, pkgPath, json };
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
      packages.push(loadPackage(entry.name, pkgPath));
    }
  }
  return packages;
}

/** The private root monorepo package. */
function loadRootPackage() {
  return loadPackage('.', path.join(workspaceRoot, 'package.json'));
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

/** Bump a version by a release type, failing on invalid input. */
function bump(version, releaseType) {
  const next = semver.inc(version, releaseType);
  if (!next) fail(`cannot apply "${releaseType}" to version "${version}".`);
  return next;
}

/**
 * Compute per-package edits.
 *
 * @param allPackages   packages to consider for edits (may include the root).
 * @param versionByPath Map of package.json path -> new version. Drives which packages get a
 *                      version change. Keyed by PATH (not name) because the private root shares its
 *                      npm name with the web package, so a name key would collide.
 * @param versionByName Map of npm name -> new version. Drives dependency-range rewrites (ranges
 *                      reference published names), operator preserved, defaulting to ^.
 */
function computeEdits(allPackages, versionByPath, versionByName) {
  const edits = [];
  for (const pkg of allPackages) {
    const versionChange = versionByPath.has(pkg.pkgPath)
      ? { from: pkg.json.version, to: versionByPath.get(pkg.pkgPath) }
      : null;

    const rangeChanges = [];
    for (const field of DEP_FIELDS) {
      const deps = pkg.json[field];
      if (!deps) continue;
      for (const [name, range] of Object.entries(deps)) {
        if (!versionByName.has(name)) continue;
        const { operator } = splitRange(range);
        const nextRange = `${operator || '^'}${versionByName.get(name)}`;
        if (nextRange !== range) rangeChanges.push({ field, name, from: range, to: nextRange });
      }
    }

    if (versionChange || rangeChanges.length) edits.push({ pkg, versionChange, rangeChanges });
  }
  return edits;
}

/** Print the edit plan. */
function report(edits) {
  console.log('\n[version-bump] file changes:');
  if (!edits.length) {
    console.log('  (none)');
    return;
  }
  for (const edit of edits) {
    console.log(`  ${path.relative(workspaceRoot, edit.pkg.pkgPath) || 'package.json'}`);
    if (edit.versionChange) {
      console.log(`    version: ${edit.versionChange.from} -> ${edit.versionChange.to}`);
    }
    for (const rc of edit.rangeChanges) {
      console.log(`    ${rc.field}.${rc.name}: ${rc.from} -> ${rc.to}`);
    }
  }
}

/** Write the edits to disk. */
function applyEdits(edits) {
  for (const edit of edits) {
    const { json } = edit.pkg;
    if (edit.versionChange) json.version = edit.versionChange.to;
    for (const rc of edit.rangeChanges) json[rc.field][rc.name] = rc.to;
    fs.writeFileSync(edit.pkg.pkgPath, `${JSON.stringify(json, null, 2)}\n`);
  }
}

/**
 * SYNC-ALL: root + every workspace package -> same new version; all cross-ranges updated.
 * `versionOrType` is either a release type keyword (bump the root's current version) or an
 * explicit semver version to set everywhere.
 */
function runSyncAll(versionOrType, dryRun) {
  const root = loadRootPackage();
  const workspacePackages = loadWorkspacePackages();
  const allPackages = [root, ...workspacePackages];

  const explicitVersion = semver.valid(versionOrType);
  // Anchor the shared version: an explicit version wins, otherwise bump the root's current version.
  const targetVersion = explicitVersion ?? bump(root.json.version, versionOrType);

  const versionByPath = new Map();
  const versionByName = new Map();
  for (const pkg of allPackages) {
    versionByPath.set(pkg.pkgPath, targetVersion);
    if (pkg.json.name) versionByName.set(pkg.json.name, targetVersion);
  }

  const edits = computeEdits(allPackages, versionByPath, versionByName);

  console.log('\n[version-bump] mode: SYNC-ALL (root + all workspace packages in lockstep)');
  console.log(`[version-bump] ${explicitVersion ? 'explicit version' : 'release'}: ${versionOrType}`);
  console.log(`[version-bump] all packages -> ${targetVersion}`);
  report(edits);

  if (dryRun) {
    console.log('\n[version-bump] dry run: no files written.');
    return;
  }
  applyEdits(edits);
  console.log(`\n[version-bump] updated ${edits.length} package.json file(s).`);
}

/** TARGETED: bump one package and cascade a minor to its dependents (transitive). */
function runTargeted(query, releaseType, dryRun) {
  const packages = loadWorkspacePackages();
  const root = loadRootPackage();
  const target = resolveTarget(packages, query);

  // Version changes are keyed by package.json PATH (root shares web's npm name); range rewrites are
  // keyed by npm name.
  const versionByPath = new Map();
  const versionByName = new Map();
  const targetOldVersion = target.json.version;
  const targetNewVersion = bump(targetOldVersion, releaseType);
  versionByPath.set(target.pkgPath, targetNewVersion);
  versionByName.set(target.json.name, targetNewVersion);

  // BFS over dependents (transitive).
  const changedNames = new Set([target.json.name]);
  const queue = [target.json.name];
  const dependentBumps = [];

  while (queue.length) {
    const changedName = queue.shift();
    for (const pkg of packages) {
      if (pkg.json.name === changedName || changedNames.has(pkg.json.name)) continue;
      const references = DEP_FIELDS.some((field) => pkg.json[field]?.[changedName]);
      if (!references) continue;

      const oldVersion = pkg.json.version;
      const nextVersion = bump(oldVersion, DEPENDENT_RELEASE_TYPE);
      versionByPath.set(pkg.pkgPath, nextVersion);
      versionByName.set(pkg.json.name, nextVersion);
      changedNames.add(pkg.json.name);
      queue.push(pkg.json.name);
      dependentBumps.push({ pkg, oldVersion, newVersion: nextVersion });
    }
  }

  // Include the root so any dependency range it declares on a changed package is updated too.
  // The root's own version is NOT bumped in targeted mode (it's keyed by path, not in the map).
  const edits = computeEdits([root, ...packages], versionByPath, versionByName);

  console.log(`\n[version-bump] mode: TARGETED`);
  console.log(`[version-bump] target: ${target.json.name} (${target.folder})`);
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
  report(edits);

  if (dryRun) {
    console.log('\n[version-bump] dry run: no files written.');
    return;
  }
  applyEdits(edits);
  console.log(`\n[version-bump] updated ${edits.length} package.json file(s).`);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((a) => !a.startsWith('-'));

  // Distinguish modes by the FIRST positional arg:
  //   - a release type keyword alone  -> SYNC-ALL
  //   - anything else (a package)     -> TARGETED
  const [first, second] = positional;

  if (!first) {
    fail(
      'missing arguments.\n' +
        '  Sync all:  node scripts/version-bump.mjs <releaseType> [--dry-run]\n' +
        '  Targeted:  node scripts/version-bump.mjs <package> [releaseType] [--dry-run]',
    );
  }

  // SYNC-ALL when the first arg alone is a release type keyword OR an explicit semver version.
  const firstIsExplicitVersion = Boolean(semver.valid(first));
  if (VALID_TYPES.includes(first) || firstIsExplicitVersion) {
    // A stray second positional here is almost certainly a mistake.
    if (second) {
      const kind = firstIsExplicitVersion ? 'version' : 'release type';
      fail(`unexpected argument "${second}" after ${kind} "${first}" in sync-all mode.`);
    }
    runSyncAll(first, dryRun);
    return;
  }

  // TARGETED mode. first = package, second = release type (default minor).
  const releaseType = second ?? 'minor';
  if (!VALID_TYPES.includes(releaseType)) {
    fail(`invalid releaseType "${releaseType}". Expected one of: ${VALID_TYPES.join(', ')}`);
  }
  runTargeted(first, releaseType, dryRun);
}

main();
