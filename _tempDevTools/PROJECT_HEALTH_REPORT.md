# Project Health Report

> Branch: `advances-spliting-state-and-actions-` — 9 commits ahead of `main`  
> Date: 18 April 2026  
> Baseline established by: TypeScript check, ESLint, full production build

---

## Executive Summary

| Check                                | Status      | Notes                                           |
| ------------------------------------ | ----------- | ----------------------------------------------- |
| `tsc --noEmit` (root tsconfig)       | ✅ PASS     | After fixes                                     |
| `tsc -b` (tsconfig.app.json, strict) | ✅ PASS     | After fixes                                     |
| ESLint                               | ✅ PASS     | 0 errors, 0 warnings after `lint --fix`         |
| `build:monkey_patch` (webpack)       | ✅ PASS     |                                                 |
| `build:lib` (webpack)                | ✅ PASS     |                                                 |
| `build:vite` (tsc -b + vite)         | ✅ PASS     | After fixes                                     |
| Full `yarn build`                    | ✅ PASS     | All 3 targets exit 0                            |
| Unit tests                           | ❌ NO TESTS | No test files, no `test` script in package.json |

---

## Bugs Fixed During This Session

### 1. `localStorage` removed from TypeScript type but not from code/schema

**Files affected:**

- `src/shared/schema/GlobalStateJson.ts` — `localStorage` was commented out of the `GlobalStateJson` type but all consumers still referenced it
- `src/pages/main_tab/hooks/globalStates/useGlobalStates.utils.ts` — destructured and re-assigned `localStorage` from `GlobalStateMetaExtended`
- `src/pages/main_tab/components/GlobalStateList/GlobalStateItem/GlobalStateItem.tsx` — reads `stateMeta?.localStorage?.key`
- `src/lib/monkey_patch/monkey_patch.utils.ts` — object literal missing `localStorage` field

**Fix:** Restored `localStorage: LocalStorageJson | null` to the `GlobalStateJson` TypeScript type and added `localStorage: null` to `monkey_patch.utils.ts` (the full feature is still commented-out there pending future work).

---

### 2. Wrong branded ID type for `ActionLogJson.logId`

**File:** `src/pages/main_tab/hooks/globalStates/globalStates.ts:62`

`uniqueId('log:')` returns `BrandedId<"log:">` but `ActionLogJson.logId` is `ActionLogId = BrandedId<"action-log:">`.

**Fix:** Replaced `uniqueId('log:')` with `generateActionLogId()` (imported from `ActionLogJson.ts`).

---

### 3. Missing required `scope` field on synthetic init log

**File:** `src/pages/main_tab/hooks/globalStates/globalStates.ts`

The `firstLog: ActionLogJson` object literal was missing the required `scope: string` field (added to `ActionLogJson` in this branch). This was hidden by the stale `.tsbuildinfo` cache.

**Fix:** Added `scope: 'lifecycle'` to the synthetic init log.

---

### 4. `import './vite-env'` importing a `.d.ts` file as a module

**File:** `src/index.tsx`

TypeScript ignores this (declaration files have no runtime value), but rollup/vite cannot resolve `.d.ts` files as JavaScript modules, causing a build crash.

**Fix:** Removed the erroneous import. The `vite-env.d.ts` file is automatically picked up by TypeScript via `tsconfig.app.json`.

---

### 5. `dist/assets/` directory not created before icon copy

**File:** `vite.config.ts`

