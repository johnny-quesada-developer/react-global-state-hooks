# Architecture

This repository is an [Nx](https://nx.dev) monorepo that hosts the `react-global-state-hooks`
family of packages. All packages share a single root `node_modules`, one set of tooling
(TypeScript, ESLint, Prettier, esbuild, Jest), and a common `tsconfig.base.json`.

> The root `README.md` is the published `react-global-state-hooks` (web) library documentation.
> This file documents the repo/monorepo itself and is not part of any published package.

## Packages

| Project     | Path             | Published name              | Role                                               |
| ----------- | ---------------- | --------------------------- | -------------------------------------------------- |
| `universal` | `libs/universal` | `react-hooks-global-states`        | Base library. Framework-agnostic core.                       |
| `web`       | `libs/web`       | `react-global-state-hooks`         | Web bindings. Re-exports/extends the base library.           |
| `mobile`    | `libs/mobile`    | `react-native-global-state-hooks`  | React Native bindings (async-storage). Extends the base lib. |

All three packages build with **esbuild** into `dist/` as a clean dual ESM/CJS + `.d.ts` bundle
(no UMD), via each package's `esbuild.config.ts` + `tsconfig.build.json` + `scripts/prepare-dist.ts`.

Each package keeps its own `package.json`, `README.md`, and build/test configuration. The
per-package README is what gets published to npm (copied into `dist/` by
`scripts/prepare-dist.ts`).

## Shared vs. per-project configuration

Shared, at the repo root:

- `tsconfig.base.json` — common compiler options; every project's `tsconfig.json` extends it.
- `eslint.config.mts` — one flat ESLint config applied workspace-wide.
- `.prettierrc` — formatting.
- `nx.json` — task defaults, caching, and named inputs.
- `scripts/run.mjs` — the target-aware task dispatcher.

Per project, under `libs/<project>/`:

- `package.json` (name, version, `exports`, runtime deps, publish scripts).
- `tsconfig.json` / `tsconfig.build.json` / `__test__/tsconfig.json`.
- `jest.config.js`, `jestSetup.ts`, `esbuild.config.ts`, `scripts/`.
- `project.json` — Nx targets (delegate to the package's own `yarn` scripts).

### Tooling note: jest core 29 + jest-environment-jsdom 30 (intentional)

The root pins `jest@^29.7.0` with `jest-environment-jsdom@^30.0.4`. This version pairing looks
like a mismatch but is **intentional and required** — do NOT "align" the jsdom environment down
to `^29`. Under jest core 29, `jest-environment-jsdom@29` fails to run the `web` and `universal`
suites, while `30` works for all three packages. Downgrading it reintroduces those failures.

## Running tasks

Root scripts are thin, target-aware wrappers. Pass the project name as the argument:

```bash
yarn test web            # build + type-check + jest against the built dist/ (web)
yarn test:src universal  # jest against the TypeScript source (no build) — base lib
yarn build web           # build a single project
yarn lint universal
yarn test                # run a task across every project (nx run-many)
yarn coverage            # combined coverage report across all variants (src mode)
yarn coverage web        # coverage for one variant; add --dist to measure the built artifact
yarn graph               # open the Nx project graph
```

`yarn coverage` (see `scripts/coverage-report.mjs`) runs each variant's jest with coverage and
prints one combined table plus a weighted total. It measures the TypeScript source by default
(coverage on the minified `dist` bundle is not meaningful); pass `--dist` to measure the built
artifact.

Each wrapper dispatches to `nx run <project>:<task>` (see `scripts/run.mjs`). New libs under
`libs/*` are discovered automatically — no change to the dispatcher needed.

Both test modes are preserved per package:

- default (`yarn test <project>`) runs against the compiled `dist/` artifact, so build-level
  concerns (minification, dual ESM/CJS emit, `__esModule` interop) are exercised.
- `TEST_TARGET=src` (`yarn test:src <project>`) runs against `src/` for a fast inner loop.

## Shared test suite (`libs/shared-tests`)

Roughly 90% of behavior is identical across the variants — only the persistence layer differs
(universal has none, web uses `localStorage`, mobile uses async storage). To avoid duplicating
those tests per variant, the common suite lives once in `libs/shared-tests` (a plain,
non-published folder — not an Nx project, it has no build/test target of its own).

How it works (there is no loop): the shared files are run by **each variant's own jest**, and
module resolution — not a runner — is what swaps in the variant. Running `yarn test <variant>`
is three independent jest runs at most; the exact same shared file resolves to a different real
source depending on which variant's config is active:

```
yarn test universal  ->  global-state-hooks-under-test  ->  libs/universal/src
yarn test web        ->  global-state-hooks-under-test  ->  libs/web/src
yarn test mobile     ->  global-state-hooks-under-test  ->  libs/mobile/src
```

Think of it as dependency injection: the shared tests declare "I need *a* global-state-hooks
implementation" and each variant's jest config injects its own.

- **Neutral subject alias.** Shared tests import the package under test as
  `global-state-hooks-under-test` (bare and subpaths) — never a real package name. Each
  variant's `jest.config.js` `moduleNameMapper` maps that alias to itself (its own barrel /
  subpaths, honoring `TEST_TARGET`), and each variant's `__test__/tsconfig.json` maps it to its
  own `src` for type-checking. (Verified: a `require.resolve` probe inside a shared test returns
  `libs/<variant>/src/index.ts` for the variant being run.)
- **roots.** Each variant's `jest.config.js` sets `roots: ['<rootDir>/__test__',
  '<rootDir>/../shared-tests']`, so a run executes the variant's own (persistence-specific)
  tests plus the shared suite.
- **Linting.** `libs/shared-tests` is linted by the `universal` project
  (`eslint . ../shared-tests`), and the root `eslint.config.mts` scopes
  `@typescript-eslint/no-empty-object-type: off` to both `libs/universal/**` and
  `libs/shared-tests/**`.

Opting out of individual shared files: a variant can skip shared files it isn't compatible with
via `testPathIgnorePatterns` (regex fragments like `shared-tests/<name>\.test\.tsx?$`).

**Current variant status**

All three variants — `universal`, `web`, and `mobile` — run the **entire** shared suite with no
exclusions. Making `mobile` pass the full suite required two kinds of change, both preserving
behavior:

- **Mobile type alignment to v16.** `mobile`'s `createGlobalState`/`GlobalStore` now accept lazy
  initializers (`state: State | (() => State)`, `metadata: Metadata | (() => Metadata)`), its
  `StoreTools` exposes the `readonly metadata` getter (with `getMetadata()` kept as deprecated),
  and its action overloads use the base's loose `GlobalStoreCallbacks<Any, AnyActions, Any>` so
  state literals widen the way the base does.
- **Variant-aware metadata assertions.** Metadata is asserted with the shared
  `expectMetadata(received).toMatch(expected)` helper (`libs/shared-tests/expectMetadata.ts`)
  instead of a raw `toEqual`. It is an EXACT match for variants that add nothing, but tolerates a
  variant's declared reserved metadata keys as allowed extras — so it stays strict (unexpected
  keys still fail) while accommodating the react-native variant, which injects
  `isAsyncStorageReady` / `asyncStorageKey` into every store's metadata. Each variant declares its
  reserved keys from its `jestSetup.ts`:

  ```ts
  // mobile/jestSetup.ts
  globalThis.__VARIANT_METADATA_KEYS__ = ['isAsyncStorageReady', 'asyncStorageKey'];
  // universal / web
  globalThis.__VARIANT_METADATA_KEYS__ = [];
  ```

  The helper runs a single underlying `expect().toEqual()` (it strips only the reserved keys the
  test didn't explicitly expect), so `expect.assertions(n)` counts are unaffected. A couple of
  example metadata keys in the tests were renamed to neutral names to avoid colliding with a
  variant's reserved fields.

The `testPathIgnorePatterns` opt-out mechanism still exists for a future variant that can't pass
a given shared file yet, but no variant currently uses it.

Adding a shared test: put it in `libs/shared-tests`, import via
`global-state-hooks-under-test`, assert metadata with `expectMetadata(...).toMatch(...)` (so
metadata-augmenting variants stay compatible without weakening the check), and confirm it passes
for every variant.

## Monorepo linkage (why `web` depends on `universal` locally)

`web` declares a normal npm dependency on the base library:

```jsonc
// libs/web/package.json
"dependencies": {
  "react-hooks-global-states": "^16.0.2"
}
```

Because `libs/universal` is a workspace package literally named `react-hooks-global-states`
at a version that satisfies that range, **Yarn links `node_modules/react-hooks-global-states`
to `libs/universal` via a symlink instead of downloading the registry tarball.**

Consequences worth knowing:

- **The registry entry for `react-hooks-global-states` is absent from `yarn.lock`.** This is
  expected — the dependency is satisfied by the local workspace, not the npm registry. Do not
  re-add a registry pin.
- **Locally, `web` builds and tests against the base source in `libs/universal`.** A change in
  the base library is picked up immediately, with no publish/reinstall cycle. Nx infers the
  `web → universal` dependency from the `package.json` dependency and builds `universal` first
  (`universal:build → web:build → web:test`).
- **At publish time nothing changes for consumers.** `web`'s published `package.json` still
  declares `react-hooks-global-states: ^16.0.2`, so installing `react-global-state-hooks` from
  npm pulls the published base package as usual. The workspace link only affects development
  inside this repo.
- Because of this, keep the base library's published version in sync with what `web` is built
  and tested against before releasing.

The local resolution is bridged in two spots so both type-checking and test runtime find the
base package without relying on its built root-level `exports`:

- `libs/web/tsconfig.json` and `libs/web/__test__/tsconfig.json` map
  `react-hooks-global-states` → `../universal/src` (type-checking).
- `libs/web/jest.config.js` maps it → `../universal/dist/*.cjs` (dist mode) or
  `../universal/src` (src mode), matching the selected `TEST_TARGET`.

### mobile and the base package

`mobile` depends on the base library at `react-hooks-global-states@^16.0.0`, which the workspace
`universal` (v16.0.2) satisfies, so Yarn links it locally exactly like `web` — a change in
`universal` is picked up immediately, and Nx builds `universal` first
(`universal:build → mobile:build → mobile:test`).

The tsconfig/jest bridges are identical in spirit to `web`'s:

- `libs/mobile/tsconfig.json` and `libs/mobile/__test__/tsconfig.json` map
  `react-hooks-global-states` → `../universal/src` (type-checking).
- `libs/mobile/jest.config.js` maps it → `../universal/dist/*.cjs` (dist mode) or
  `../universal/src` (src mode), matching the selected `TEST_TARGET`.

Making this work required aligning `mobile` to strict null checking: `mobile`'s tsconfig now uses
`strictNullChecks: true` with `lib: ["ES2017", "DOM"]` (previously `false` / `es2016`), because
`universal`'s source is authored under strict null checks and cannot be type-checked under looser
settings. A few small, behavior-preserving null-safety edits in `libs/mobile/src`
(`asyncStorageWrapper.ts`, `GlobalStore.ts`) were needed to satisfy the stricter check.

## Adding a new library

1. Create `libs/<name>/` with its own `package.json`, `tsconfig.json` (extending
   `../../tsconfig.base.json`), build/test config, and `src/`.
2. Add `libs/<name>/project.json` with `"name": "<name>"` and the target set (mirror an
   existing project).
3. If it depends on another workspace package, declare that dependency in its `package.json`;
   Nx will infer the build order. If it consumes a package by its published `exports`, add the
   same tsconfig `paths` + jest `moduleNameMapper` bridges shown above.
4. `yarn install`, then `yarn test <name>`.
