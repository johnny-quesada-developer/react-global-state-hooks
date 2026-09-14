# Architecture

This repository is an [Nx](https://nx.dev) monorepo that hosts the `react-global-state-hooks`
family of packages. All packages share a single root `node_modules`, one set of tooling
(TypeScript, ESLint, Prettier, esbuild, Vitest), and a common `tsconfig.base.json`.

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
- `vitest.config.ts`, `vitest.setup.ts`, `esbuild.config.ts`, `scripts/`.
- `project.json` — Nx targets (delegate to the package's own `yarn` scripts).

### Test runner: Vitest (jsdom)

Every package uses [Vitest](https://vitest.dev) with the `jsdom` environment and `globals: true`
(so `describe` / `it` / `expect` / `vi` are ambient). The root pins a single `vitest`,
`@vitest/coverage-v8`, and `jsdom`. There is no Jest, `ts-jest`, or `jest-environment-jsdom` — a
prior migration removed them entirely.

Type-checking the tests is a separate step from running them: each package's `test` script is
`yarn ts-check:tests && vitest run`, where `ts-check:tests` runs `tsc -p __test__/tsconfig.json
--noEmit`. Because the base `tsconfig` restricts `typeRoots` to `@types` (which does not contain
Vitest's package), each `__test__/tsconfig.json` widens `typeRoots` to include plain
`node_modules` and sets `module: esnext` + `moduleResolution: bundler` so TS can read Vitest's
`exports` map and resolve the `vitest/globals` types. These test-only overrides never affect the
build (`ts-check:tests` is `--noEmit`).

## Running tasks

Root scripts are thin, target-aware wrappers. Pass the project name as the argument:

```bash
yarn test web            # type-check + vitest against the TypeScript source (web)
yarn test universal      # type-check + vitest against the source — base lib
yarn build web           # build a single project
yarn lint universal
yarn test                # run a task across every project (nx run-many)
yarn coverage            # combined coverage report across all variants (src)
yarn coverage web        # coverage for one variant
yarn graph               # open the Nx project graph
```

Tests run against the TypeScript **source** (see below), so `yarn test` does not build first —
the Nx `test` target has no `dependsOn: ["build"]`. Built-artifact / CJS-shape correctness is
covered separately by each publishable lib's `yarn test:interop` (`tsx scripts/test-interop.ts`
against the built `dist/`).

`yarn coverage` (see `scripts/coverage-report.mjs`) runs each variant's Vitest with coverage and
prints one combined table plus a weighted total, measuring the TypeScript source (coverage on
the minified `dist` bundle is not meaningful).

## Producing and inspecting publishable packages

```bash
yarn prepare-packages     # build every lib -> publish-ready libs/<lib>/dist
yarn tarball              # build + `npm pack` each lib into artifacts/, with a contents report
yarn tarball web          # a single lib
```

- **`yarn prepare-packages`** runs `build` across all libs (via the dispatcher, so `universal`
  builds first). Each lib's `dist/` ends up publish-ready: a flattened `package.json` (dev-only
  fields stripped, paths pointing next to the emitted files) plus the dual `.mjs`/`.cjs`/`.js`
  bundles and `.d.ts` declarations. `scripts/prepare-dist.ts` per lib does the flattening.
- **`yarn tarball`** (see `scripts/tarball.mjs`) builds each lib, runs `npm pack` from its
  `dist/`, writes the `.tgz` into `artifacts/` (gitignored), and prints, per package: the npm
  `name@version`, tarball path, file count, unpacked size, and the full file list — i.e. the exact
  set of files npm would upload. Use it to review a package before `yarn publish:pkg <lib>`.

> Naming note: the script is `prepare-packages`, not `prepare`. `prepare` is a reserved
> npm/yarn lifecycle name that auto-runs on every `yarn install` (and before publish); using it
> for a full monorepo build would fire on every install. Publish scripts (`publish:pkg`) already
> run `yarn build` themselves, so the build still happens before an actual publish.

Each wrapper dispatches to `nx run <project>:<task>` (see `scripts/run.mjs`). New libs under
`libs/*` are discovered automatically — no change to the dispatcher needed.

Tests run against the TypeScript `src/` of each package (Vitest's `resolve.alias` maps the
package-under-test and the base package to their `src`). This keeps the inner loop fast and lets
the `useSyncExternalStore` spy intercept React correctly (a bundled `dist` breaks that
interception). Build-level concerns — minification, dual ESM/CJS emit, `__esModule` interop —
are exercised separately by `yarn test:interop <project>`, which runs `scripts/test-interop.ts`
against the built `dist/` artifact.

## Shared test suite (`libs/shared-tests`)

Roughly 90% of behavior is identical across the variants — only the persistence layer differs
(universal has none, web uses `localStorage`, mobile uses async storage). To avoid duplicating
those tests per variant, the common suite lives once in `libs/shared-tests` (a plain,
non-published folder — not an Nx project, it has no build/test target of its own).

How it works (there is no loop): the shared files are run by **each variant's own Vitest**, and
module resolution — not a runner — is what swaps in the variant. Running `yarn test <variant>`
is three independent Vitest runs at most; the exact same shared file resolves to a different real
source depending on which variant's config is active:

```
yarn test universal  ->  global-state-hooks-under-test  ->  libs/universal/src
yarn test web        ->  global-state-hooks-under-test  ->  libs/web/src
yarn test mobile     ->  global-state-hooks-under-test  ->  libs/mobile/src
```

Think of it as dependency injection: the shared tests declare "I need *a* global-state-hooks
implementation" and each variant's Vitest config injects its own.

- **Neutral subject alias.** Shared tests import the package under test as
  `global-state-hooks-under-test` (bare and subpaths) — never a real package name. Each
  variant's `vitest.config.ts` `resolve.alias` maps that alias to its own `src` (barrel and
  subpaths), and each variant's `__test__/tsconfig.json` maps it to the same `src` for
  type-checking.
- **include.** Each variant's `vitest.config.ts` sets
  `include: ['__test__/**/*.{test,spec}.{ts,tsx}', '../shared-tests/**/*.{test,spec}.{ts,tsx}']`,
  so a run executes the variant's own (persistence-specific) tests plus the shared suite.
- **Linting.** `libs/shared-tests` is linted by the `universal` project
  (`eslint . ../shared-tests`), and the root `eslint.config.mts` scopes
  `@typescript-eslint/no-empty-object-type: off` to both `libs/universal/**` and
  `libs/shared-tests/**`.

Opting out of individual shared files: a variant can skip shared files it isn't compatible with
via its `vitest.config.ts` `test.exclude` (glob fragments like
`../shared-tests/<name>.test.tsx`).

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
  reserved keys from its `vitest.setup.ts`:

  ```ts
  // mobile/vitest.setup.ts
  globalThis.__VARIANT_METADATA_KEYS__ = ['isAsyncStorageReady', 'asyncStorageKey'];
  // universal / web
  globalThis.__VARIANT_METADATA_KEYS__ = [];
  ```

  The helper runs a single underlying `expect().toEqual()` (it strips only the reserved keys the
  test didn't explicitly expect), so `expect.assertions(n)` counts are unaffected. A couple of
  example metadata keys in the tests were renamed to neutral names to avoid colliding with a
  variant's reserved fields.

The `vitest.config.ts` `test.exclude` opt-out mechanism still exists for a future variant that
can't pass a given shared file yet, but no variant currently uses it.

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
- `libs/web/vitest.config.ts` `resolve.alias` maps it → `../universal/src` (test runtime).

### mobile and the base package

`mobile` depends on the base library at `react-hooks-global-states@^16.0.0`, which the workspace
`universal` (v16.0.2) satisfies, so Yarn links it locally exactly like `web` — a change in
`universal` is picked up immediately, and Nx builds `universal` first
(`universal:build → mobile:build → mobile:test`).

The tsconfig/Vitest bridges are identical in spirit to `web`'s:

- `libs/mobile/tsconfig.json` and `libs/mobile/__test__/tsconfig.json` map
  `react-hooks-global-states` → `../universal/src` (type-checking).
- `libs/mobile/vitest.config.ts` `resolve.alias` maps it → `../universal/src` (test runtime).

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
   same tsconfig `paths` + Vitest `resolve.alias` bridges shown above.
4. `yarn install`, then `yarn test <name>`.
