/**
 * A store's `globalStatePath` is a `new Error().stack` captured where the store is created. For
 * stores created during a React render (context providers, or stores made inside a component), the
 * stack runs through React's internals, which under Vite are served from the dependency optimizer
 * with a cache-busting query, e.g.:
 *
 *   at mountState (http://localhost:5199/node_modules/.vite/deps/chunk-EQIWKXWS.js?v=ba65e710:12005:28)
 *
 * That `?v=<hash>` token changes whenever Vite re-optimizes deps (restarts, cache invalidation), so
 * the SAME creation site produces a DIFFERENT stack string across reloads. That breaks matching a
 * loaded snapshot's stores to the live ones by path.
 *
 * Normalizing strips only that volatile optimizer token, keeping the stable structure (function
 * names, module paths, line:col). Everything else is left untouched.
 *
 * Example: `chunk-EQIWKXWS.js?v=ba65e710:12005:28` -> `chunk-EQIWKXWS.js:12005:28`.
 */
export const normalizeStatePath = (globalStatePath: string): string => {
  if (!globalStatePath) return globalStatePath;

  // Remove a `?v=<token>` (Vite dep-optimizer cache-bust) wherever it appears in the stack. The
  // token is the run of characters after `?v=` up to the next `:` (line number), `)` or whitespace.
  return globalStatePath.replace(/\?v=[^:)\s]+/g, '');
};
