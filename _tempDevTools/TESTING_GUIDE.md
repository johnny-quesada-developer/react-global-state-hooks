# Testing Guide

## Quick Start

### Running Tests

```bash
# Run all tests once
npm run test:run
# or
yarn test:run

# Run tests in watch mode (recommended for development)
npm run test:watch
# or
yarn test:watch

# Run tests with UI
npm run test:ui
# or
yarn test:ui
```

### Checking Test Coverage

```bash
# Generate coverage report
npm run test:coverage
# or
yarn test:coverage

# Generate coverage report and open in browser (macOS)
npm run test:coverage:open
# or
yarn test:coverage:open

# For Windows/Linux, run coverage then manually open:
# coverage/index.html
```

### Testing Changed Files Only

```bash
# Run tests related to changed files (useful for PRs)
npm run test:changed
# or
yarn test:changed
```

---

## Coverage Thresholds

The project has the following coverage requirements:

- **Lines**: 60%
- **Functions**: 60%
- **Branches**: 60%
- **Statements**: 60%

⚠️ **Current Coverage**: ~4% (as of April 2026)

---

## Test Organization

```
src/
├── shared/
│   ├── tools/
│   │   └── __tests__/
│   │       ├── EntityAdapter.test.ts
│   │       ├── softClone.test.ts
│   │       └── softClone.real-world.test.ts
│   └── schema/
│       └── __tests__/
│           ├── ActionLogJson.test.ts
│           └── ActionLogJson.real-world.test.ts
└── pages/
    └── main_tab/
        └── hooks/
            └── globalStates/
                └── __tests__/
                    └── useGlobalStates.utils.test.ts
```

### Naming Conventions

- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Real-world/Integration tests**: `*.real-world.test.ts`
- **Place test files**: In `__tests__/` folder next to the code being tested

---

## Priority Areas for Testing

See [TEST_QUALITY_REPORT.md](./TEST_QUALITY_REPORT.md) for detailed analysis.

### 🔴 High Priority (Critical Business Logic)

1. **`src/lib/monkey_patch/mergeState.ts`**
   - State merging algorithm
   - Non-serializable value handling
   - Nested object merging

2. **`src/pages/main_tab/util/generateStackHash.ts`**
   - Hash consistency
   - Collision handling
   - Edge cases (empty strings, special characters)

3. **`src/pages/main_tab/util/stringifyPayload.ts`**
   - Complex object serialization
   - Special type handling (Date, Map, Set, RegExp, Error, Function)
   - Formatting and indentation

4. **`src/lib/monkey_patch/maybeCleanupPreviousStateMetadata.ts`**
   - Cleanup logic
   - Session management

### 🟡 Medium Priority (Utilities)

5. **`src/shared/tools/debounce.ts`**
   - Timing accuracy
   - Cancellation
   - Multiple calls

6. **`src/shared/tools/throttle.ts`**
   - Timing accuracy
   - Leading/trailing edge

7. **Schema validators** (in `src/shared/schema/`)
   - Invalid data handling
   - Type coercion
   - Required fields

8. **Custom React hooks** (in `src/shared/hooks/`)
   - useDebounce
   - useDebounceEffect
   - useDebounceValue
   - useImmediateEffect
   - useInitialEffect

### 🟢 Lower Priority

9. React components (integration/E2E tests preferred)
10. Type definitions
11. Simple getter/setter functions

---

## Writing Good Tests

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../functionToTest';

