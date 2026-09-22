# Testing Guide

Use this guide for running and writing tests. [ARCHITECTURE.md](../ARCHITECTURE.md#reusable-test-suite-libstest)
describes the shared suites, source aliases and debug-patch projects.

## Running tests

```bash
yarn test                     # all projects
yarn test web                 # one project
yarn test:coverage web        # coverage for one variant
yarn coverage                 # combined variant coverage
yarn test:interop universal   # build and check packed ESM/CJS exports
yarn test:interop web
```

For watch mode, run `yarn test:watch` inside the project directory. The state-library
`test` scripts type-check tests before running Vitest. The debug package additionally
runs the shared suites with and without the patch. App scripts vary; their
`package.json` is the command reference.

Tests resolve TypeScript source. They do not prove the contents or module shape of
published packages; the separate interop scripts check built and packed output.

## Where tests live

- `libs/test/universal`: behavior shared by all state-library variants.
- `libs/test/web` and `libs/test/native`: platform-specific persistence behavior.
- `libs/test/helpers`: shared assertions and fixtures.
- Project `__test__/` or app `src/**/*.test.{ts,tsx}`: implementation and application tests.

Shared tests import `global-state-hooks-under-test` and helpers from `../helpers`.
Use `expectMetadata(...).toMatch(...)` for variant metadata and run the affected variants.
Name integration tests for what they exercise; reserve end-to-end claims for tests
that connect the real application components and transport.

## Writing good tests

- Exercise production behavior and assert observable results. Mock external boundaries,
  not the implementation being tested.
- Keep related assertions together when they describe one behavior. A test must fail
  when that behavior breaks; `expect(true)` and array-length checks against zero do not help.
- Use `expect(() => operation()).toThrow()` for synchronous failures and
  `await expect(operation()).rejects.toThrow()` for promises. Do not catch assertion failures.
- Keep serialization and large-state correctness tests; measure performance separately
  with a real clock. A fixed `performance.now()` is useful for deterministic timestamps,
  not elapsed-time thresholds.
- For React, await asynchronous updates inside `act` or use `waitFor` for the resulting
  UI. Use `renderToString` when asserting server markup, and hydration APIs when testing hydration.
- Preserve regressions for subscriptions, action ordering, storage, cleanup and packaging.
  Delete tests that only assert their own mocks or duplicate existing coverage.

## Mocking

Module mocks are hoisted. Use `vi.hoisted` when their setup needs shared values, and
return every named/default export the production import uses. The DevTools app's
`vitest.setup.ts` supplies Chrome stubs; extend those at the boundary being tested.
Keep fixture action types aligned with the production protocol.

## Coverage

Coverage measures TypeScript source and writes HTML, LCOV and JSON into each project's
`coverage/` directory. Use `yarn coverage` for the combined report. Coverage percentages
do not measure whether assertions detect regressions.

## Troubleshooting

- **Alias errors:** compare the project's Vitest aliases and test-tsconfig paths.
- **Timeouts:** wait for a concrete condition before increasing a timeout. Integration
  suites that create a local server need permission to bind a loopback port.
- **React `act` warnings:** await the pending update before asserting or tearing down.
- **Vitest global type errors:** check the test tsconfig's `typeRoots` and module resolution.

## Resources

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Monorepo architecture](../ARCHITECTURE.md)
