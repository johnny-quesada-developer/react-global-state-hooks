import { devToolsExample, todoListExample } from './useGlobalStates.mocks';

export type MockStateExample = 'devtools' | 'todolist';

const aliases: Record<string, MockStateExample> = {
  devtools: 'devtools',
  dev: 'devtools',
  todolist: 'todolist',
  todo: 'todolist',
  todos: 'todolist',
};

/**
 * Normalize a user-provided example name (e.g. from `yarn preview:dev todo`) to a
 * known MockStateExample. Unknown values fall back to 'devtools'.
 */
export function resolveMockExample(example: string | undefined | null): MockStateExample {
  if (!example) return 'devtools';
  return aliases[example.toLowerCase().trim()] ?? 'devtools';
}

export function generateMockState(example: MockStateExample | string = 'devtools') {
  const examples: Record<MockStateExample, unknown> = {
    devtools: devToolsExample,
    todolist: todoListExample,
  };

  return examples[resolveMockExample(example)];
}
