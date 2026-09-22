import { createTestCoverageRule } from 'code-review';

// Scope: playground only. libs/universal|mobile|web share the external suite in libs/test/, and
// apps/devtools uses __tests__/ folders (no matching testLayout) — keep both out for now.
export default createTestCoverageRule({
  goal: 80,
  maxCoverageAttempts: 3,
  maxQualityAttempts: 3,
  testSuffix: 'test',
  testLayout: 'colocated',
  scope: { include: ['apps/playground/**/*.{ts,tsx}'] },
});
