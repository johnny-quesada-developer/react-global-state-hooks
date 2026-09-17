import type { Logger } from '../shared/logger';
import type { AgentProvider, EditOutcome } from './AgentProvider';

type AnalyzeResponder = (params: { prompt: string; cwd: string }) => unknown;
type EditResponder = (params: { prompt: string; cwd: string; logger: Logger }) => Promise<void> | void;

export const defaultFakeAnalyzeResponders: Record<string, AnalyzeResponder> = {
  'capture-test-metadata': () => ({
    runner: 'vitest',
    testEnvironment: 'jsdom',
    testIncludeGlobs: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverageCommand:
      'vitest related {sourceFile} --run --coverage.enabled --coverage.provider=v8 --coverage.reporter=json-summary --coverage.reporter=json --coverage.include={sourceFile} --coverage.reportsDirectory={reportDir}',
    testingNotes: 'fake provider metadata',
  }),
  'score-test-quality': () => ({
    scores: { overMocking: 8, isolation: 8, globalsAvoidance: 8, density: 8, selfContainment: 8 },
    flags: [],
    evidence: ['fake provider scores'],
    suggestedFixes: [],
  }),
};

export function createFakeProvider({
  analyzeResponders = defaultFakeAnalyzeResponders,
  editResponder = () => undefined,
}: {
  analyzeResponders?: Record<string, AnalyzeResponder>;
  editResponder?: EditResponder;
} = {}): AgentProvider {
  return {
    id: 'fake',
    label: 'Fake provider (no AI)',
    model: 'none',
    editMode: 'headless',

    async analyze({ task, prompt, cwd }) {
      const responder = analyzeResponders[task];
      if (!responder) throw new Error(`fake provider has no responder for "${task}"`);
      return JSON.stringify(responder({ prompt, cwd }));
    },

    async edit({ prompt, cwd, logger }): Promise<EditOutcome> {
      await editResponder({ prompt, cwd, logger });
      return { exitCode: 0, summary: 'fake edit finished', deniedActions: [] };
    },
  };
}
