import type { AttemptRecord } from '../../graph/attemptHistory';
import type { AgentProvider } from '../../providers/AgentProvider';
import type { Logger } from '../../shared/logger';
import type { ReviewContext } from '../../pipeline/ReviewContext';

export type FileOutcome = 'passed' | 'skipped' | 'failed';

export interface FileResult {
  file: string;
  status: string;
  outcome: FileOutcome;
  reason: string;
  details: Record<string, string | number>;
  history?: Record<string, AttemptRecord[]>;
}

export interface RuleReport {
  ruleId: string;
  title: string;
  fileResults: FileResult[];
  notes: string[];
  changedOutsideTargets: string[];
  crashReason?: string;
}

export interface RuleRunParams {
  context: ReviewContext;
  provider: AgentProvider;
  files: string[];
  logger: Logger;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  /** A disabled rule is loaded and listed but never runs (not even when requested with --rule). */
  disabled?: boolean;
  run: (params: RuleRunParams) => Promise<RuleReport>;
}
