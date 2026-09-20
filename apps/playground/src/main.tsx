// ---------------------------------------------------------------------------
// IMPORTANT: the debug side-effect import MUST be the very first import.
//
// The state libraries read `globalThis.REACT_GLOBAL_STATE_HOOK_DEBUG` exactly
// once, when their module is first evaluated. Importing the debug package first
// guarantees the hook is installed before any store module loads and before any
// store is created. Move it below your store imports and nothing will be tracked.
// ---------------------------------------------------------------------------
import 'react-hooks-global-states/debug';

import { createRoot } from 'react-dom/client';
import { App } from './App';

// NOTE: intentionally NOT using React.StrictMode here.
// StrictMode double-mounts/unmounts components in development, which makes the
// global-state debug lifecycle churn (a store is created, then its unmount fires
// DELETE_GLOBAL_STATE, then it remounts). That produces a confusing/empty DevTools
// panel. A normal app entry does not need StrictMode to exercise the debugger.
createRoot(document.getElementById('root')!).render(<App />);
