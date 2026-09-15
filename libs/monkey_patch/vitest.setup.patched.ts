// Patched-run setup for the SHARED suite.
//
// This mirrors the playground harness (_tempDevTools/playground/vitest.setup.ts): it installs
// the debug monkey patch, then runs the reusable suite (libs/test) against a real global-state
// variant. The point is a regression guarantee — the shared behavior of the state libraries must
// be identical whether or not the debug patch is installed. Set DEBUG_PATCH=off to run the same
// suite WITHOUT the patch and confirm parity.
//
// The web/universal patched projects use this file directly. The native patched project layers
// the async-storage mock + mobile's reserved metadata keys on top (vitest.setup.patched.native.ts).
//
// Order matters. The steps below run top-to-bottom before any test file executes.

// 1) Stub the React DevTools global hook BEFORE importing the patch. The patch's
//    connectReactDevTools() polls with a recurring setTimeout until
//    `__REACT_DEVTOOLS_GLOBAL_HOOK__.listeners.operations` exists. In jsdom that hook never
//    appears, so the timer would keep rescheduling and fire after the test env is torn down
//    (window gone), throwing "window is not defined". Providing a minimal hook makes the poll
//    resolve on its first attempt and schedule no further timers.
(window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  renderers: new Map(),
  listeners: {
    'devtools-backend-installed': [],
    'renderer-attached': [],
    fastRefreshScheduled: [],
    operations: [],
  },
};

// 2) Minimal chrome API stub — the patch's extension surface touches it on load.
(globalThis as { chrome?: unknown }).chrome = {
  devtools: { inspectedWindow: { tabId: 1 } },
  runtime: { onConnect: { addListener: () => {} } },
};

// 3) Install the patch via a side-effect import, gated by DEBUG_PATCH so the same suite can run
//    patched (default) or unpatched (DEBUG_PATCH=off) for parity. The debug entry installs
//    globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG, which the state libraries invoke on store
//    creation. Awaited at top level so it completes before any test imports the subject.
if (process.env.DEBUG_PATCH !== 'off') {
  await import('./src/debug');
}

import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 4) jsdom requires window.postMessage(message, targetOrigin); real browsers accept a single
//    argument, which is the form the patch uses (see src/sendMessageFromMonkeyPath.ts). Default
//    the missing targetOrigin here rather than changing production code for the test env.
const originalPostMessage = window.postMessage.bind(window);
window.postMessage = ((message: unknown, targetOrigin: string = '*', transfer?: Transferable[]) =>
  originalPostMessage(message, targetOrigin, transfer)) as typeof window.postMessage;

// 5) The universal/web variants inject no extra reserved metadata keys. (The native variant
//    overrides this in vitest.setup.patched.native.ts.) See libs/test/helpers/expectMetadata.ts.
globalThis.__VARIANT_METADATA_KEYS__ = [];

// 6) The debug patch augments every store on creation with these bookkeeping fields. Declare
//    them so the shared suite's patch-aware assertions (expectCalledWithStore) tolerate them as
//    extras while still catching any genuinely unexpected argument. Unset elsewhere -> the
//    normal variants keep exact-match semantics. See libs/test/helpers/expectCalledWithStore.ts.
globalThis.__PATCH_RESERVED_STORE_KEYS__ = [
  '_DEV_TOOLS_STORE_ID',
  '_DEV_TOOLS_IS_CONTEXT',
  '_DEV_TOOLS_PARENT_STORE_ID',
];

// 7) Cleanup rendered React trees and reset jsdom's shared localStorage between tests so ported
//    suites that reuse storage keys stay isolated.
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});
