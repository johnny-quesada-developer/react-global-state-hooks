/**
 * Packaging interop regression test.
 *
 * Guards against the UMD-interop bug: previously the published subpaths were UMD bundles
 * whose global-assignment branch confused esbuild-based runtimes (tsx, Vite dev, Bun),
 * producing a non-callable default export and phantom namespace keys
 * (e.g. "module.exports", "react-global-state-hooks").
 *
 * This test packs the real publishable artifact (from ./dist), installs it into a throwaway
 * project exactly like a consumer would (which transitively pulls react-hooks-global-states
 * and json-storage-formatter), and then imports subpaths as DEFAULT imports and calls them
 * under BOTH:
 *   - esbuild (via tsx)   -> the runtime that used to break
 *   - Node CJS require    -> must keep the { default, uniqueId, __esModule } shape
 *   - Node native ESM     -> must resolve the callable default
 *
 * It fails (non-zero exit) if the default is not callable, if calling it throws, or if any
 * phantom namespace key appears.
 *
 * Run with: tsx scripts/test-interop.ts   (assumes `dist/` was already built)
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');
const tsxBin = path.resolve(root, 'node_modules/.bin/tsx');

function fail(msg: string): never {
  console.error(`\n[interop] FAIL: ${msg}`);
  process.exit(1);
}

function run(cmd: string, args: string[], cwd: string): string {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

if (!fs.existsSync(path.join(dist, 'uniqueId.mjs'))) {
  fail('dist/ is not built. Run `yarn build` first.');
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rgsh-interop-'));

try {
  // 1) Pack the real publishable tarball from dist.
  const tarballName = run('npm', ['pack', '--silent'], dist).trim().split('\n').pop()!.trim();
  const tarballPath = path.join(dist, tarballName);

  // 2) Install it into a throwaway consumer project (no --legacy-peer-deps; consumers don't use it).
  //    Installing the tarball transitively pulls react-hooks-global-states and
  //    json-storage-formatter (at the versions this package declares) from the registry.
  fs.writeFileSync(
    path.join(work, 'package.json'),
    JSON.stringify(
      {
        name: 'interop-scratch',
        private: true,
        version: '1.0.0',
        dependencies: { react: '18.3.1', 'react-dom': '18.3.1' },
      },
      null,
      2,
    ),
  );
  run('npm', ['install', tarballPath, '--no-audit', '--no-fund'], work);
  fs.rmSync(tarballPath, { force: true });

  // Confirm the base package resolved transitively at the fixed version. npm may hoist it to
  // the top-level node_modules OR nest it under react-global-state-hooks/node_modules depending
  // on how peers dedupe; resolve it the same way Node would (from the installed package) instead
  // of assuming a fixed location.
  const consumerPkgJson = path.join(work, 'node_modules', 'react-global-state-hooks', 'package.json');
  let basePkgPath: string | null = null;
  try {
    basePkgPath = require.resolve('react-hooks-global-states/package.json', {
      paths: [path.dirname(consumerPkgJson)],
    });
  } catch {
    // fall through to explicit candidate paths
  }
  if (!basePkgPath || !fs.existsSync(basePkgPath)) {
    const candidates = [
      path.join(work, 'node_modules', 'react-hooks-global-states', 'package.json'),
      path.join(
        work,
        'node_modules',
        'react-global-state-hooks',
        'node_modules',
        'react-hooks-global-states',
        'package.json',
      ),
    ];
    basePkgPath = candidates.find((p) => fs.existsSync(p)) ?? null;
  }
  if (!basePkgPath) {
    fail('react-hooks-global-states did not resolve transitively.');
  }
  const baseVersion = (JSON.parse(fs.readFileSync(basePkgPath, 'utf8')) as { version: string }).version;
  // Expect the transitive base package to match the version this repo declares as a dependency
  // (derived from the root package.json rather than hardcoded, so it tracks version bumps).
  const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const expectedBaseVersion = rootPkg.dependencies?.['react-hooks-global-states'];
  if (!expectedBaseVersion) {
    fail('react-hooks-global-states is not declared in the root package.json dependencies.');
  }
  if (baseVersion !== expectedBaseVersion) {
    fail(`react-hooks-global-states resolved to ${baseVersion}, expected ${expectedBaseVersion}.`);
  }
  console.log(`[interop] transitive react-hooks-global-states version: ${baseVersion}`);

  // 3) Probes for uniqueId (a base re-exporting subpath).
  const esmProbe = [
    "import uniqueId from 'react-global-state-hooks/uniqueId';",
    "import * as ns from 'react-global-state-hooks/uniqueId';",
    'const keys = Object.keys(ns);',
    "const phantom = keys.filter((k) => k === 'module.exports' || k.includes('react-'));",
    "if (phantom.length) { console.error('phantom keys: ' + JSON.stringify(phantom)); process.exit(3); }",
    "if (typeof uniqueId !== 'function') { console.error('default not callable: ' + typeof uniqueId); process.exit(4); }",
    "if (typeof ns.uniqueId !== 'function') { console.error('named uniqueId not callable'); process.exit(5); }",
    'const id = uniqueId();',
    "if (typeof id !== 'string' || id.length === 0) { console.error('call did not return a string'); process.exit(6); }",
    "console.log('ok:' + JSON.stringify(keys));",
  ].join('\n');

  // 3a) esbuild / tsx  (the previously-broken runtime)
  const tsxProbeFile = path.join(work, 'probe.mts');
  fs.writeFileSync(tsxProbeFile, esmProbe);
  const tsxOut = run(tsxBin, [tsxProbeFile], work).trim();
  if (!tsxOut.includes('ok:')) fail(`tsx probe unexpected output: ${tsxOut}`);
  console.log(`[interop] tsx (esbuild):   ${tsxOut}`);

  // 3b) Node native ESM
  const mjsFile = path.join(work, 'probe.mjs');
  fs.writeFileSync(mjsFile, esmProbe);
  const nodeEsm = run('node', [mjsFile], work).trim();
  if (!nodeEsm.includes('ok:')) fail(`node ESM probe unexpected output: ${nodeEsm}`);
  console.log(`[interop] node ESM:        ${nodeEsm}`);

  // 3c) Node CJS require
  const cjsProbe = [
    "const u = require('react-global-state-hooks/uniqueId');",
    "if (typeof u.default !== 'function') { console.error('cjs default not callable'); process.exit(7); }",
    "if (typeof u.uniqueId !== 'function') { console.error('cjs uniqueId not callable'); process.exit(8); }",
    'if (u.__esModule !== true) { console.error("cjs missing __esModule"); process.exit(9); }',
    'const keys = Object.keys(u).sort();',
    "if (!keys.includes('default') || !keys.includes('uniqueId')) { console.error('cjs missing keys: ' + keys.join(',')); process.exit(10); }",
    "const phantom = keys.filter((k) => k === 'module.exports' || k.includes('react-'));",
    "if (phantom.length) { console.error('cjs phantom keys: ' + JSON.stringify(phantom)); process.exit(11); }",
    "const id = u.default(); if (typeof id !== 'string') { console.error('cjs call failed'); process.exit(12); }",
    "console.log('ok:' + JSON.stringify(keys));",
  ].join('\n');
  const cjsFile = path.join(work, 'probe.cjs');
  fs.writeFileSync(cjsFile, cjsProbe);
  const cjsOut = run('node', [cjsFile], work).trim();
  if (!cjsOut.includes('ok:')) fail(`node CJS probe unexpected output: ${cjsOut}`);
  console.log(`[interop] node CJS:        ${cjsOut}`);

  // 4) A subpath that actually consumes the base package end-to-end: createGlobalState wraps
  //    the base GlobalStore and (through GlobalStore.ts) json-storage-formatter. This confirms
  //    cross-package interop now that both packages ship clean dual format.
  const depProbe = [
    "import createGlobalState from 'react-global-state-hooks/createGlobalState';",
    "import * as ns from 'react-global-state-hooks/createGlobalState';",
    'const keys = Object.keys(ns);',
    "const phantom = keys.filter((k) => k === 'module.exports' || k.includes('react-'));",
    "if (phantom.length) { console.error('phantom keys: ' + JSON.stringify(phantom)); process.exit(20); }",
    "if (typeof createGlobalState !== 'function') { console.error('createGlobalState not callable'); process.exit(21); }",
    'const useCount = createGlobalState(1);',
    "if (typeof useCount !== 'function') { console.error('hook not returned'); process.exit(22); }",
    // the hook embeds the imperative state api; getState should return the initial value
    "if (typeof useCount.getState !== 'function') { console.error('getState missing'); process.exit(23); }",
    "if (useCount.getState() !== 1) { console.error('unexpected state: ' + useCount.getState()); process.exit(24); }",
    "console.log('ok:createGlobalState');",
  ].join('\n');

  const depMts = path.join(work, 'dep.mts');
  fs.writeFileSync(depMts, depProbe);
  const depTsx = run(tsxBin, [depMts], work).trim();
  if (!depTsx.includes('ok:')) fail(`tsx createGlobalState probe unexpected output: ${depTsx}`);
  console.log(`[interop] tsx  dep-subpath: ${depTsx}`);

  const depMjs = path.join(work, 'dep.mjs');
  fs.writeFileSync(depMjs, depProbe);
  const depEsm = run('node', [depMjs], work).trim();
  if (!depEsm.includes('ok:')) fail(`node ESM createGlobalState probe unexpected output: ${depEsm}`);
  console.log(`[interop] node dep-subpath: ${depEsm}`);

  const depCjsProbe = [
    "const m = require('react-global-state-hooks/createGlobalState');",
    'const createGlobalState = m.default;',
    "if (typeof createGlobalState !== 'function') { console.error('cjs createGlobalState not callable'); process.exit(25); }",
    'const useCount = createGlobalState(1);',
    "if (useCount.getState() !== 1) { console.error('cjs unexpected state: ' + useCount.getState()); process.exit(26); }",
    "console.log('ok:createGlobalState');",
  ].join('\n');
  const depCjs = path.join(work, 'dep.cjs');
  fs.writeFileSync(depCjs, depCjsProbe);
  const depCjsOut = run('node', [depCjs], work).trim();
  if (!depCjsOut.includes('ok:')) fail(`node CJS createGlobalState probe unexpected output: ${depCjsOut}`);
  console.log(`[interop] node CJS dep:    ${depCjsOut}`);

  // 5) Spot-check the root entry (.) under tsx.
  const rootProbe = [
    "import { uniqueId, createGlobalState } from 'react-global-state-hooks';",
    "if (typeof uniqueId !== 'function') { console.error('root uniqueId not callable'); process.exit(30); }",
    "if (typeof createGlobalState !== 'function') { console.error('root createGlobalState not callable'); process.exit(31); }",
    "console.log('ok:root');",
  ].join('\n');
  const rootMts = path.join(work, 'root.mts');
  fs.writeFileSync(rootMts, rootProbe);
  const rootOut = run(tsxBin, [rootMts], work).trim();
  if (!rootOut.includes('ok:')) fail(`tsx root probe unexpected output: ${rootOut}`);
  console.log(`[interop] tsx  root:       ${rootOut}`);

  console.log(
    '\n[interop] PASS: uniqueId + a base-consuming subpath (createGlobalState) are callable ' +
      'under tsx (esbuild), Node ESM, and Node CJS, with no phantom namespace keys.',
  );
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
