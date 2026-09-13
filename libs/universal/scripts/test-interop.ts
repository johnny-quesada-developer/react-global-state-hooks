/**
 * Packaging interop regression test.
 *
 * Guards against the UMD-interop bug: previously the published subpaths were UMD bundles
 * whose global-assignment branch confused esbuild-based runtimes (tsx, Vite dev, Bun),
 * producing a non-callable default export and phantom namespace keys
 * (e.g. "module.exports", "react-hooks-global-states").
 *
 * This test packs the real publishable artifact (from ./dist), installs it into a throwaway
 * project exactly like a consumer would, and then imports `react-hooks-global-states/uniqueId`
 * as a DEFAULT import and calls it under BOTH:
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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rhgs-interop-'));

try {
  // 1) Pack the real publishable tarball from dist.
  const tarballName = run('npm', ['pack', '--silent'], dist).trim().split('\n').pop()!.trim();
  const tarballPath = path.join(dist, tarballName);

  // 2) Install it into a throwaway consumer project (no --legacy-peer-deps; consumers don't use it).
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

  // 3) Probes.
  const esmProbe = [
    "import uniqueId from 'react-hooks-global-states/uniqueId';",
    "import * as ns from 'react-hooks-global-states/uniqueId';",
    'const keys = Object.keys(ns);',
    "const phantom = keys.filter((k) => k === 'module.exports' || k.includes('react-'));",
    "if (phantom.length) { console.error('phantom keys: ' + JSON.stringify(phantom)); process.exit(3); }",
    "if (typeof uniqueId !== 'function') { console.error('default not callable: ' + typeof uniqueId); process.exit(4); }",
    "if (typeof ns.uniqueId !== 'function') { console.error('named uniqueId not callable'); process.exit(5); }",
    'const id = uniqueId();',
    "if (typeof id !== 'string' || id.length === 0) { console.error('call did not return a string'); process.exit(6); }",
    "console.log('ok:' + JSON.stringify(keys));",
  ].join('\n');

  // 3a) esbuild / tsx  (the previously-broken runtime) - runs a TypeScript .mts default import
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
    "const u = require('react-hooks-global-states/uniqueId');",
    "if (typeof u.default !== 'function') { console.error('cjs default not callable'); process.exit(7); }",
    "if (typeof u.uniqueId !== 'function') { console.error('cjs uniqueId not callable'); process.exit(8); }",
    'if (u.__esModule !== true) { console.error("cjs missing __esModule"); process.exit(9); }',
    'const keys = Object.keys(u).sort();',
    "if (keys.join(',') !== 'default,uniqueId') { console.error('cjs unexpected keys: ' + keys.join(',')); process.exit(10); }",
    "const id = u.default(); if (typeof id !== 'string') { console.error('cjs call failed'); process.exit(11); }",
    "console.log('ok:' + JSON.stringify(keys));",
  ].join('\n');
  const cjsFile = path.join(work, 'probe.cjs');
  fs.writeFileSync(cjsFile, cjsProbe);
  const cjsOut = run('node', [cjsFile], work).trim();
  if (!cjsOut.includes('ok:')) fail(`node CJS probe unexpected output: ${cjsOut}`);
  console.log(`[interop] node CJS:        ${cjsOut}`);

  // 4) A subpath that depends on the (external) json-storage-formatter, to guard the
  //    dependency's own ESM/CJS interop. shallowCompare imports isNil/isDate/isPrimitive;
  //    if those resolve to a non-callable (the old UMD bug), comparing objects throws.
  const depProbe = [
    "import shallowCompare from 'react-hooks-global-states/shallowCompare';",
    "if (typeof shallowCompare !== 'function') { console.error('shallowCompare not callable'); process.exit(12); }",
    'const a = shallowCompare(1, 1) === true;',
    'const b = shallowCompare(1, 2) === false;',
    // object path exercises isNil/isDate/isPrimitive from json-storage-formatter
    'const c = shallowCompare({ x: 1 }, { x: 1 }) === true;',
    'const d = shallowCompare({ x: 1 }, { x: 2 }) === false;',
    "if (!(a && b && c && d)) { console.error('shallowCompare wrong result'); process.exit(13); }",
    "console.log('ok:shallowCompare');",
  ].join('\n');

  const depMts = path.join(work, 'dep.mts');
  fs.writeFileSync(depMts, depProbe);
  const depTsx = run(tsxBin, [depMts], work).trim();
  if (!depTsx.includes('ok:')) fail(`tsx shallowCompare probe unexpected output: ${depTsx}`);
  console.log(`[interop] tsx  dep-subpath: ${depTsx}`);

  const depMjs = path.join(work, 'dep.mjs');
  fs.writeFileSync(depMjs, depProbe);
  const depEsm = run('node', [depMjs], work).trim();
  if (!depEsm.includes('ok:')) fail(`node ESM shallowCompare probe unexpected output: ${depEsm}`);
  console.log(`[interop] node dep-subpath: ${depEsm}`);

  console.log(
    '\n[interop] PASS: uniqueId default import + a json-storage-formatter-dependent subpath ' +
      'work under tsx (esbuild), Node ESM, and Node CJS.',
  );
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
