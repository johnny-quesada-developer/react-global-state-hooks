# react-hooks-global-states-debug 🌟

<div align="center">

![Johnny Quesada](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

</div>

<div align="center">

**See the state. Follow the action. Understand the result.**

Connect your React Global State Hooks stores to the DevTools browser extension and
bring your application's state into view. Inspect live values, compare changes,
follow action lifecycles, and try updates while watching the application respond.

Built for the moments when you want to understand a feature, reproduce a bug, or
verify a fix with evidence from the running app.

[![npm version](https://img.shields.io/npm/v/react-hooks-global-states-debug.svg)](https://www.npmjs.com/package/react-hooks-global-states-debug)
[![Downloads](https://img.shields.io/npm/dm/react-hooks-global-states-debug.svg)](https://www.npmjs.com/package/react-hooks-global-states-debug)
[![License](https://img.shields.io/npm/l/react-hooks-global-states-debug.svg)](https://github.com/johnny-quesada-developer/react-global-state-hooks/blob/master/LICENSE)

[**Website**](https://johnny-quesada-developer.github.io/react-global-state-hooks/) · [**DevTools guide**](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/devtools/) · [**Examples**](https://johnny-quesada-developer.github.io/react-global-state-hooks/examples/)

Created by [Johnny Quesada](https://johnny-quesada-developer.github.io/react-global-state-hooks/about/),
author of the React Global State Hooks family.

</div>

## A clearer view of your application

- **Inspect stores and contexts.** See current state and metadata in one place.
- **Follow actions from start to finish.** Track state updates, results, and failures.
- **Compare state changes.** Find the values an action changed without searching through console output.
- **Try changes in the running app.** Edit state or execute store actions from the panel.
- **Revisit earlier state.** Use time travel to explore a previous snapshot.
- **Bring the workflow to your terminal.** Read state and invoke actions with `rgsh`, including from a coding agent.

See the [DevTools walkthrough](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/devtools/)
for the extension installation link, panel tour, and terminal setup.

## Connect your app

The web package exposes a convenient debug entry point. Import it first in your
**development entry file**, before React and any module that creates a store:

```tsx
import 'react-global-state-hooks/debug';

import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

This entry is available in `react-global-state-hooks` from version 16.0.4.
Keep debug instrumentation in development builds only.

If you need to install the instrumentation package directly:

```bash
npm install --save-dev react-hooks-global-states-debug
```

Use this side-effect import at the top of your development entry **instead of**
the web package's debug import:

```ts
import 'react-hooks-global-states-debug';
```

Then:

1. Install the browser extension linked in the [DevTools guide](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/devtools/).
2. Start your app and open the extension's panel in Chrome DevTools.
3. Reload the page with the panel open to synchronize your stores.
4. Select a store to inspect its state and follow its actions.

Give stores a `name` option so they are easy to find in the panel and terminal.

## Debug from your terminal or coding agent

The web, universal, and mobile state packages each provide the `rgsh` command.
With your browser app connected and its DevTools panel open, install the optional
WebSocket dependency and discover your stores:

```bash
npm install --save-dev ws
npx rgsh --list
npx rgsh --help
```

For an app with a store named `todos` and an `add` action:

```bash
npx rgsh state todos
npx rgsh action todos add "Verify the new workflow"
npx rgsh --store todos
```

A coding agent can use the same commands to invoke an action and inspect the
resulting state. That makes the runtime part of the development conversation.
The terminal connection uses port `7787` by default; match it to the panel's
**Terminal connection** setting.

## Part of the React Global State Hooks family

| Package | Purpose |
| --- | --- |
| [`react-global-state-hooks`](https://www.npmjs.com/package/react-global-state-hooks) | React web state with optional localStorage persistence. |
| [`react-native-global-state-hooks`](https://www.npmjs.com/package/react-native-global-state-hooks) | React Native state with optional asynchronous persistence. |
| [`react-hooks-global-states`](https://www.npmjs.com/package/react-hooks-global-states) | The shared state API without platform-specific persistence. |
| [`react-hooks-global-states-debug`](https://www.npmjs.com/package/react-hooks-global-states-debug) | The development instrumentation described here. |

The workflow above connects a browser page to the Chrome extension. For package
entry points and platform details, see the
[platform guide](https://johnny-quesada-developer.github.io/react-global-state-hooks/docs/platform-and-versions/).

## Built by Johnny Quesada

Explore the [project website](https://johnny-quesada-developer.github.io/react-global-state-hooks/),
meet [Johnny](https://johnny-quesada-developer.github.io/react-global-state-hooks/about/),
and help shape what comes next. If these tools help you solve a bug, share the
project with another developer or give it a star.

[Star on GitHub](https://github.com/johnny-quesada-developer/react-global-state-hooks) · [Report an issue](https://github.com/johnny-quesada-developer/react-global-state-hooks/issues) · [Explore the source](https://github.com/johnny-quesada-developer/react-global-state-hooks/tree/master/libs/monkey_patch)
