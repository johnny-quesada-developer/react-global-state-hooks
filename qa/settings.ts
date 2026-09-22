import { defineSettings } from 'code-review';

// Workspace settings; package upgrades do not overwrite these values.
export default defineSettings({
  workspace: { root: '.' },
  providers: {
    claude: { models: { fast: 'haiku', capable: 'sonnet' } },
  },
  permissions: {
    bash: [
      'yarn test *',
      'yarn vitest *',
      'npx vitest *',
      'npm test *',
      'vitest *',
      'git diff *',
      'git status *',
      'git log *',
    ],
  },
  agent: {
    maxBudgetUsdPerAttempt: 1,
    attemptTimeoutMinutes: 10,
    scoreBatchSize: 4,
    concurrency: 1,
  },
});
