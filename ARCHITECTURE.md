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
yarn graph               # open the Nx project graph
```

Each wrapper dispatches to `nx run <project>:<task>` (see `scripts/run.mjs`). New libs under
`libs/*` are discovered automatically — no change to the dispatcher needed.

Both test modes are preserved per package:

- default (`yarn test <project>`) runs against the compiled `dist/` artifact, so build-level
  concerns (minification, dual ESM/CJS emit, `__esModule` interop) are exercised.
- `TEST_TARGET=src` (`yarn test:src <project>`) runs against `src/` for a fast inner loop.

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

`mobile` still depends on the base library at `react-hooks-global-states@^15.0.17`, which is NOT
satisfied by the workspace `universal` (v16). So Yarn does not link it locally — `mobile` resolves
its own `react-hooks-global-states@15.x` (and `json-storage-formatter@3`) from npm, nested under
`libs/mobile/node_modules`. Aligning `mobile` to the v16 base (and linking it to `universal` like
`web`) is a deliberate future step; until then `mobile` builds/tests against the published v15 base.

## Adding a new library

1. Create `libs/<name>/` with its own `package.json`, `tsconfig.json` (extending
   `../../tsconfig.base.json`), build/test config, and `src/`.
2. Add `libs/<name>/project.json` with `"name": "<name>"` and the target set (mirror an
   existing project).
3. If it depends on another workspace package, declare that dependency in its `package.json`;
   Nx will infer the build order. If it consumes a package by its published `exports`, add the
   same tsconfig `paths` + jest `moduleNameMapper` bridges shown above.
4. `yarn install`, then `yarn test <name>`.
