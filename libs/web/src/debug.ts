// Opt-in DevTools debug subpath.
//
// Usage (development only):
//   import 'react-global-state-hooks/debug';
//
// This is a SIDE-EFFECT-ONLY subpath. It delegates to the base library's own debug subpath
// (react-hooks-global-states/debug), which pulls in the external react-hooks-global-states-debug
// package and installs the monkey patch connecting your global stores to the React Hooks Global
// States DevTools browser extension.
//
// Re-exporting from the base keeps react-hooks-global-states-debug as a dependency of the base
// library alone — it never appears in this package's own dependencies.
//
// It is intentionally NOT re-exported from the barrel (src/index.ts) and the base library (and the
// debug package it pulls in) is kept EXTERNAL at build time, so it never affects this package's
// bundle size unless a consumer explicitly imports this subpath.
//
// WARNING: never import this in production builds.
import 'react-hooks-global-states/debug';

export {};
