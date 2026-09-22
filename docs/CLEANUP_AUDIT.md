# Cleanup and dead-code audit

Completed 22 September 2026. The approved cleanup is implemented. Existing Git-ignored
paths were excluded, including ignored files that are still tracked. All 16 required
videos remain unchanged in `public/`.

## 1. Obsolete artifacts removed

| Removed | Reason |
| --- | --- |
| Eight `apps/website/public/devtools/*-app.png` / `*-panel.png` images | The docs use the separate, retained `showcase/` image set. |
| `apps/website/src/data/devtools-shots.json`, `apps/website/scripts/capture-devtools.mjs` | Served the removed screenshot component. Removed `capture:devtools` and unused `.shot*` styles too; capture instructions now describe only the active showcase. |
| `apps/devtools/react-hooks-global-states-dev-tools.zip` | Generated release archive, not a build input. Added an ignore rule for future archives; the `zip` command remains available. |
| `apps/devtools/src/assets/react.svg` | Unreferenced scaffold image. |
| `apps/devtools/src/assets/original/monkey_icon.ico` | Unused historical artwork. The current icon generator uses the retained `public/icon.jpeg`. |
| `review.config.legacy.json` | Unused migration backup. Active Claude settings, permissions and budgets remain in `qa/settings.ts`; dormant provider presets were not activated. |

## 2. Dead modules removed

Reference checks found no live consumers for these 16 module files. The final dependency
scan found no remaining unreachable source modules from the inspected production and
development entry points.

| Removed | Evidence / replacement |
| --- | --- |
| `apps/devtools/src/lib/custom-easy-service-worker.ts` | Empty file; webpack uses `service_worker.ts`. |
| `apps/devtools/src/pages/main_tab/components/TabsContainer/tabs/ActionsTab/hooks/useGlobalStateActions.ts` | No imports or calls. |
| `apps/devtools/src/pages/main_tab/components/TabsContainer/tabs/LogsTab/RecordsCount/RecordsCount.tsx` and `RecordsCount/index.ts` | Only the unused barrel referenced the component. Active count markup remains in `ManualDomListShell.tsx`, including its unrelated CSS class. |
| `apps/devtools/src/pages/main_tab/components/TabsContainer/tabs/LogsTab/logs.ts` | Unused `logsTab$` context. |
| `apps/devtools/src/pages/main_tab/hooks/logsArray/updateLogArray.ts` | No imports or calls. |
| `apps/devtools/src/pages/main_tab/hooks/useMountRerender.ts` and `useForceRerender.ts` | Unused hook and its exclusive dependency. |
| `apps/devtools/src/pages/main_tab/hooks/useIsConnecting.ts` | Active connection behavior uses `pageConnection` and `pageDiagnosis`. |
| `apps/website/src/ui/DevToolsShot.tsx` | Replaced by the active `DevToolsShowcase.tsx`. |
| `apps/devtools/src/pages/main_tab/components/SelectedStateLabel/SelectedStateLabel.tsx` and `index.ts` | Unused component and barrel; removed its parent re-export. |
| `apps/devtools/src/shared/hooks/useDebounceEffect.ts`, `useDebounceValue.ts`, `useImmediateEffect.ts`, `useInitialEffect.ts` | No callers; removed their re-exports. The used `useDebounce` remains. |

### Unused members removed from retained modules

- `useActionsHeaders`, `selectHeaders` and `buildHeaders`; retained `ActionHeader`,
  `toHeader`, `mapGroupedToHeaders` and `isEqualRoot` for active log components.
- `useIsSelectedAction`; retained `useIsSelectedLog`.
- `getGlobalStatePaths`, `replaceGlobalStateIdAtPath` and `removeGlobalStatePath`;
  retained the live path-index and snapshot helpers.
- `loadMockStateIfDevelopment`; retained development preview, file import and reconciliation.
- `initialValueMock`, its duplicate commented declaration, and the now-unused
  `transformEntities` / `isEntityStructure` conversion helpers. Main fixtures remain.
