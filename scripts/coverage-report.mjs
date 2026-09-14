#!/usr/bin/env node
/**
 * Combined test-coverage report across the library variants.
 *
 * Usage:
 *   yarn coverage                 # every lib under libs/* that has a jest.config.js, src mode
 *   yarn coverage web             # a single project
 *   yarn coverage web universal   # a subset
 *   yarn coverage --dist          # run against the built dist/ artifact instead of src
 *
 * By default this runs each project's jest suite against its TypeScript SOURCE
 * (TEST_TARGET=src) with coverage collection, which is the meaningful measure — coverage
 * instrumentation on the minified dist bundle is not informative. Pass --dist to measure the
 * built artifact instead.
 *
 * For each project it collects a coverage json-summary, then prints one combined table plus a
 * weighted total across all measured projects.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const libsDir = path.join(workspaceRoot, 'libs');

const METRICS = ['statements', 'branches', 'functions', 'lines'];

/** Discover lib projects that actually run jest (have a jest.config.js). */
function discoverProjects() {
  if (!fs.existsSync(libsDir)) return [];
  return fs
    .readdirSync(libsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(libsDir, e.name, 'jest.config.js')))
    .map((e) => e.name)
    .sort();
}

const args = process.argv.slice(2);
const useDist = args.includes('--dist');
const requested = args.filter((a) => !a.startsWith('-'));

const allProjects = discoverProjects();
const projects = requested.length ? requested.filter((p) => allProjects.includes(p)) : allProjects;

if (!projects.length) {
  console.error(`[coverage] no matching projects. Available: ${allProjects.join(', ') || '(none)'}`);
  process.exit(1);
}

const target = useDist ? 'dist' : 'src';
const jestBin = path.join(workspaceRoot, 'node_modules', '.bin', 'jest');

/** Run one project's coverage and return its summary totals, or null on failure. */
function runProjectCoverage(project) {
  const cwd = path.join(libsDir, project);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `cov-${project}-`));

  const result = spawnSync(
    jestBin,
    [
      '--coverage',
      '--coverageReporters=json-summary',
      `--coverageDirectory=${outDir}`,
      '--silent',
      '--ci',
    ],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, TEST_TARGET: target },
    },
  );

  const summaryFile = path.join(outDir, 'coverage-summary.json');
  if (!fs.existsSync(summaryFile)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    return { project, failed: true, exitCode: result.status ?? 1, totals: null };
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
  fs.rmSync(outDir, { recursive: true, force: true });

  return { project, failed: result.status !== 0, exitCode: result.status ?? 0, totals: summary.total };
}

const pct = (m) => (m && m.total ? (m.covered / m.total) * 100 : 100);
const fmt = (n) => `${n.toFixed(2)}%`;
const pad = (s, n) => String(s).padEnd(n);
const padStart = (s, n) => String(s).padStart(n);

console.log(`\nCoverage report (target: ${target})\n`);

const rows = [];
const aggregate = Object.fromEntries(METRICS.map((m) => [m, { covered: 0, total: 0 }]));

for (const project of projects) {
  const { totals, failed, exitCode } = runProjectCoverage(project);
  if (!totals) {
    rows.push({ project: `${project} (FAILED, exit ${exitCode})`, values: METRICS.map(() => '—') });
    continue;
  }
  for (const m of METRICS) {
    aggregate[m].covered += totals[m].covered;
    aggregate[m].total += totals[m].total;
  }
  rows.push({
    project: failed ? `${project} (tests failed)` : project,
    values: METRICS.map((m) => `${fmt(totals[m].pct)}  ${totals[m].covered}/${totals[m].total}`),
  });
}

// --- render table ---
const headers = ['project', ...METRICS];
const colWidths = headers.map((h, i) => {
  const cells = rows.map((r) => (i === 0 ? r.project : r.values[i - 1]));
  return Math.max(h.length, ...cells.map((c) => String(c).length));
});

const line = (cells) =>
  cells.map((c, i) => (i === 0 ? pad(c, colWidths[i]) : padStart(c, colWidths[i]))).join('   ');

console.log(line(headers));
console.log(colWidths.map((w) => '-'.repeat(w)).join('   '));
for (const r of rows) console.log(line([r.project, ...r.values]));

if (projects.length > 1) {
  console.log(colWidths.map((w) => '-'.repeat(w)).join('   '));
  console.log(
    line([
      'TOTAL',
      ...METRICS.map((m) => `${fmt(pct(aggregate[m]))}  ${aggregate[m].covered}/${aggregate[m].total}`),
    ]),
  );
}
console.log('');
