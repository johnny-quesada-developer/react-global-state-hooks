# Performance audit: `audit-rgsh`

Scope: the core in `libs/universal/src` (`GlobalStore`), which `web` and `mobile` extend.
Constraints: no public API change, no unit test change, no behavior change, code kept linear.

## Summary

All changes are in `libs/universal/src/GlobalStore.ts`, so `web` and `mobile` pick them up too.
The hot paths were dominated by two things that never show up in the TypeScript source:

1. **`setState` built a throwaway object on every call.** It copied `storeTools`, merged in the state
   change and redefined `metadata` as a getter, even when no callback was there to receive it.
   That one object was ~99% of the cost of a `setState` with no subscribers.
2. **Object spread compiles to slow helpers.** The packages build with `target: es2017`, and object
   spread is ES2018, so esbuild emits `__spreadValues` / `__spreadProps` helpers. These walk property
   descriptors. The `{ ...options, selector, dependencies }` in `use()` ran on every render of every
   component that uses the hook.

## Results

`master` and this branch were each built with the same esbuild settings as
`libs/universal/esbuild.config.ts` (bundle, `es2017`, minified, ESM). The benchmark used the real
dependencies from the repository's `node_modules`: React 18.3.1, react-dom 18.3.1 rendering into
jsdom 26.1.0, and `json-storage-formatter`. Each build ran in its own Node 24.21.0 process on an
Apple M1 Pro, so JIT state was never shared. Each scenario is the median of 7 rounds, in ns per
operation, and the table shows the mean of two full runs. Lower is better. The two runs agreed
within 8% on every row, except the 0-subscriber "after" value, which measured 18 ns and 20 ns.

**Core (no rendering)**

| Scenario | Before | After | Speedup |
| --- | ---: | ---: | ---: |
| `setState`, 0 subscribers | 1,350 | 19 | ~71x |
| `setState`, 10 `subscribe()` listeners | 1,725 | 241 | ~7.2x |
| `setState`, 100 `subscribe()` listeners | 5,046 | 2,514 | ~2x |
| `setState` with `onStateChanged` + `computePreventStateChange` | 1,368 | 629 | ~2.2x |
| `setState` on a root with 10 `createSelectorHook` derived hooks | 15,832 | 908 | ~17x |
| action call → `setState` | 1,378 | 56 | ~25x |

**React 18 rendering (react-dom + jsdom)**

These rows time the whole update, including React's reconciliation and jsdom's DOM work, so the
library's share of the total is smaller than in the core rows.

| Scenario | Before | After | Change |
| --- | ---: | ---: | ---: |
| Update that re-renders 500 components | 1,558,654 | 1,111,157 | −29% |
| Update with 500 subscribed components, none re-render | 17,619 | 13,265 | −25% |
| Parent re-renders 500 children that call `use(selector, [deps])` | 1,705,270 | 1,276,412 | −25% |
| Mount + unmount 500 components | 5,055,825 | 4,579,054 | −9% |

Derived hooks gain the most in the core rows because each derived store paid the `setState`
overhead again for every root update.

## Changes

| # | Where | Change | Why it is equivalent |
| --- | --- | --- | --- |
| 1 | `setState` | The callback tools are built lazily, only when `computePreventStateChange` or an `onStateChanged` (config or extension class) will receive them. | If a callback is known before subscribers run, the tools are built at the same moment as before, so callbacks see the same snapshot. `computePreventStateChange` and `onStateChanged` still receive the **same** object. |
| 2 | `createStateChangeStoreTools` (new, module-private) | Builds those tools with a loop and defines `metadata` as a getter in place. Before, it spread the object and then converted a data property into an accessor. | Same own keys in the same order, same descriptors (enumerable, configurable), same values. Symbol keys are copied like a spread does, and the trailing `metadata` getter is kept when the source has none. |
| 3 | `use()` (every render) | `Object.assign({}, options)` plus two assignments instead of `{ ...options, selector, dependencies }`. | Same keys and values. `partialUpdateSubscription` is still called exactly once per render (a test counts this). |
| 4 | `reselectIfDependenciesChanged` | When both dependency lists are arrays, it calls `isEqualArray` directly. | For two arrays, `shallowCompare` always ends up in `isEqualArray`. Other values still go through `shallowCompare`. |
| 5 | `executeSetStateForSubscriber` | The default `isEqual` / `isEqualRoot` is one shared module-level function instead of a new arrow function per subscriber per update. | Same `===` semantics. |
| 6 | `getStateOrchestrator` | Removed the IIFE. | Same truthiness check, same return value. |

Left alone on purpose:

- Every protected or public method name and signature, because the DevTools monkey patch and
  subclasses rely on them.
- Live iteration over `subscribers` during notification, so subscribe/unsubscribe-while-notifying
  behaves exactly as before.
- The `({ state }, { identifier })` arguments to `onStoreChange`.

## How equivalence was verified

- **Repository suite.** With the Nx cache disabled, `yarn test` passed for all 8 projects,
  including `monkey_patch` (the shared suite under the DevTools patch). `yarn ts-check` and
  `yarn lint` passed for `universal`, `web` and `mobile`. No test was changed.
- **Differential testing.** The original and optimized builds ran the same 300 seeded random
  scenarios and their traces were compared byte for byte. Each scenario mixes setState (plain,
  functional, forced, with identifier), subscribe/unsubscribe (with and without selector, custom
  `isEqual`, `isEqualRoot`, `skipFirst`), actions, all four config callbacks (including prevention and
  `setMetadata` inside `onStateChanged`), metadata updates, `reset()` in both forms, `dispose()`,
  `createSelectorHook`, `createObservable`, and hook renders that change selector, deps and
  `isEqual`. The trace records every callback, value and subscriber count, the exact property
  layout of the tools passed to callbacks, and `partialUpdateSubscription` calls per render.
  Result: **0 differences in 300 seeds**.
- **The harness catches real changes.** A planted one-line change (dropping `identifier` from the
  callback tools) was caught in 5 of 5 seeds.
- **Type check.** `GlobalStore.ts` type-checks with strict settings, with the same result as the
  original.

## Pre-existing issue found (not fixed: behavior change, out of scope)

The `setState` passed in the tools to `computePreventStateChange` / `onStateChanged` is the
unbound `setActualStateWithoutValidations`, called with no options object. Calling
`tools.setState(x)` from inside those callbacks throws
`Cannot destructure property 'forceUpdate' of 'undefined'`. This happens on `master` too, and this
branch keeps it unchanged. A fix belongs in its own PR with a test.

## Not done: needs a decision

- **Raise the build target to `es2018`.** Object spread would become native and the helper cost
  would disappear everywhere, including one-off paths such as `subscribe()` and context creation.
  It also changes the syntax consumers' toolchains must parse; webpack 4's parser, for example,
  rejects object spread. This is a compatibility decision, not an internal one.
- **Web persistence.** Each `setState` on a store with `localStorage` serializes and writes
  synchronously. Batching or debouncing would be faster but changes when data reaches storage.

## Checklist before merging

Done (Nx cache disabled):

```bash
yarn test                    # all 8 projects, including monkey_patch
yarn ts-check universal      # also web, mobile
yarn lint universal          # also web, mobile
```

Not run yet:

```bash
yarn test:interop    # built dist under tsx / CJS / ESM
```
