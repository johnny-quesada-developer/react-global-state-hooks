// The patch polls for the React DevTools global hook with a recurring setTimeout,
// rescheduling until it appears. In jsdom that hook never exists, so the poll would
// keep a timer alive and fire after the test environment is torn down (window gone),
// producing an uncaught "window is not defined". Provide a minimal hook so the poll
// resolves on its first attempt and schedules no further timers.
(window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  renderers: new Map(),
  listeners: {
    'devtools-backend-installed': [],
    'renderer-attached': [],
    fastRefreshScheduled: [],
    operations: [],
  },
};

// Apply the monkey patch before any test runs unless DEBUG_PATCH=off. The debug
// package is a side-effect import that installs globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG,
// which the state libraries invoke when a store is created. Running the suite both
// with and without the patch verifies that patching does not alter behavior.
if (process.env.DEBUG_PATCH !== 'off') {
  await import('react-hooks-global-states-debug');
}

import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// jsdom requires window.postMessage(message, targetOrigin); real browsers accept a
// single argument. The monkey patch uses the single-arg form, so default the missing
// targetOrigin here rather than changing production code for the test environment.
const originalPostMessage = window.postMessage.bind(window);
window.postMessage = ((message: unknown, targetOrigin: string = '*', transfer?: Transferable[]) =>
  originalPostMessage(message, targetOrigin, transfer)) as typeof window.postMessage;

// jsdom shares one localStorage across a file; clear between tests so ported
// suites that reuse storage keys stay isolated.
beforeEach(() => {
  localStorage.clear();
});
