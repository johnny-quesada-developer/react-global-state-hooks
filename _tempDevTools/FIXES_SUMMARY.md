# Project Fixes Summary

> Last Updated: 18 April 2026
> Status: ✅ Build, TypeScript, and Linter all passing

## Fixes Completed

### 🔴 Critical Issues - FIXED

| Issue                               | Status   | Details                                                                   |
| ----------------------------------- | -------- | ------------------------------------------------------------------------- |
| **ActionLogJson schema mismatch**   | ✅ FIXED | Added `scope` field to JSON schema properties and required array          |
| **localStorage type inconsistency** | ✅ FIXED | Restored `localStorage: LocalStorageJson \| null` to GlobalStateJson type |
| **Wrong brandedId for logId**       | ✅ FIXED | Changed `uniqueId('log:')` → `generateActionLogId()`                      |
| **Missing scope on init log**       | ✅ FIXED | Added `scope: 'lifecycle'` to synthetic ActionLogJson                     |
| **Chrome namespace not found**      | ✅ FIXED | Added `"types": ["chrome"]` to tsconfig.app.json                          |

### 🟡 Configuration Issues - FIXED

| Issue                                  | Status   | Details                                                             |
| -------------------------------------- | -------- | ------------------------------------------------------------------- |
| **.tsbuildinfo committed to git**      | ✅ FIXED | Added `*.tsbuildinfo` to .gitignore                                 |
| **ts-check checking nothing**          | ✅ FIXED | Changed from `tsc --noEmit` to `tsc -b` for strict checking         |
| **TypeScript version incompatibility** | ✅ FIXED | Pinned typescript to ~5.5.4 (fully supported by @typescript-eslint) |
| **typescript-eslint version**          | ✅ FIXED | Updated to ^8.14.0 to match TypeScript 5.5.4                        |
| **vite.config.ts missing assets dir**  | ✅ FIXED | Added `fs.mkdirSync('dist/assets', { recursive: true })`            |
| **vite-env import as module**          | ✅ FIXED | Already commented out in src/index.tsx                              |

### 🟢 Testing Infrastructure - ADDED

| Component         | Status   | Details                                          |
| ----------------- | -------- | ------------------------------------------------ |
| **vitest setup**  | ✅ ADDED | Configured vitest with node environment          |
| **vitest config** | ✅ ADDED | Created vitest.config.ts with alias support      |
| **Unit tests**    | ✅ ADDED | 17 tests created (12 passing, 5 need refinement) |
| **Test script**   | ✅ ADDED | `yarn test` command added to package.json        |

## Current Build Status

```
✅ yarn ts-check          → tsc -b PASS (0 errors)
✅ yarn lint              → eslint PASS (0 errors)
✅ yarn build:monkey_patch → webpack PASS
✅ yarn build:lib         → webpack PASS
✅ yarn build:vite        → vite PASS
✅ yarn build             → Full build PASS (all 3 targets exit 0)
✅ yarn test run          → vitest 12/17 passing
```

## Breaking Changes - None Detected

No breaking changes to the public API. All changes are internal fixes and infrastructure improvements.

## Remaining Medium-Priority Items

1. **localStorage feature** - Currently sends `null` for all states (feature on hold)
2. **Full test coverage** - 5 ActionLogJson/softClone tests need debugging
3. **react-json-view** - Peer dependency incompatible with React 19 (works but not ideal)
4. **Bundle size** - 938KB (expected for web extension with all dependencies)

## File Changes Made

### Fixed files:

- `src/shared/schema/ActionLogJson.ts` - Added scope to schema
- `src/shared/schema/GlobalStateJson.ts` - Restored localStorage type
- `src/pages/main_tab/hooks/globalStates/globalStates.ts` - Fixed logId and added scope
- `src/lib/monkey_patch/monkey_patch.utils.ts` - Added localStorage: null
- `src/lib/vite.config.ts` - Added directory creation before file copy
- `tsconfig.app.json` - Added Chrome types
- `tsconfig.json` - Reverted to `"files": []` (project references)
- `package.json` - Updated script, versions, added jsdom and vitest setup
- `.gitignore` - Added \*.tsbuildinfo
- `vitest.setup.ts` - Simplified for core logic testing
- **New files**:
  - `vitest.config.ts` - Test configuration
  - `src/shared/tools/__tests__/EntityAdapter.test.ts` - Core data structure tests
  - `src/shared/tools/__tests__/softClone.test.ts` - Clone utility tests
  - `src/shared/schema/__tests__/ActionLogJson.test.ts` - Schema validation tests
