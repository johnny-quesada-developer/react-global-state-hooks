# Testing Guide

How to run and write tests in this monorepo. For the testing **architecture** — the reusable
suite, how each variant runs it, and the debug patched-run — see
[ARCHITECTURE.md](../ARCHITECTURE.md); this guide focuses on the day-to-day craft.

The repo uses **[Vitest](https://vitest.dev)** (jsdom) everywhere, and **yarn** with an
[Nx](https://nx.dev) dispatcher. Tasks are run per project (`yarn <task> <project>`) or across all
projects (`yarn <task>`).

## Running tests

```bash
# Every project
yarn test

# A single project (universal | web | mobile | monkey_patch | playground | devtools)
yarn test web

# Watch mode for a project (fast inner loop) — run inside the project
cd libs/web && yarn test:watch

# Coverage for a project (works via the dispatcher)
yarn test:coverage web
```

Under the hood each project's `test` script is `yarn ts-check:tests && vitest run` (type-check the
tests, then run them) — see the project's `package.json`.

## Where tests live

- **Reusable suite:** `libs/test/{universal,web,native}` + shared helpers in `libs/test/helpers`.
  These are variant-neutral (they import the subject under test via the
  `global-state-hooks-under-test` alias) and are run by each lib against its own source. See
  [ARCHITECTURE.md](../ARCHITECTURE.md#reusable-test-suite-libstest).
- **Per-project tests:** each project also has its own `__test__/` (or `src/**/*.test.ts` for the
  apps) for code specific to it.

### Naming conventions

- Unit tests: `*.test.ts` / `*.test.tsx`
- Real-world / integration tests: `*.real-world.test.ts`
- Co-locate tests in a `__tests__/` folder next to the code (or alongside it for the apps).

## Writing good tests

### Test structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../functionToTest';

describe('functionToTest', () => {
  describe('when given valid input', () => {
    it('should return the expected output', () => {
      expect(functionToTest('valid')).toBe('expected');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(functionToTest('')).toBe('');
    });
  });
});
```

### Best practices

✅ **DO:** test happy paths, error conditions, and edge cases (null/undefined/empty/large); use
descriptive names; group with `describe`; mock external dependencies; assert one thing per test.

❌ **DON'T:** test implementation details or third-party libraries; write tests purely for a
coverage number; skip error scenarios; test private methods directly.

### Testing React components

React Testing Library is configured (import from `@testing-library/react`).

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles clicks', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('updates its value', () => {
    const { result } = renderHook(() => useMyHook());
    act(() => result.current.setValue(5));
    expect(result.current.value).toBe(5);
  });
});
```

## Mocking

```typescript
import { vi } from 'vitest';

// Functions
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue('async result');

// Modules (hoisted — define before the imports that use them)
vi.mock('../module', () => ({
  functionToMock: vi.fn(() => 'mocked'),
}));
```

**Chrome APIs** (for the `devtools` app) are stubbed in `apps/devtools/vitest.setup.ts`; extend
per test as needed:

```typescript
(global as unknown as { chrome: unknown }).chrome = {
  runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
};
```

> Note: when a test mocks a module the state libraries import (e.g.
> `react-global-state-hooks/uniqueId`), return **both** the named and default exports the subject
> uses — the source imports the named binding (`import { uniqueId }`), so a `default`-only mock
> will fail.

## Coverage

`yarn test:coverage <project>` uses the v8 provider and writes to the project's `coverage/`:

- **HTML** — `coverage/index.html` (interactive, line-by-line).
- **LCOV** — `coverage/lcov.info` (for Codecov/Coveralls).
- **JSON** — `coverage/coverage-final.json` (machine-readable for CI).

Coverage is measured against the TypeScript **source** (see `scripts/coverage-report.mjs` for the
combined cross-variant report, run via `yarn coverage`).

## CI example (GitHub Actions)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn test
```

## Troubleshooting

- **`Cannot find module` / alias errors** — check the project's `vitest.config.ts` `resolve.alias`
  (and its `__test__/tsconfig.json` `paths`). Tests resolve the state libraries from monorepo
  source via those aliases.
- **Tests timing out** — pass a per-test timeout (`it('slow', async () => { ... }, 10000)`) or set
  `test.testTimeout` in the project's `vitest.config.ts`. Prefer waiting on an actual condition
  over a fixed `setTimeout` (fixed delays flake under load).
- **Mock not applied** — module mocks are hoisted; define them before the imports that use them,
  and use `vi.hoisted()` when a mock needs a value computed at hoist time.
- **`vitest/globals` type errors in `ts-check:tests`** — the project's `__test__/tsconfig.json`
  must widen `typeRoots` to include plain `node_modules` (Vitest isn't under `@types`); see any
  lib's test tsconfig.

## Resources

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — the monorepo's testing architecture
