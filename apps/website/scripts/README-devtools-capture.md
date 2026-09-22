# DevTools screenshots: how they were captured

The DevTools docs page uses `public/devtools/showcase/*.png`, described by `src/data/devtools-showcase.json`
and rendered by `src/ui/DevToolsShowcase.tsx`. The earlier scenario pairs in `public/devtools/*.png` and
`src/data/devtools-shots.json` are retained capture assets; `DevToolsShot.tsx` is no longer mounted.

The capture scripts check state values and image dimensions. Review framing and legibility when refreshing
the images.

## Source

|                 |                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- |
| Library version | 16.0.4-beta (workspace source)                                                      |
| Playground      | `apps/playground` on `http://localhost:5199/`                                       |
| Extension       | the local build in `apps/devtools/dist` (new logo, `data-testid`s), loaded unpacked |
| Theme           | the panel's light theme (the script switches to it if the panel is dark)            |
| Browser         | Chrome 153, separate profile with remote debugging                                  |

## Reproduce

```bash
yarn nx run devtools:build                       # rebuild the extension
yarn nx run playground:dev                       # http://localhost:5199/
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.rgsh-capture"
# In that Chrome: chrome://extensions -> Developer mode -> Load unpacked -> apps/devtools/dist
# Open http://localhost:5199/, open DevTools, select the "🐵 react-global-state-hooks" panel.
yarn --cwd apps/website capture:devtools
```

Chrome 136+ ignores `--remote-debugging-port` on the default profile, hence the separate `--user-data-dir`.
The script attaches with Playwright over CDP, reloads the playground with the panel already open (so both sides
synchronize), waits for concrete values in the app and in the panel, then saves the app card and the panel as
separate images. The extension panel is an out-of-process iframe; the script finds it by reading `location.href`
inside each DevTools frame.

## Scenarios (deterministic data)

| Id                           | Data                                          | Waits for                                      |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `track-state-changes`        | counter: 0, then three clicks on +1           | page shows 3; panel shows `Records: 4`         |
| `restore-the-state`          | counter restored from the second log entry    | page shows 1                                   |
| `modify-the-state`           | `42` typed in the State tab editor, Set State | page shows 42                                  |
| `custom-actions-granularity` | todos: `add` "Write the docs"                 | todo on the page; panel lists the `add` action |

The file names of the first, third and fourth scenarios follow the older screenshots in the repository-root
`public/` (`track-state-changes.png`, `modify-the-state.png`, `restore-the-state.png`,
`custom-actions-granularity.png`), which are left untouched.

## The debug import in the playground

`apps/playground/src/main.tsx` imports `react-hooks-global-states/debug` first, before React or any store. That is
the base package's debug entry. The public web package exposes the same thing as `react-global-state-hooks/debug`
(beta, 16.0.4-beta), which forwards to the base entry. Both resolve to the same monkey patch through the Vite
aliases in `apps/playground/vite.config.ts`, so the playground was left with a single import.

## Showcase set

`scripts/capture-devtools-showcase.mjs` (run with `yarn --cwd apps/website capture:devtools:showcase`) takes the
tour used on the DevTools docs page: the whole DevTools window, the app, and each panel section, into
`public/devtools/showcase/` with `src/data/devtools-showcase.json`. Same setup as above. The earlier per-scenario pairs
(`public/devtools/*-app.png` and `*-panel.png`) are kept but are no longer shown on the page.
