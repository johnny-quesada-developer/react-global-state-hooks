import type { AgentProvider, EditOutcome, EditParams } from './AgentProvider';
import type { PermissionGrant } from './ProviderDefinition';

type AnalyzeResponder = (params: { prompt: string; cwd: string; file?: string }) => unknown;
type EditResponder = (params: EditParams) => Promise<void> | void;

export const BATCH_FILES_MARKER = 'Files (one result each):';

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
  'draft-rule': ({ prompt }) => ({
    criteria: [
      {
        id: 'clarity',
        title: 'Clarity',
        description: 'The code states its intent without needing comments.',
      },
      { id: 'naming', title: 'Naming', description: 'Identifiers describe what they hold or do.' },
    ],
    blockingFlags: [
      { flag: 'containsDebugCode', description: 'console.log or debugger statements left in the file' },
    ],
    fixInstructions: `Improve the file following the rule: ${prompt.slice(0, 60)}`,
  }),
};

const scoreAnyRule: AnalyzeResponder = ({ prompt }) => {
  const criteriaIds =
    prompt
      .match(/Keys of "scores" must be exactly: (.+)\./)?.[1]
      .split(',')
      .map((id) => id.trim()) ?? [];
  return {
    scores: Object.fromEntries(criteriaIds.map((id) => [id, 8])),
    flags: [],
    evidence: ['fake provider scores'],
    suggestedFixes: [],
  };
};

const fallbackResponderFor = (task: string): AnalyzeResponder | undefined =>
  task.startsWith('score-') ? scoreAnyRule : undefined;

const listBatchFiles = (prompt: string): string[] | undefined =>
  prompt
    .match(new RegExp(`${BATCH_FILES_MARKER.replace(/[()]/g, '\\$&')} (.+)`))?.[1]
    .split(',')
    .map((file) => file.trim())
    .filter(Boolean);

export const fakeGrant: PermissionGrant = { scope: 'workspace', editDirectories: [], bashPatterns: [] };

export interface FakeEditCall {
  task: string;
  prompt: string;
  systemPrompt?: string;
  sessionId?: string;
  wasResumed: boolean;
}

export function createFakeProvider({
  analyzeResponders = defaultFakeAnalyzeResponders,
  editResponder = () => undefined,
  editCalls = [],
}: {
  analyzeResponders?: Record<string, AnalyzeResponder>;
  editResponder?: EditResponder;
  editCalls?: FakeEditCall[];
} = {}): AgentProvider {
  return {
    id: 'fake',
    label: 'Fake provider (no AI)',
    models: { fast: 'none', capable: 'none' },
    grant: fakeGrant,
    supportsSessions: true,

    async analyze({ task, prompt, systemPrompt, cwd }) {
      const responder = analyzeResponders[task] ?? fallbackResponderFor(task);
      if (!responder) throw new Error(`fake provider has no responder for "${task}"`);
      const fullPrompt = `${systemPrompt ?? ''}\n${prompt}`;
      const batchFiles = listBatchFiles(prompt);
      if (batchFiles) {
        return JSON.stringify({
          results: batchFiles.map((file) => ({ file, review: responder({ prompt: fullPrompt, cwd, file }) })),
        });
      }
      return JSON.stringify(responder({ prompt: fullPrompt, cwd }));
    },

    async edit(params): Promise<EditOutcome> {
      editCalls.push({
        task: params.task,
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        sessionId: params.session?.id,
        wasResumed: params.session?.hasStarted ?? false,
      });
      await editResponder(params);
      if (params.session) params.session.hasStarted = true;
      return { exitCode: 0, summary: 'fake edit finished', deniedActions: [], usage: { durationMs: 0 } };
    },
  };
}