- Uncalled DevTools `assertMonkeyPatchActionJson`; retained its schema, type and used predicate.

Published library exports and framework entry points were retained. Helpers used inside
their own module are not dead merely because they have no external imports.

## 3. Test cleanup and repairs

| Change | Coverage preserved or improved |
| --- | --- |
| Deleted `apps/devtools/src/__tests__/message-flow-integration.test.ts` (17 tests) | It never imported the message implementation; the real content-script and transport suites remain. |
| Renamed `end-to-end-workflows.test.ts` to `store-workflows.integration.test.ts` | Retained all seven store workflow tests and removed always-true assertions and step narration. |
| Removed fixed-clock duration assertions from `error-recovery-edge-cases.test.ts` and `monkey_patch.real-world.test.ts` | Large-state tests now verify registration, serialized payloads and forwarded updates; rapid-update state checks remain. |
| Removed/replaced vacuous array-length assertions in the monkey-patch suites | Preserved action counts, resulting state, parameter forwarding and serialization checks. |
| Consolidated `uniqueId.interop.test.ts` into `uniqueId.default.test.ts` | One source suite checks callable default/named exports, identity, prefixes and namespace shape. Built/packed interop scripts remain separate. |
| Repaired `sendMessageFromMonkeyPath.test.ts` | Direct `toThrow` replaces a catch block that swallowed assertion failures. Removed duplicate prefix tests, including a loop that ignored validation errors. |
| Repaired `HeroVideos.test.tsx` and `PreferencesDemo.test.tsx` | Awaited asynchronous updates; video server markup is actually rendered with `renderToString` and checked for absent sources. React `act` warnings are gone. |

The DevTools and debug action-type schemas now accept the four production enum values.
Removed the fabricated `async`, `action` and `callback` values and the associated `as any`
casts. Searches of producers and fixtures found those values only in test data; corrected
fixtures use the real enum, and rejection tests cover the unsupported strings. This tightens
validation of malformed action payloads; actual protocol action types are unchanged.

## 4. Code and documentation consolidated

- Replaced three identical `libs/{universal,web,mobile}/scripts/prepare-dist.ts` files
  with the shared TypeScript script `scripts/prepare-dist.ts`, executed through `tsx`.
  Updated package commands and Nx build inputs.
  The debug and code-review assembly scripts remain because their package layouts differ.
- Trimmed repeated packaging history from esbuild headers and documented the ESM/CJS
  layout in `ARCHITECTURE.md`.
- Removed comments that repeated assignments, returns or test steps. Preserved explanations
  of equality, action initialization order, metadata getters, subscriptions and cleanup.
- Made `docs/TESTING_GUIDE.md` the contributor reference for running and writing tests;
  architecture documentation retains the shared-suite and debug-patch design.

## 5. Retained because they are useful

- Every video in `public/`, including master, 1080p and agentic variants; posters and source artwork.
- The ten active DevTools showcase images, Open Graph cards, author portraits and current icons.
- Both extension icon filenames: the manifest and packaging reference them.
- Playground store-wiring smoke coverage, development fixtures, example tests, accessibility,
  hydration, storage, real transport and shared library regression suites.
- The working `libs/code-review` package and active `qa/` configuration.
- Package READMEs and LICENSE copies required by npm distribution. Shared README generation
  was not introduced: these files serve distinct publication surfaces.

## Validation

- DevTools: 346 tests passed; production build passed.
- Website: 128 tests passed; type check, lint and production build passed.
- Debug and shared variant suites: 1,779 tests passed with the patch and 1,779 without it.
- Universal, web, mobile and debug package builds passed; affected test type checks passed.
- Changed-file lint passed. Website links: 26 pages and 1,185 internal references checked.
- AST comparison confirmed that the core `GlobalStore.ts` and esbuild edits changed only comments.
- Hash comparison confirmed that all required public media and previously ignored tracked files
  were unchanged. No Git history rewriting was performed.
