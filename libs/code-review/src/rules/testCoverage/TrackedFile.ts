import type { AttemptRecord } from '../../graph/attemptHistory';
import type { AgentUsage } from '../../providers/AgentProvider';
import type { AgentSession } from '../../providers/ProviderDefinition';
import type { QualityReview } from './prompts/testQualityPrompts';

export type CoverageStatus =
  | 'pending'
  | 'outOfScope'
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
  pendingReview?: QualityReview;
  agentSession?: AgentSession;
  notes: string[];
  changedFiles: string[];
  usage: AgentUsage;
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

export const coverageFromCache = (lines: number): CoverageSnapshot => ({
  lines,
  statements: lines,
  functions: lines,
  branches: lines,
  uncoveredLines: 'none',
  testsPassed: true,
  outputTail: 'restored from the result cache',
});

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
    usage: { turns: 0, costUsd: 0, durationMs: 0 },
  };
}
