# Architecture

This repository is an [Nx](https://nx.dev) monorepo that hosts the `react-global-state-hooks`
family of packages. All packages share a single root `node_modules`, one set of tooling
(TypeScript, ESLint, Prettier, esbuild, Vitest), and a common `tsconfig.base.json`.

> The root `README.md` introduces the web library. The package README in `libs/web/` is published to npm.
> This file documents the repo/monorepo itself and is not part of any published package.

## Packages

| Project     | Path             | Published name              | Role                                               |
| ----------- | ---------------- | --------------------------- | -------------------------------------------------- |
| `universal` | `libs/universal` | `react-hooks-global-states`        | Base library. Framework-agnostic core.                       |
| `web`       | `libs/web`       | `react-global-state-hooks`         | Web bindings. Re-exports/extends the base library.           |
| `mobile`    | `libs/mobile`    | `react-native-global-state-hooks`  | React Native bindings (async-storage). Extends the base lib. |

All three packages build with **esbuild** into `dist/` as a clean dual ESM/CJS + `.d.ts` bundle
(no UMD), via each package's `esbuild.config.ts` and `tsconfig.build.json`, then the shared
`scripts/prepare-dist.ts` at the repository root.

Each package keeps its own `package.json`, `README.md`, and build/test configuration. The
per-package README is what gets published to npm (copied into `dist/` by
the shared `scripts/prepare-dist.ts`).

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

### Test runner

Vitest resolves the state libraries to their TypeScript source. The reusable suites
run through each variant's aliases; built ESM/CJS compatibility is checked separately.
See [Testing Guide](docs/TESTING_GUIDE.md) for commands, assertions and troubleshooting.

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

- **`yarn prepare-packages`** runs `validate` (lint, tests and build) across all libs (via the dispatcher, so `universal`
  builds first). Each lib's `dist/` ends up publish-ready: a flattened `package.json` (dev-only
  fields stripped, paths pointing next to the emitted files) plus the dual `.mjs`/`.cjs`/`.js`
  bundles and `.d.ts` declarations. `scripts/prepare-dist.ts` assembles the three state packages; the debug and code-review
  packages keep their specialized assembly scripts.
- **`yarn tarball`** (see `scripts/tarball.mjs`) builds each lib, runs `npm pack` from its
  `dist/`, writes the `.tgz` into `artifacts/` (gitignored), and prints, per package: the npm
  `name@version`, tarball path, file count, unpacked size, and the full file list — i.e. the exact
  set of files npm would upload. Use it to review a package before `yarn publish:pkg <lib>`.

> Naming note: the script is `prepare-packages`, not `prepare`. `prepare` is a reserved
> npm/yarn lifecycle name that auto-runs on every `yarn install` (and before publish); using it
> for a full monorepo build would fire on every install. Run validation before publishing.

Each wrapper dispatches to `nx run <project>:<task>` (see `scripts/run.mjs`). New libs under
`libs/*` are discovered automatically — no change to the dispatcher needed.

ESM entries use `.mjs`; CommonJS entries use `.cjs`, with `.js` copies for legacy deep
imports. Sibling modules stay external so subpath imports share module instances.
The former UMD wrapper confused esbuild's export detection; native ESM/CJS avoids its
phantom exports and non-callable defaults. Package manifests retain relative paths
that resolve beside the emitted files. The shared assembly script copies each package's
README, LICENSE and CLI shim and removes development-only manifest fields.

## Reusable test suite (`libs/test`)

Roughly 90% of behavior is identical across the variants — only the persistence layer differs
(universal has none, web uses `localStorage`, mobile uses async storage). To avoid duplicating
those tests per variant, the tests live once in `libs/test` (a plain, non-published folder — not
an Nx project, it has no build/test target of its own), organized by which variant a file
targets:

```
libs/test/
  universal/   the neutral suite — the ~90% that every variant must satisfy
  web/         web-only tests (localStorage, methods, ...)
  native/      mobile-only tests (async storage)
  helpers/     shared test helpers: $it, getFakeAsyncStorage, expectMetadata, expectCalledWithStore
```

Every test file imports the subject under test as `global-state-hooks-under-test` (bare and
subpaths) — never a real package name — and imports helpers from `../helpers/*`. Nothing in
`libs/test` names a concrete variant, so the same file can run against any variant.

How it works (there is no loop): the files are run by **each variant's own Vitest**, and module
resolution — not a runner — is what swaps in the variant. Each variant includes the folders it is
responsible for and aliases the neutral name to its own `src`:

```
yarn test universal  ->  test/universal                ->  global-state-hooks-under-test -> libs/universal/src
yarn test web        ->  test/universal + test/web      ->  global-state-hooks-under-test -> libs/web/src
yarn test mobile     ->  test/universal + test/native   ->  global-state-hooks-under-test -> libs/mobile/src
```

Think of it as dependency injection: the tests declare "I need *a* global-state-hooks
implementation" and each variant's Vitest config injects its own.

- **Neutral subject alias.** Each variant's `vitest.config.ts` `resolve.alias` maps
  `global-state-hooks-under-test` (barrel and subpaths) to its own `src`, and each variant's
  `__test__/tsconfig.json` maps it to the same `src` for type-checking. Each variant's test
  tsconfig `include` covers exactly the `test/*` folders that variant runs, so the suites are
  type-checked against the correct subject (e.g. the native `asyncStorage` API only type-checks
  under the mobile mapping).
- **include.** Each variant's `vitest.config.ts` `include` lists the `../test/*` folders it owns
  (universal → `test/universal`; web → `test/universal` + `test/web`; mobile → `test/universal` +
  `test/native`).
