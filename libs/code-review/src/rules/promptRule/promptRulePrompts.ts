import path from 'node:path';
import { describeHistory, type AttemptRecord } from '../../graph/attemptHistory';
import { readIfExists } from '../../shared/workspace';
import type { PromptRuleDefinition, PromptRuleReview } from './PromptRuleDefinition';

const describeCriteria = (definition: PromptRuleDefinition) =>
  definition.criteria
    .map(({ id, title, description }, index) => `${index + 1}. ${id} — ${title}: ${description}`)
    .join('\n');

const describeBlockingFlags = (definition: PromptRuleDefinition) =>
  definition.blockingFlags.length
    ? definition.blockingFlags.map(({ flag, description }) => `- ${flag}: ${description}`).join('\n')
    : '- (none)';

export function buildRuleScoreSystemPrompt(definition: PromptRuleDefinition): string {
  return `You review files against the rule "${definition.title}". You never modify anything.

Rule: ${definition.description}

Score each criterion from 0 (violates it) to 10 (exemplary). Keys of "scores" must be exactly: ${definition.criteria.map(({ id }) => id).join(', ')}.
${describeCriteria(definition)}

Blocking flags — return the flag name in "flags" ONLY when you see the problem in the file:
${describeBlockingFlags(definition)}

evidence: quotes or line references that justify every score below ${definition.passThreshold} and every flag.
suggestedFixes: concrete, actionable changes (empty when the file passes).`;
}

export const buildRuleScoreUserPrompt = ({ workspaceRoot, file }: { workspaceRoot: string; file: string }) =>
  `--- file: ${path.relative(workspaceRoot, file)} ---\n${readIfExists(file, 20000)}`;

export function buildRuleFixSystemPrompt(definition: PromptRuleDefinition): string {
  return `You fix files so they comply with the rule "${definition.title}". The pipeline re-scores the file deterministically after you finish.

Rule: ${definition.description}
Criteria (each must score at least ${definition.passThreshold}/10 afterwards):
${describeCriteria(definition)}
Blocking problems that must be gone:
${describeBlockingFlags(definition)}
${definition.fixInstructions ? `\nFix instructions:\n${definition.fixInstructions}\n` : ''}
Working rules:
- The file is the review target, not an edit boundary; change any other repository file the fix requires in the same attempt.
- Keep the observable behavior of the code intact and keep all tests passing.
- Apply the fix in as few edits as possible, then stop. Do not summarize.`;
}

const describeReview = (
  review: PromptRuleReview | undefined,
) => `- scores: ${JSON.stringify(review?.scores ?? {})}
- flags: ${review?.flags.join(', ') || 'none'}
- evidence: ${review?.evidence.join(' | ') || 'none'}
- suggested fixes: ${review?.suggestedFixes.join(' | ') || 'none'}`;

export function buildRuleFixPrompt({
  mode,
  workspaceRoot,
  file,
  review,
  history,
}: {
  mode: 'continue' | 'fresh';
  workspaceRoot: string;
  file: string;
  review: PromptRuleReview | undefined;
  history: AttemptRecord[];
}): string {
  const relativePath = path.relative(workspaceRoot, file);
  if (mode === 'continue') {
    return `The pipeline re-scored ${relativePath} after your last edit and it still does not pass:
${describeReview(review)}

Continue from the current state of the file and fix the remaining problems.`;
  }

  return `Task: make ${relativePath} comply with the rule.

Latest review:
${describeReview(review)}

--- file: ${relativePath} ---
${readIfExists(file, 20000)}

Previous attempts for this file:
${describeHistory(history)}`;
}
