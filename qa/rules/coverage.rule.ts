import { createTestCoverageRule } from 'code-review';

// Personalized for this repo's actual (inconsistent) test conventions — see qa/rules/README notes
// below before widening `scope`:
//
// - libs/universal, libs/mobile, libs/web have NO per-file tests at all: they share one external
//   suite in libs/test/ run against each variant via path aliasing (see their vitest.config.ts,
//   `global-state-hooks-under-test`). A per-file coverage agent must never touch them — it would
//   create redundant, wrong-pattern tests fighting an intentional shared-suite architecture.
// - apps/devtools uses `__tests__/` sibling folders, which neither built-in `testLayout` matches,
//   and is large (~214 source files) — deliberately left out for now rather than forcing a bad
//   fit or a huge first run. Revisit with a custom `testPlacement` if/when it's brought in scope.
// - apps/playground colocates tests directly next to source (`x.test.tsx` beside `x.tsx`) and is
//   the only project this pipeline has actually been exercised against — the sole target below.
export default createTestCoverageRule({
  goal: 80,
  maxCoverageAttempts: 3,
  maxQualityAttempts: 3,
  testSuffix: 'test',
  testLayout: 'colocated',
  scope: { include: ['apps/playground/**/*.{ts,tsx}'] },
});