The `closeBundle` plugin hook tried to `copyFileSync` icon files to `dist/assets/` before that directory existed (vite only creates it when hashed JS assets are emitted there, which doesn't always happen for small builds).

**Fix:** Added `fs.mkdirSync('dist/assets', { recursive: true })` before the copy loop.

---

## Root Cause: Two tsconfig setups with different strictness

The root `tsconfig.json` has `"files": []` — running `tsc --noEmit` on it checks **nothing**. Only `tsc -b` (used by `build:vite`) activates `tsconfig.app.json` which has `strict: true`, `noUnusedLocals`, `noUnusedParameters`. This is why 4 type errors were silently present and only surfaced during the build.

**Recommendation:** Add a `vitest` or at minimum a pre-commit hook that runs `tsc -b` instead of `tsc --noEmit`, or fix the root tsconfig to point at the correct files.

---

## Potential Smells & Risk Areas

### HIGH — Schema/Type Mismatch: `scope` field

|                                       |                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **TypeScript type** `ActionLogJson`   | has `scope: string` (required)                                                             |
| **JSON schema** `actionLogJsonSchema` | does NOT have `scope` in `properties` or `required`, and has `additionalProperties: false` |

**Risk:** Any `ActionLogJson` object that includes `scope` (all of them, since `monkey_patch.logger.ts` sets it) will **fail runtime schema validation** (`assertActionLogJson` / `isActionLogJson`) because `additionalProperties: false` rejects unknown properties. This is a type-correct-but-runtime-broken situation. Either add `scope` to the schema or remove it from the type.

---

### HIGH — No tests whatsoever

- Zero `.test.ts` / `.spec.ts` files found
- No `test` script in `package.json` (`yarn test` errors with "Command not found")
- The 9-commit branch made ~3,000 line changes across 100+ files with zero test coverage

**Risk:** Regressions across the entire change set are invisible. The mock file `useGlobalStates.mocks.ts` lost ~960 lines in commit `f0a7d74`, which may mean the mock data no longer matches the real data shape.

---

### MEDIUM — `localStorage` feature is half-removed

The `localStorage` integration (syncing global state with browser localStorage) is in a limbo state:

- TypeScript type now includes it again (restored by fix above)
- JSON schema `required` array still includes `localStorage`
- `monkey_patch.utils.ts` has the entire feature commented out and hardcodes `localStorage: null`
- `GlobalStateItem.tsx` still reads `localStorage?.key` to display a badge

**Risk:** The monkey_patch sends `localStorage: null` for all states. States that have real localStorage configuration in the target app will lose that metadata in the devtools. The UI badge for localStorage states will never show.

---

### MEDIUM — `tsconfig.app.tsbuildinfo` committed to git

The incremental TypeScript build cache is committed to the repository. This caused real type errors (`scope` missing, stale `logId` type) to be silently hidden from the build until the cache was manually deleted.

**Recommendation:** Add `*.tsbuildinfo` to `.gitignore`.

---

### MEDIUM — TypeScript version unsupported by `@typescript-eslint`

`typescript@5.9.3` is used, but `@typescript-eslint/typescript-estree` officially supports only up to `5.5.x`. ESLint prints a warning on every run. This may cause false positives or silent misses in lint rules.

**Recommendation:** Pin `typescript` to `~5.5.x` or update `typescript-eslint` to a version that supports 5.9.x.

---

### MEDIUM — `baseUrl` deprecated in TypeScript 7.0

`tsconfig.app.json` uses `"baseUrl": "."`. TS 5.9 already warns about this. Since `paths` aliases are used (`@src/*`), this should be migrated to use only `paths` without `baseUrl`, or silence it with `"ignoreDeprecations": "6.0"`.

---

### LOW — `react-json-view` incompatible with React 19

`react-json-view@1.21.3` declares peer dependency `react@^15 || ^16 || ^17`. The project now uses React 19. Yarn warns on install. The package may break at any point without an update.

**Recommendation:** Evaluate replacing with a maintained alternative (e.g., `@uiw/react-json-view`, or the built-in `JsonViewer` component already in this codebase).

---

### LOW — Large bundle (~938 KB minified)

The main JS chunk is 938 KB (293 KB gzip). The vite build itself warns about this. With React 19, code-mirror, react-json-view, and react-icons all bundled together this is expected but worth tracking.

**Recommendation:** Use dynamic `import()` for heavy tabs (LogsTab, ActionsTab) or configure `manualChunks` in rollup options.

---

### LOW — `.ts` extension imports in source files

`src/index.tsx` imports:

```ts
import { initialValueMock } from './pages/main_tab/hooks/globalStates/useGlobalStates.mocks.ts';
import mainTab$ from './pages/main_tab/context/mainTabContext.ts';
```

Explicit `.ts` extensions work with vite (`allowImportingTsExtensions: true`) but are non-standard and will not work with tsc emit or other bundlers.

---

### LOW — Dual build pipeline complexity

The project has 3 separate build targets running in parallel:

- `webpack` for the content script / devtools page (CJS, no React)
- `webpack` for the monkey_patch (CJS, no React)
- `vite` for the UI

Each has its own TypeScript config, resolution, and module format. Changes to shared code must be verified across all 3. Currently only `build:vite` does strict type checking via `tsc -b`.

---

## Commit-by-Commit Risk Assessment (9 commits vs main)

| Commit    | Description                                                           | Risk Level | Notes                                                                                                                                                  |
| --------- | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cf94331` | Adding zip to .gitignore, new ActionsTab filter, CodeEditor for state | 🟡 Medium  | Large feature addition (ActionsTab ActionsFilter, StateTab CodeEditor), deleted `useStableState.ts`                                                    |
| `f0a7d74` | Various fixes and design changes                                      | 🔴 High    | 53 files, ~1900 lines deleted. `useLogsArray` refactored into separate files. Deleted `data.ts`, added `softClone.ts`. Mock data massively reduced     |
| `657202a` | Adding restore option for last state of action                        | 🟡 Medium  | New dropdown menu in LogListItem, touches ActionLogListItem                                                                                            |
| `11cda4c` | Update manifest.json                                                  | 🟢 Low     | Manifest version bump                                                                                                                                  |
| `6bc3410` | Context types fixes                                                   | 🟢 Low     | Only `package.json` and `yarn.lock` changes                                                                                                            |
| `1dd3f2c` | Fixes                                                                 | 🟡 Medium  | StateViewer reworked, JsonViewer and CompareJsonValues adjusted                                                                                        |
| `800e19a` | Adding `vite-plugin-checker` for TS validation at compile time        | 🟢 Low     | Config only                                                                                                                                            |
| `4bbfd1d` | Refactor — working correctly with mock data                           | 🔴 High    | 102 files changed. Hooks renamed (drop `use` prefix), contexts restructured, `useActionsContext.ts` → `actionsContext.ts`, many hook files reorganized |
| `529118b` | Refinements                                                           | 🔴 High    | Massive `monkey_patch.ts` and `monkey_patch.logger.ts` rewrite (656 + 596 lines), type changes in `monkey_patch.types.ts`                              |

---

## Recommended Next Steps (before refactoring)

1. **Fix the `scope` schema mismatch** — add `scope` to `actionLogJsonSchema.properties` and `required`, or make it optional in the TypeScript type.
2. **Add `*.tsbuildinfo` to `.gitignore`**.
3. **Add a `test` script** and at minimum smoke tests for the core data transformations (`getLogArray`, `cloneRootState`, `mergeState`, `EntityAdapter`).
4. **Resolve the `localStorage` half-removal** — either fully remove it (update schema, remove UI badge) or fully restore it (restore `monkey_patch.utils.ts` logic).
5. **Replace `tsc --noEmit` in `ts-check` script with `tsc -b`** so the stricter check is the default.
