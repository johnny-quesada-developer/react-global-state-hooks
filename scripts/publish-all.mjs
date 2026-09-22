#!/usr/bin/env node
/**
 * PUBLISH-ONLY: upload every publishable workspace package to npm, in dependency order.
 *
 * This script does NOT lint/test/build. Run `yarn prepare-packages` first to validate and build
 * every package (that is the slow all-or-nothing gate). This step only uploads the already-built
 * dist/ folders, so all four publishes fire within a few seconds of each other and a single npm
 * OTP comfortably covers them all.
 *
 * Publishing order (a package must be on npm before its dependents):
 *   1. react-hooks-global-states-debug   (libs/monkey_patch)
 *   2. react-hooks-global-states          (libs/universal)   depends on (1)
 *   3. react-global-state-hooks           (libs/web)         depends on (2)
 *   4. react-native-global-state-hooks    (libs/mobile)      depends on (2)
 *
 * Each package's `npm-publish[:beta]` script is a pure `cd dist && npm publish ...` (no build).
 * The OTP is forwarded via NPM_OTP; the scripts append `${NPM_OTP:+--otp=$NPM_OTP}`.
 *
 * "Already published" is treated as a SKIP, not a failure, so re-running after a partial upload
 * completes the remaining packages.
 *
 * Usage:
 *   node scripts/publish-all.mjs [package...] [<otp>] [--beta] [--dry-run] [--plan]
 *
 *   [package...] Publish only the named packages (npm name, folder or Nx project name). Required
 *                for `code-review`, which is never part of the bulk run.
 *   <otp>        The npm one-time password (2FA). Optional: omit to let npm prompt.
 *   --beta       Publish to the `beta` tag. Every version must look like `x.y.z-beta.N`, and without
 *                --beta every version must be a plain release; a mismatch aborts before any upload.
 *   --dry-run    `npm publish --dry-run` for each (packs, no upload). Requires dist/ to exist.
 *   --plan       Print the publish order and exit. Uploads nothing.
 *
 * Examples:
 *   yarn prepare-packages && yarn publish:pkg 123456
 *   yarn publish:pkg code-review 123456
 *   node scripts/publish-all.mjs 123456 --beta
 *   node scripts/publish-all.mjs --dry-run
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertVersionMatchesTag } from './assert-publish-version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

// Ordered so each package is published after its workspace dependencies.
const PUBLISH_ORDER = [
  { name: 'react-hooks-global-states-debug', cwd: 'libs/monkey_patch' },
  { name: 'react-hooks-global-states', cwd: 'libs/universal' },
  { name: 'react-global-state-hooks', cwd: 'libs/web' },
  { name: 'react-native-global-state-hooks', cwd: 'libs/mobile' },
];

const ON_DEMAND = [{ name: 'code-review', cwd: 'libs/code-review' }];

function aliasesOf({ name, cwd }) {
  const projectJson = path.join(workspaceRoot, cwd, 'project.json');
  const projectName = fs.existsSync(projectJson) ? JSON.parse(fs.readFileSync(projectJson, 'utf8')).name : undefined;
  return [name, path.basename(cwd), projectName].filter(Boolean);
}

/** npm's error text when a version already exists on the registry. */
const ALREADY_PUBLISHED = /cannot publish over the previously published versions/i;

function main() {
  const args = process.argv.slice(2);
  const beta = args.includes('--beta');
  const dryRun = args.includes('--dry-run');
  const planOnly = args.includes('--plan');
  const catalog = [...PUBLISH_ORDER, ...ON_DEMAND];
  const selected = new Set();
  const otpCandidates = [];
  for (const arg of args.filter((a) => !a.startsWith('-'))) {
    const match = catalog.find((pkg) => aliasesOf(pkg).includes(arg));
    if (match) selected.add(match);
    else otpCandidates.push(arg);
  }
  const otp = otpCandidates[0];
  const targets = selected.size ? catalog.filter((pkg) => selected.has(pkg)) : PUBLISH_ORDER;

  const script = beta ? 'npm-publish:beta' : 'npm-publish';

  console.log(`[publish-all] script: ${script}`);
  console.log(`[publish-all] mode: ${planOnly ? 'plan (upload nothing)' : dryRun ? 'dry-run (pack, no upload)' : 'publish'}`);
  console.log(`[publish-all] otp: ${otp ? 'provided' : '(none — npm will prompt if required)'}`);
  console.log('[publish-all] order:');
  targets.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.cwd})`));

  if (planOnly) {
    console.log('\n[publish-all] plan only: nothing uploaded.');
    return;
  }

  // Guard: dist/ must exist (i.e. `yarn prepare-packages` was run). Publish-only never builds.
  const missing = targets.filter((p) => !fs.existsSync(path.join(workspaceRoot, p.cwd, 'dist')));
  if (missing.length) {
    console.error(`\n[publish-all] missing dist/ for: ${missing.map((p) => p.name).join(', ')}`);
    console.error('[publish-all] Run `yarn prepare-packages` first to validate + build all packages.');
    process.exit(1);
  }

  try {
    targets.forEach((pkg) => assertVersionMatchesTag(path.join(workspaceRoot, pkg.cwd), beta ? 'beta' : 'latest'));
  } catch (error) {
    console.error(`\n[publish-all] ${error.message}`);
    process.exit(1);
  }

  // NPM_OTP -> ${NPM_OTP:+--otp=$NPM_OTP}; NPM_DRY_RUN -> ${NPM_DRY_RUN:+--dry-run}.
  const env = { ...process.env };
  if (otp) env.NPM_OTP = otp;
  if (dryRun) env.NPM_DRY_RUN = '1';

  const published = [];
  const skipped = [];

  for (const pkg of targets) {
    console.log(`\n[publish-all] ==> ${pkg.name}: yarn ${script}${dryRun ? ' (npm --dry-run)' : ''}`);
    // Capture output so we can detect "already published" and treat it as a skip.
    const result = spawnSync('yarn', [script], {
      cwd: path.join(workspaceRoot, pkg.cwd),
      env,
      encoding: 'utf8',
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    process.stdout.write(output);

    if (result.status === 0) {
      published.push(pkg.name);
      continue;
    }
    if (ALREADY_PUBLISHED.test(output)) {
      console.log(`[publish-all] ${pkg.name}: version already on npm — skipping.`);
      skipped.push(pkg.name);
      continue;
    }
    console.error(`\n[publish-all] FAILED at ${pkg.name} (exit ${result.status ?? 'null'}).`);
    console.error('[publish-all] Fix the issue and re-run; already-published packages are skipped automatically.');
    process.exit(result.status ?? 1);
  }

  console.log(
    `\n[publish-all] ${dryRun ? 'dry run ' : ''}done. published: ${published.length ? published.join(', ') : '(none)'}` +
      `${skipped.length ? ` | skipped (already on npm): ${skipped.join(', ')}` : ''}`,
  );
}

main();
