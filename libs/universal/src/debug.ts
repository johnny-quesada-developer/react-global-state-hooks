// Opt-in DevTools debug subpath.
//
// Usage (development only):
//   import 'react-hooks-global-states/debug';
//
// This is a SIDE-EFFECT-ONLY subpath: it simply pulls in the external
// `react-hooks-global-states-debug` package, which installs the monkey patch connecting your
// global stores to the React Hooks Global States DevTools browser extension.
//
// It is intentionally NOT re-exported from the barrel (src/index.ts) and the debug package is
// kept EXTERNAL at build time, so it never affects the base library's bundle size (nor the size
// of packages that depend on it) unless a consumer explicitly imports this subpath.
//
// WARNING: never import this in production builds.
import 'react-hooks-global-states-debug';

export {};
