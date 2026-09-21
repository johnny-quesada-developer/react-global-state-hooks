/**
 * Ambient type declaration for `react-hooks-global-states-debug`.
 *
 * This is a SIDE-EFFECT-ONLY package: importing it (`import 'react-hooks-global-states-debug';`)
 * installs the DevTools monkey patch and exports nothing. The published bundle is dist/debug.js
 * (see package.json `main`/`module`), and this file is copied to dist/index.d.ts by
 * scripts/prepare-dist.ts to satisfy the package.json `types` field.
 */

declare module 'react-hooks-global-states-debug' {
  /**
   * Side-effect import. Connects your global stores to the React Global States Hooks DevTools
   * browser extension. Import once at your app entry point during development only; it must never
   * be shipped in production builds.
   */
  const _default: void;
  export default _default;
}
