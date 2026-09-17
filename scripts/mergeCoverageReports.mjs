/**
 * Merges each project's `coverage-final.json` (already written by `vitest run --coverage`,
 * since every project's coverage.reporter list includes 'json') into one combined Istanbul
 * coverage map, then renders a single HTML report at the workspace root.
 *
 * Reusing the persisted coverage-final.json avoids re-running any test — it just combines
 * results that are already on disk from the `test:coverage` run that preceded this call.
 */
import fs from 'node:fs';
import path from 'node:path';
// These are CommonJS-only packages with no named ESM exports; destructure the default import.
import istanbulLibCoverage from 'istanbul-lib-coverage';
import istanbulLibReport from 'istanbul-lib-report';
import istanbulReports from 'istanbul-reports';

const { createCoverageMap } = istanbulLibCoverage;
const { createContext } = istanbulLibReport;
const { create: createReport } = istanbulReports;

/**
 * @param {{ projects: Map<string, string>, workspaceRoot: string }} params
 * @returns {{ reportFile: string, projectsIncluded: string[] } | undefined}
 */
export function mergeCoverageReports({ projects, workspaceRoot }) {
  const coverageMap = createCoverageMap({});
  const projectsIncluded = [];

  for (const [name, root] of projects) {
    const finalCoverageFile = path.join(root, 'coverage', 'coverage-final.json');
    if (!fs.existsSync(finalCoverageFile)) continue;

    try {
      const fileCoverage = JSON.parse(fs.readFileSync(finalCoverageFile, 'utf8'));
      coverageMap.merge(fileCoverage);
      projectsIncluded.push(name);
    } catch (error) {
      console.error(`[run] could not read coverage for ${name}: ${error.message}`);
    }
  }

  if (projectsIncluded.length === 0) return undefined;

  const outputDir = path.join(workspaceRoot, 'coverage');
  fs.rmSync(outputDir, { recursive: true, force: true });
  const context = createContext({ dir: outputDir, coverageMap });

  createReport('html').execute(context);
  createReport('text-summary').execute(context);

  return { reportFile: path.join(outputDir, 'index.html'), projectsIncluded };
}
