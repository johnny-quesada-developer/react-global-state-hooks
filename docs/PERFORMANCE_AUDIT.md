# Performance audit: `audit-rgsh`

Scope: the core in `libs/universal/src` (`GlobalStore`), which `web` and `mobile` extend.
Constraints: no public API change, no unit test change, no behavior change, code kept linear.

## Summary

All changes are in `libs/universal/src/GlobalStore.ts`, so `web` and `mobile` pick them up too.
The hot paths were dominated by two things that never show up in the TypeScript source:

1. **`setState` built a throwaway object on every call.** It copied `storeTools`, merged in the state
   change and redefined `metadata` as a getter, even when no callback was there to receive it.
   That one object was ~95% of the cost of a `setState` with no subscribers.
2. **Object spread compiles to slow helpers.** The packages build with `target: es2017`, and object
   spread is ES2018, so esbuild emits `__spreadValues` / `__spreadProps` helpers. These walk property
   descriptors. The `{ ...options, selector, dependencies }` in `use()` ran on every render and was
   about 2/3 of the hook's own per-render cost.

## Results

Each implementation was built with the same esbuild settings as `libs/universal/esbuild.config.ts`
(bundle, `es2017`, minified, ESM). Each ran in its own Node 22 process: median of 7 rounds, ns per
operation, lower is better. The hook rows use a stub React runtime, so they time only the library's
own per-render work, not React's.

| Scenario | Before | After | Speedup |
| --- | ---: | ---: | ---: |
| `setState`, 0 subscribers | 1,544 | 17 | ~94x |
| `setState`, 10 `subscribe()` listeners | 1,943 | 298 | ~6.5x |
| `setState`, 100 `subscribe()` listeners | 5,679 | 3,360 | ~1.7x |
| `setState`, 100 hook subscriptions, selection unchanged | 3,733 | 816 | ~4.6x |
| `setState` with `onStateChanged` + `computePreventStateChange` | 1,576 | 843 | ~1.9x |
| `setState` on a root with 10 `createSelectorHook` derived hooks | 18,066 | 1,022 | ~18x |
| action call → `setState` | 1,388 | 62 | ~22x |
| render: `use()` | 838 | 122 | ~6.9x |
| render: `use(selector)` | 842 | 143 | ~5.9x |
| render: `use(selector, [inline deps])` | 770 | 132 | ~5.8x |
| render: `use(selector, { isEqual, dependencies })` | 898 | 128 | ~7x |

Derived hooks gain the most because each derived store paid the `setState` overhead again for
every root update.

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

The repository's own suite (`yarn test`) could **not** be run in the audit environment:
dependencies are not installed on this machine and the package registry was unreachable.
Run it before merging (see the checklist below). In its place:

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

```bash
yarn install
yarn test            # universal, web, mobile (shared suite runs against each)
yarn nx run monkey_patch:test   # shared suite under the DevTools patch
yarn ts-check
yarn lint
yarn test:interop    # built dist under tsx / CJS / ESM
```
