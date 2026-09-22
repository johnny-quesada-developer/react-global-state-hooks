export interface Guideline {
  id: string;
  title: string;
  rule: string;
}

export const defaultGuidelines: Guideline[] = [
  {
    id: 'overMocking',
    title: 'Do not over-mock',
    rule: 'Mock only third-party or external boundaries (network, native modules, time, random). Code that belongs to this repository must be imported and exercised for real, not mocked.',
  },
  {
    id: 'realEnvironment',
    title: 'Test in the real environment',
    rule: 'Prepare the environment the code actually runs in (render real providers/stores, real DOM via the configured environment) so tests verify behavior instead of wiring.',
  },
  {
    id: 'isolation',
    title: 'Fully isolated tests',
    rule: 'Every test leaves no trace: restore mocks, spies, timers, stubbed globals and module state after each test (afterEach), and never depend on test order.',
  },
  {
    id: 'globalsAvoidance',
    title: 'Avoid globals',
    rule: 'Prefer local helpers and resources created inside the test file over globals or shared mutable state. When a global must be touched, stub it and restore it in the same file.',
  },
  {
    id: 'selfContainment',
    title: 'Self-contained test file',
    rule: 'The test file contains almost everything it needs: local factories and reusable helper functions in the same file are welcome; avoid hidden setup elsewhere.',
  },
  {
    id: 'density',
    title: 'Few dense functional tests',
    rule: 'Prefer a few robust functional tests that walk through realistic flows with several assertions over many tiny tests, because each test pays the full setup and cleanup cost.',
  },
];

/** Guidelines carrying a `score` key are the ones the quality loop actually scores; the rest (like `realEnvironment`) are general guidance included in prompts but not part of the schema. */
export const DEFAULT_SCORED_CRITERIA = ['overMocking', 'isolation', 'globalsAvoidance', 'density', 'selfContainment'];

export const describeGuidelines = (guidelines: Guideline[] = defaultGuidelines) =>
  guidelines.map(({ title, rule }, index) => `${index + 1}. ${title}: ${rule}`).join('\n');