describe('functionToTest', () => {
  describe('when given valid input', () => {
    it('should return expected output', () => {
      const result = functionToTest('valid');
      expect(result).toBe('expected');
    });
  });

  describe('when given invalid input', () => {
    it('should throw an error', () => {
      expect(() => functionToTest(null)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = functionToTest('');
      expect(result).toBe('');
    });
  });
});
```

### Test Coverage Best Practices

✅ **DO:**

- Test happy paths
- Test error conditions
- Test edge cases (null, undefined, empty, very large)
- Test boundary values
- Use descriptive test names
- Group related tests with `describe`
- Mock external dependencies
- Test one thing per test

❌ **DON'T:**

- Test implementation details
- Test third-party libraries
- Write tests just for coverage numbers
- Skip error scenario tests
- Write overly complex tests
- Test private methods directly

### Example: Testing `mergeState`

```typescript
// src/lib/monkey_patch/__tests__/mergeState.test.ts
import { describe, it, expect } from 'vitest';
import { mergeState } from '../mergeState';

describe('mergeState', () => {
  describe('primitive values', () => {
    it('should replace primitives', () => {
      expect(mergeState(1, 2)).toBe(2);
      expect(mergeState('old', 'new')).toBe('new');
      expect(mergeState(true, false)).toBe(false);
    });
  });

  describe('objects', () => {
    it('should merge object properties', () => {
      const state = { a: 1, b: 2 };
      const newState = { b: 3, c: 4 };
      const result = mergeState(state, newState);

      expect(result).toEqual({ b: 3, c: 4 });
    });

    it('should handle nested objects', () => {
      const state = { user: { name: 'John', age: 30 } };
      const newState = { user: { age: 31 } };
      const result = mergeState(state, newState);

      expect(result).toEqual({ user: { age: 31 } });
    });
  });

  describe('non-serializable values', () => {
    it('should preserve old values for non-serializable properties', () => {
      const state = { fn: () => 'old', value: 1 };
      const newState = { fn: { __non_serializable__: true }, value: 2 };
      const result = mergeState(state, newState) as any;

      expect(result.fn()).toBe('old');
      expect(result.value).toBe(2);
    });

    it('should throw when entire state is non-serializable', () => {
      const state = { a: 1 };
      const newState = { __non_serializable__: true };

      expect(() => mergeState(state, newState)).toThrow();
    });
  });

  describe('arrays', () => {
    it('should replace arrays instead of merging', () => {
      const state = [1, 2, 3];
      const newState = [4, 5];

      expect(mergeState(state, newState)).toEqual([4, 5]);
    });
  });

  describe('dates', () => {
    it('should replace date objects', () => {
      const oldDate = new Date('2020-01-01');
      const newDate = new Date('2021-01-01');

      expect(mergeState(oldDate, newDate)).toBe(newDate);
    });
  });

  describe('special objects', () => {
    it('should replace Map objects', () => {
      const oldMap = new Map([['a', 1]]);
      const newMap = new Map([['b', 2]]);

      expect(mergeState(oldMap, newMap)).toBe(newMap);
    });

    it('should replace Set objects', () => {
      const oldSet = new Set([1, 2]);
      const newSet = new Set([3, 4]);

      expect(mergeState(oldSet, newSet)).toBe(newSet);
    });
  });
});
```

---

## Testing React Components

### Setup

React Testing Library is already configured. Import from `@testing-library/react`.

### Example Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('should update value', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue(5);
    });

    expect(result.current.value).toBe(5);
  });
});
```

---

## Mocking

### Mocking Functions

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue('async result');
```

### Mocking Modules

```typescript
vi.mock('../module', () => ({
  functionToMock: vi.fn(() => 'mocked'),
}));
```

### Mocking Chrome APIs

Already set up in `vitest.setup.ts`. Extend as needed:

```typescript
(global as any).chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
};
```

---

## Coverage Reports

### Terminal Output

After running `npm run test:coverage`, you'll see:

```
% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   60.00 |    55.00 |   65.00 |   60.00 |
 mergeState.ts     |   90.00 |    85.00 |   100.0 |   90.00 | 15,23
 ...
```

### HTML Report

Open `coverage/index.html` in your browser for:

- Interactive file explorer
- Line-by-line coverage visualization
- Branch coverage details
- Function coverage

### JSON Report

`coverage/coverage-final.json` - Machine-readable format for CI/CD integration.

### LCOV Report

`coverage/lcov.info` - Standard format for tools like Codecov, Coveralls.

---

## CI/CD Integration

### Example GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Troubleshooting

### Coverage report not generating

- Ensure `@vitest/coverage-v8` is installed (should be in devDependencies)
- Check vitest.config.ts has coverage configuration

### Tests timing out

- Increase timeout in test: `it('slow test', async () => { ... }, 10000);`
- Or globally in vitest.config.ts: `testTimeout: 10000`

### Cannot find module errors

- Check path aliases in vitest.config.ts
- Ensure imports use correct aliases (@src, @shared, @main_tab)

### Mock not working

- Ensure mocks are defined before imports
- Use `vi.hoisted()` for hoisted mocks

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test Coverage Report](./TEST_QUALITY_REPORT.md)

---

## Next Steps

1. Read [TEST_QUALITY_REPORT.md](./TEST_QUALITY_REPORT.md) for detailed analysis
2. Pick a high-priority untested file
3. Create `__tests__/` folder next to it
4. Write comprehensive tests
5. Run `npm run test:coverage` to verify
6. Repeat until coverage thresholds are met

**Target**: 60% coverage minimum, 80% ideal.
