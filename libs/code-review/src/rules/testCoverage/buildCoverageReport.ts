import path from 'node:path';
import { formatDuration } from '../../segments/rules/agentEdit';
import type { FileOutcome, FileResult, RuleReport } from '../../segments/rules/Rule';
import {
  formatPercent,
  type CoverageStatus,
  type TestCoverageOptions,
  type TrackedFile,
} from './TrackedFile';

const outcomeByStatus: Record<CoverageStatus, FileOutcome> = {
  pending: 'failed',
  outOfScope: 'skipped',
  notTestable: 'skipped',
  alreadyCovered: 'passed',
  improved: 'passed',
  coverageFailed: 'failed',
  qualityFailed: 'failed',
  unprocessable: 'failed',
};

export function buildCoverageReport({
  files,
  options,
  workspaceRoot,
  ruleId,
  title,
}: {
  files: TrackedFile[];
  options: TestCoverageOptions;
  workspaceRoot: string;
  ruleId: string;
  title: string;
}): RuleReport {
  const relative = (file: string) => path.relative(workspaceRoot, file);

  const fileResults: FileResult[] = files.map((file) => {
    const lowestQualityScore = file.qualityScores
      ? Math.min(...Object.values(file.qualityScores))
      : undefined;
    return {
      file: relative(file.sourcePath),
      status: file.status,
      outcome: outcomeByStatus[file.status],
      reason: file.reason,
      details: {
        initial: formatPercent(file.initialCoverage?.lines),
        final: formatPercent(file.latestCoverage?.lines),
        goal: `${options.goal}%`,
        tries: file.coverageHistory.length + Math.max(file.qualityHistory.length - 1, 0),
        quality: lowestQualityScore === undefined ? '—' : `min ${lowestQualityScore}/10`,
        cost: file.usage.costUsd ? `$${file.usage.costUsd.toFixed(2)}` : '—',
        time: file.usage.durationMs ? formatDuration(file.usage.durationMs) : '—',
      },
      history: { coverage: file.coverageHistory, quality: file.qualityHistory },
    };
  });

  const targetFiles = new Set(files.flatMap((file) => [file.originalPath, file.sourcePath, file.testPath]));
  const changedOutsideTargets = [...new Set(files.flatMap((file) => file.changedFiles))]
    .filter((changed) => !targetFiles.has(changed))
    .map(relative)
    .sort();

  return {
    ruleId,
    title,
    fileResults,
    notes: files.flatMap((file) => file.notes.map((note) => `${relative(file.originalPath)}: ${note}`)),
    changedOutsideTargets,
  };
}