- **Linting.** `libs/test` is linted by the `universal` project (`eslint . ../test`), and the
  root `eslint.config.mts` scopes `@typescript-eslint/no-empty-object-type: off` to both
  `libs/universal/**` and `libs/test/**`.

All three variants run the neutral suite plus their persistence tests without exclusions.
`expectMetadata(...).toMatch(...)` permits only the reserved keys declared by the variant;
all other data is compared exactly. Mobile declares `isAsyncStorageReady` and
`asyncStorageKey`. The helper performs one assertion, preserving `expect.assertions(n)`.

## Running the shared suite under the debug patch (`monkey_patch`)

The debug package must preserve observable store behavior. Its `vitest.workspace.ts`
runs the same shared suites through four projects:

| Project | Tests | Subject |
| --- | --- | --- |
| `unit` | Debug implementation and transport | Monkey patch |
| `patched-universal` | `test/universal` | Universal source |
| `patched-web` | `test/universal` + `test/web` | Web source |
| `patched-native` | `test/universal` + `test/native` | Mobile source |

`vitest.setup.patched.ts` installs the React DevTools hook before importing the patch,
then supplies Chrome and `postMessage` stubs. Installing the hook first prevents a
polling timer from surviving teardown. The native setup adds async-storage stubs.
`DEBUG_PATCH=off` runs the same projects without the patch; both modes must pass.

`expectCalledWithStore` tolerates declared DevTools bookkeeping fields and wrapped
function identities while still comparing store data exactly. Test type checking runs
in each owning variant: one TypeScript configuration cannot bind the neutral alias to
all three subjects at once.

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

## Code review pipeline (`libs/code-review`)

`libs/code-review` is the workspace package behind easy-code-review. `yarn review <target>` runs a
[LangGraph.js](https://langchain-ai.github.io/langgraphjs/) pipeline over the files of a target
(file, folder, glob, Nx project, commit or `changes`):

1. **Provider setup** (no AI): detects the installed `claude`, `codex`, `kiro-cli` or `copilot`, recommends one and
   picks a fast model for scoring/metadata and a capable model for edits (`qa/settings.ts`).
2. **Target selection**: resolves the target into source files.
3. **Permissions**: asks which edit scope to grant and passes it through the provider's own flags (headless, never bypassed).
4. **Rules**: one rule at a time — built-ins from `src/segments/rules/ruleRegistry.ts` plus prompt-based rules from
   `<configurationDirectory>/rules/` (created with `yarn review rule create`); each rule is its own graph.
5. **Summary**: terminal tables plus `.review/runs/<timestamp>/summary.md` (git-ignored).

The pipeline combines measured coverage, rubric scoring and retry loops that feed earlier results
back into the next attempt. See `libs/code-review/README.md`.

## Website (`apps/website`)

`apps/website` is the documentation, examples and learning site. The UI is React (`src/ui`, `src/examples`)
and the site's own shared state (search dialog, install-tab and mini-me preferences in `src/state`) runs on
this library. [Astro](https://astro.build) is only the static generator: it renders the React components to
HTML at build time, compiles the MDX docs, and hydrates just the interactive islands. Astro files are
limited to pages, the `<head>` layout and content config. It is an Nx project (`website`) and is **never published to npm**; `scripts/publish-all.mjs`
uses an explicit package list that does not include it.

```bash
yarn nx run website:dev         # dev server (copies the intro videos from /public first)
yarn nx run website:build       # static site in apps/website/dist + Pagefind search index
yarn nx run website:preview     # serve dist/ locally
yarn nx run website:test        # vitest: docs snippets, example logic, colour contrast
yarn nx run website:ts-check    # astro check
yarn nx run website:lint
```

- **One version at a time.** `apps/website/.env` holds `PUBLIC_PACKAGE_VERSION`, the library version the docs describe.
  `yarn version-bump` writes it whenever the web package's version changes; do not edit it by hand.
- **Deployment** is `.github/workflows/deploy-website.yml` (GitHub Pages, base path
  `/react-global-state-hooks/`). It is independent of library publishing.
- **Library source, not a build.** The site resolves `react-global-state-hooks` and
  `react-hooks-global-states` to `libs/web/src` and `libs/universal/src` (Vite alias + tsconfig paths, the
  same convention as `apps/playground`), so the site documents the version in this workspace.
- **Snippets are real modules.** Code shown in the docs lives in `src/snippets/**` and is imported with
  `?raw`, so the same file is displayed, type-checked and executed by the tests. Live demos live in
  `src/examples/**` and are displayed the same way.
- **Generated assets are committed.** `scripts/make-og.mjs` (share images in `public/og`, from page
  frontmatter), `scripts/make-assets.mjs` (posters, portrait sizes) and `apps/devtools/scripts/make-logo.mjs`
  (DevTools logo and icon sizes) use sharp/ffmpeg locally, so CI never depends on installed fonts or codecs.
  `yarn --cwd apps/website check:links` verifies every internal link, asset and anchor in `dist/`.
- **Media.** The large intro videos stay in the repo-root `/public`; `scripts/sync-media.mjs` copies them
  into the (git-ignored) `apps/website/public/media`. `scripts/make-assets.mjs` regenerates the committed
  poster images and portrait variants with ffmpeg.

## Adding a new library

1. Create `libs/<name>/` with its own `package.json`, `tsconfig.json` (extending
   `../../tsconfig.base.json`), build/test config, and `src/`.
2. Add `libs/<name>/project.json` with `"name": "<name>"` and the target set (mirror an
   existing project).
3. If it depends on another workspace package, declare that dependency in its `package.json`;
   Nx will infer the build order. If it consumes a package by its published `exports`, add the
   same tsconfig `paths` + Vitest `resolve.alias` bridges shown above.
4. `yarn install`, then `yarn test <name>`.
