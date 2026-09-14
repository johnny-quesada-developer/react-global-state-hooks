# React Hooks Global States — DevTools

Chrome DevTools extension for inspecting, debugging, and editing the global state created with
[`react-hooks-global-states`](https://www.npmjs.com/package/react-hooks-global-states) and its
web variant [`react-global-state-hooks`](https://www.npmjs.com/package/react-global-state-hooks).

This repo contains three things:

| Piece                  | Location                                 | What it is                                                                                                  |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **DevTools extension** | `src/lib`, `src/pages`, `dist/` (built)  | The Chrome extension: devtools panel + content-script bridge.                                               |
| **Debug package**      | `src/monkey_patch` → `npm-dist/` (built) | The npm package `react-hooks-global-states-debug` that apps import to expose their stores to the extension. |
| **Playground**         | `playground/`                            | An interactive test app that consumes both state libraries and the local debug package.                     |

---

## How it works (Manifest V3)

Under Manifest V3 the extension can no longer inject a script into the page to patch the state
library at runtime. Instead the patch ships as a **separate npm package** that the app imports
directly:

```
your app  ──imports──▶  react-hooks-global-states-debug
                              │  (installs globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG)
                              ▼
        react-hooks-global-states / react-global-state-hooks
                              │  (calls the hook on every store create/mutation)
                              ▼  window.postMessage
                        content_script.js
                              │  chrome.runtime port ("content-script")
                              ▼
                        service_worker.js  (broker, routes by tabId)
                              │  chrome.runtime port ("devtools-panel")
                              ▼
                        DevTools panel
```

The debug package is a pure side-effect import. It sets `globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG`,
which both state libraries look for and call whenever a store is created or mutated. The extension's
content script bridges those `window.postMessage` events to a **background service worker**, which
routes them to the DevTools panel inspecting the same tab (and forwards edit/restore requests back).

Why the service worker? Under MV3 a devtools panel and a content script cannot reliably keep a
direct port: the content script connects at page load (before the panel exists) and there is no
persistent page to hold the connection. The worker is the broker that both ends connect to, keyed
by tab id, with automatic reconnect on either side.

The payload crossing `window.postMessage` is serialized with `json-storage-formatter` (so Dates,
Maps, etc. survive) and decoded again on the panel side.

Because the transport only relays **live** messages (there is no replay of history), open the
DevTools panel first and then reload the page so stores created on load are captured.

---

## Quick start (local end-to-end test)

From the repo root:

```bash
# 1. Build the extension into ./dist
#    Use the :dev build if you want the (dev-only) Messages tab for debugging the transport.
yarn build:extension          # production
# or: yarn build:extension:dev:once   # development, one-shot, unminified + Messages tab

# 2. Build the debug package and run the interactive playground in one step
#    (builds ./npm-dist, installs the playground, and starts its dev server on :5199)
yarn playground
```

Then load the extension in Chrome (see below), open the playground tab, open DevTools, switch to
the **🐵 React Hooks Global States Dev Tools** panel, and **reload the playground page** so the
stores created on load are captured.

---

## Building the extension

```bash
# Production build → ./dist
yarn build:extension

# Development build, one-shot (unminified, source maps, includes the Messages tab) → ./dist
yarn build:extension:dev:once

# Development build with watch (rebuilds on change) → ./dist
yarn build:extension:dev
```

The build produces `./dist` with this layout:

```
dist/
├── manifest.json            # MV3 manifest
├── devtools_page.html       # registers the devtools panel
├── main_tab.html            # the panel UI
├── index.html
├── lib/
│   ├── content_script.js    # page → worker bridge
│   ├── service_worker.js    # background broker (content-script ↔ panel)
│   └── devtools_page.js     # creates the panel
└── assets/                  # icons, css, panel bundle
```

## Installing the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `dist/` folder from this repo.
5. The extension appears in the list. Open any page's DevTools (`F12` / `Cmd+Opt+I`) and look for
   the **🐵 React Hooks Global States Dev Tools** tab.

After rebuilding (`yarn build:extension`), click the **reload** icon on the extension card in
`chrome://extensions`, then reopen DevTools.

> React DevTools must also be installed and the app must be running a **development** build of
> React. The panel uses React DevTools' global hook to detect a dev build; production React builds
> are intentionally not tracked.

---

## Using the debug package in an app

Install it (once published to npm):

```bash
yarn add -D react-hooks-global-states-debug
# or, before it is published, from a local tarball / path:
yarn add -D react-hooks-global-states-debug@file:../react-hooks-global-states-dev-tools/npm-dist
```

Then import it **once, as the very first import of your app entry point**:

```ts
// main.tsx / index.tsx — MUST be the first import
import 'react-hooks-global-states-debug';

import { createRoot } from 'react-dom/client';
import { App } from './App';
// ...
```

### ⚠️ Import ordering matters

The state libraries read `globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG` **once**, when their module is
first evaluated. If your store modules load before the debug package, the hook will not be
installed in time and nothing will be tracked. Always import the debug package before any module
that imports a state library or creates a store.

Never ship this import in a production build. Guard it or strip it from production entry points.

---

## Playground

`playground/` is a Vite + React 19 app that exercises the full surface so you can manually verify
observability:

- **Counter** — a plain `setState` store from `react-hooks-global-states`.
- **Auth** — sync + async actions and non-reactive metadata, from `react-global-state-hooks`.
- **Todos** — custom actions plus a derived `createSelectorHook` (parent + child store).
- **Form** — `createContext` with actions (per-provider scoped state).

```bash
# from the repo root — builds npm-dist, installs the playground, starts the dev server
yarn playground          # http://localhost:5199

# or, if deps are already installed and npm-dist is built:
yarn playground:dev
```

If you rebuild the debug package (`yarn build:monkey_patch` at the repo root), restart the
playground dev server so it picks up the new `npm-dist` build.

> The playground intentionally does **not** use `React.StrictMode`. StrictMode double-mounts
> components in development, which makes context/selector stores churn (create → unmount →
> `DELETE_GLOBAL_STATE` → recreate) and can leave the panel looking empty. Real apps that use
> StrictMode still work — the churn self-corrects on remount.

What to verify in the panel (reload the page with the panel already open):

1. All five stores appear in the state list (counter, auth, todos, todos:pendingCount, form-context).
2. Clicking the buttons logs actions and state changes in real time.
3. Async actions (login / refresh token) show pending → resolved transitions.
4. The Todos "pending" count (a selector hook) updates as a derived store.
5. Editing / restoring state from the panel updates the app.

---

## Convenience scripts

| Script                          | What it does                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `yarn build:extension`          | Production build of the extension into `./dist`.                                     |
| `yarn build:extension:dev:once` | One-shot development build (unminified, includes the Messages tab).                  |
| `yarn build:extension:dev`      | Development build with watch.                                                        |
| `yarn build:monkey_patch`       | Build the debug package into `./npm-dist`.                                           |
| `yarn build:all`                | Build both the extension and the debug package.                                      |
| `yarn playground`               | Build the debug package, install the playground, and start its dev server.           |
| `yarn playground:dev`           | Start the playground dev server only.                                                |
| `yarn playground:build`         | Build the debug package + a production build of the playground.                      |
| `yarn pack:debug`               | Build the debug package and run `npm pack` to produce a local `.tgz`.                |
| `yarn publish:debug:beta:dry`   | Build + `npm publish --tag beta --dry-run` (inspect the tarball, publishes nothing). |
| `yarn publish:debug:beta`       | Build + publish the debug package to npm under the `beta` tag.                       |
| `yarn publish:debug:latest`     | Build + publish the debug package to npm under the `latest` tag.                     |

> The `pack:`/`publish:` scripts wrap `npm pack` / `npm publish` because those are npm-registry
> operations. Everything else uses yarn.

### Publishing the beta

```bash
# Inspect what would be published first
yarn publish:debug:beta:dry

# Publish for real (requires npm auth: npm login)
yarn publish:debug:beta
```

The package is published as `react-hooks-global-states-debug` with `publishConfig.access: public`.
Consumers install the beta with:

```bash
yarn add -D react-hooks-global-states-debug@beta
```

---

## Troubleshooting

- **Nothing shows in the panel.** Confirm the debug package is imported _before_ any store module
  (see import ordering). Confirm React DevTools is installed and the app is a development build.
  Open the panel first, then reload the page — the transport relays live messages only, it does not
  replay stores created before the panel connected.
- **Panel is empty after a reload.** Reopen the DevTools panel; it does not always survive a full
  page reload. The extension also cleans up previous-session state on reload.
- **Stores appear then vanish.** Usually `React.StrictMode` double-mounting in development (see the
  playground note above), or a context Provider that unmounted.
- **Extension / service worker changes not reflected.** Rebuild, then reload the extension in
  `chrome://extensions` (the ↻ icon — this also restarts the service worker) and reopen DevTools.
  You can inspect the worker's console via the "service worker" link on the extension card.
- **Playground uses a stale debug build.** Rebuild `npm-dist` and restart the playground dev server.
- **Where is the Messages tab?** It is gated to development builds. Build the extension with
  `yarn build:extension:dev:once` to get it.

---

## Notes

- The **Messages tab** (raw transport messages) is gated to development builds
  (`process.env.NODE_ENV === 'development'`). Use `yarn build:extension:dev:once` to include it.
- `src/manifest.dev.json` is a leftover Manifest V2 file and is **not** used by the current build
  (only `src/manifest.json`, MV3, is copied into `dist/`). It is kept for reference and can be
  removed.

## Testing

This project uses [Vitest](https://vitest.dev/).

```bash
yarn test:run        # run once
yarn test:watch      # watch mode
yarn test:coverage   # coverage report
```
