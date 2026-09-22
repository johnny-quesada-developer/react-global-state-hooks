/**
 * A store's `globalStatePath` is a `new Error().stack` captured where the store is created. Under a
 * bundler dev server the stack frame URLs carry cache-busting query strings, e.g.:
 *
 *   at useState (http://localhost:5199/node_modules/.vite/deps/chunk-EQIWKXWS.js?v=ba65e710:12005:28)
 *   at http://localhost:5199/src/stores/auth.ts?t=1699999999999:15:30
 *
 * Vite appends `?v=<hash>` to optimized dep chunks (changes when deps re-optimize) and `?t=<ts>` to
 * a module's own URL on every HMR update (changes on EVERY edit). The SAME creation site therefore
 * produces a DIFFERENT stack string across reloads/HMR. That breaks identifying a store by path —
 * both for matching a loaded snapshot and for detecting that an HMR re-eval recreated a store at
 * the same path.
 *
 * A query string on a stack-frame URL is always a bundler artifact, never part of the store's
 * identity, so we strip the whole query (everything from `?` up to the `:line:col`, a `)`, or
 * whitespace). The stable structure (function names, module path, line:col) is preserved.
 *
 * Example: `.../auth.ts?t=1699999999999:15:30` -> `.../auth.ts:15:30`.
 */
export const normalizeStatePath = (globalStatePath: string): string => {
  if (!globalStatePath) return globalStatePath;

  // Drop the query (`?...`) from every frame URL. The query runs from `?` up to the next `:` (the
  // line number), `)`, or whitespace — none of which can appear inside a URL query here.
  return globalStatePath.replace(/\?[^:)\s]*/g, '');
};
