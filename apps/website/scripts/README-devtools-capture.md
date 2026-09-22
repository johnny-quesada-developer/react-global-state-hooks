# DevTools showcase screenshots

The documentation uses `public/devtools/showcase/*.png`, described by
`src/data/devtools-showcase.json` and rendered by `src/ui/DevToolsShowcase.tsx`.

## Capture

```bash
yarn nx run devtools:build
yarn nx run playground:dev
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.rgsh-capture"
```

In that Chrome profile, enable Developer mode at `chrome://extensions` and load
`apps/devtools/dist` as an unpacked extension. Open `http://localhost:5199/`, open
DevTools, and select the React Global State Hooks panel. Then run:

```bash
yarn --cwd apps/website capture:devtools:showcase
```

The script connects through CDP, switches the panel to the light theme, reloads the
playground, and waits for the app and panel to synchronize before taking screenshots.
It captures the store list, State, Actions and Logs tabs, restore dialog, app and full
window. Review framing and legibility after capture.

Set `CDP_URL` or `APP_URL` to use different local addresses. The playground's debug
import resolves to the workspace monkey patch through its Vite aliases.
