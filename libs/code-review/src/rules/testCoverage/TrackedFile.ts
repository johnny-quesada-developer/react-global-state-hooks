import type { AttemptRecord } from '../../graph/attemptHistory';

export type CoverageStatus =
  | 'pending'
  | 'notTestable'
  | 'alreadyCovered'
  | 'improved'
  | 'coverageFailed'
  | 'qualityFailed'
  | 'unprocessable';

export interface CoverageSnapshot {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  uncoveredLines: string;
  testsPassed: boolean;
  outputTail: string;
}

export interface TrackedFile {
  originalPath: string;
  sourcePath: string;
  projectRoot: string;
  testPath?: string;
  needsNewTestFile: boolean;
  status: CoverageStatus;
  reason: string;
  initialCoverage?: CoverageSnapshot;
  latestCoverage?: CoverageSnapshot;
  coverageHistory: AttemptRecord[];
  qualityHistory: AttemptRecord[];
  qualityScores?: Record<string, number>;
  notes: string[];
  changedFiles: string[];
}

export interface TestCoverageOptions {
  goal: number;
  maxCoverageAttempts: number;
  maxQualityAttempts: number;
}

export const isPending = (file: TrackedFile) => file.status === 'pending';

export const meetsGoal = ({ coverage, goal }: { coverage: CoverageSnapshot; goal: number }) =>
  coverage.testsPassed && coverage.lines >= goal;

export const formatPercent = (value: number | undefined) =>
  value === undefined ? '—' : `${value.toFixed(1)}%`;

export function trackFile({ file, projectRoot }: { file: string; projectRoot: string }): TrackedFile {
  return {
    originalPath: file,
    sourcePath: file,
    projectRoot,
    needsNewTestFile: false,
    status: 'pending',
    reason: '',
    coverageHistory: [],
    qualityHistory: [],
    notes: [],
    changedFiles: [],
  };
}
