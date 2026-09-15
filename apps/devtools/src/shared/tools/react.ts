import type { GlobalStoreParameter } from 'react-hooks-global-states-debug/dev-tools';
import isNil from 'json-storage-formatter/isNil';
import { assertIsNonNullable } from '../asserts';
import { BuildTypeJsonEnum } from '../schema/BuildTypeJson';

type Renderer = {
  bundleType: number;
  version: string;
  Mount: {
    _renderNewRootComponent: (event: unknown) => unknown;
  };
};

// export type GlobalStateExtraArgs = {
//   localStorage?: LocalStorageConfig<unknown>;
// };

interface GlobalThis {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
    renderers: Map<number, Renderer>;
    listeners?: {
      'devtools-backend-installed': [(event: unknown) => void];
      'renderer-attached': [(event: unknown) => void];
      fastRefreshScheduled: [(event: unknown) => void];
      operations: [(event: unknown) => void];
      renderer: [(event: unknown) => void];
      settingsInitialized: [(event: unknown) => void];
      shutdown: [(event: unknown) => void];
      traceUpdates: [(event: unknown) => void];
      'unsupported-renderer-version': [(event: unknown) => void];
    };
  };

  __BUILD_MODE__?: 'development' | 'production';

  REACT_GLOBAL_STATE_HOOK_DEBUG?: (
    store: GlobalStoreParameter,
    args: unknown, // GlobalStateExtraArgs | undefined,
    invokerHash: string
  ) => void;
}

export const getGlobalThis = (global: Window | typeof globalThis): GlobalThis => {
  return global as unknown as GlobalThis;
};

export const getReactBuildType = () => {
  // based on https://github.com/facebook/react-devtools/blob/faa4b630a8c055d5ab4ff51536f1e92604d5c09c/backend/installGlobalHook.js#L23
  const detectReactBuildType = (renderer: Renderer): keyof typeof BuildTypeJsonEnum => {
    try {
      if (typeof renderer.version === 'string') {
        // React DOM Fiber (16+)
        if (renderer.bundleType > 0) {
          // This is not a production build.
          // We are currently only using 0 (PROD) and 1 (DEV)
          // but might add 2 (PROFILE) in the future.
          return 'development';
        }

        // React 16 uses flat bundles. If we report the bundle as production
        // version, it means we also minified and envified it ourselves.
        return 'production';
        // Note: There is still a risk that the CommonJS entry point has not
        // been envified or uglified. In this case the user would have *both*
        // development and production bundle, but only the prod one would run.
        // This would be really bad. We have a separate check for this because
        // it happens *outside* of the renderer injection. See `checkDCE` below.
      }
      const toString = Function.prototype.toString;
      if (renderer.Mount && renderer.Mount._renderNewRootComponent) {
        // React DOM Stack
        const renderRootCode = toString.call(renderer.Mount._renderNewRootComponent);
        // Filter out bad results (if that is even possible):
        if (renderRootCode.indexOf('function') !== 0) {
          // Hope for the best if we're not sure.
          return 'production';
        }
        // Check for React DOM Stack < 15.1.0 in development.
        // If it contains "storedMeasure" call, it's wrapped in ReactPerf (DEV only).
        // This would be true even if it's minified, as method name still matches.
        if (renderRootCode.indexOf('storedMeasure') !== -1) {
          return 'development';
        }
        // For other versions (and configurations) it's not so easy.
        // Let's quickly exclude proper production builds.
        // If it contains a warning message, it's either a DEV build,
        // or an PROD build without proper dead code elimination.
        if (renderRootCode.indexOf('should be a pure function') !== -1) {
          // Now how do we tell a DEV build from a bad PROD build?
          // If we see NODE_ENV, we're going to assume this is a dev build
          // because most likely it is referring to an empty shim.
          if (renderRootCode.indexOf('NODE_ENV') !== -1) {
            return 'development';
          }
          // If we see "development", we're dealing with an envified DEV build
          // (such as the official React DEV UMD).
          if (renderRootCode.indexOf('development') !== -1) {
            return 'development';
          }
          // I've seen process.env.NODE_ENV !== 'production' being smartly
          // replaced by `true` in DEV by Webpack. I don't know how that
          // works but we can safely guard against it because `true` was
          // never used in the function source since it was written.
          if (renderRootCode.indexOf('true') !== -1) {
            return 'development';
          }
          // By now either it is a production build that has not been minified,
          // or (worse) this is a minified development build using non-standard
          // environment (e.g. "staging"). We're going to look at whether
          // the function argument name is mangled:
          if (
            // 0.13 to 15
            renderRootCode.indexOf('nextElement') !== -1 ||
            // 0.12
            renderRootCode.indexOf('nextComponent') !== -1
          ) {
            // We can't be certain whether this is a development build or not,
            // but it is definitely unminified.
            return 'unminified';
          } else {
            // This is likely a minified development build.
            return 'development';
          }
        }
        // By now we know that it's envified and dead code elimination worked,
        // but what if it's still not minified? (Is this even possible?)
        // Let's check matches for the first argument name.
        if (
          // 0.13 to 15
          renderRootCode.indexOf('nextElement') !== -1 ||
          // 0.12
          renderRootCode.indexOf('nextComponent') !== -1
        ) {
          return 'unminified';
        }
        // Seems like we're using the production version.
        // However, the branch above is Stack-only so this is 15 or earlier.
        return 'outdated';
      }
    } catch (err) {
      // Weird environments may exist.
      // This code needs a higher fault tolerance
      // because it runs even with closed DevTools.
      // TODO: should we catch errors in all injected code, and not just this part?
    }
    return 'production';
  };

  const global = getGlobalThis(globalThis);
  if (!global.__REACT_DEVTOOLS_GLOBAL_HOOK__) return BuildTypeJsonEnum.production;

  const renderers = Array.from(global.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values?.() ?? []);
  const devRenderer = renderers.find((renderer) => detectReactBuildType(renderer) === BuildTypeJsonEnum.development);

  return devRenderer ? BuildTypeJsonEnum.development : BuildTypeJsonEnum.production;
};

export const { addFastRefreshSubscription, addOperationsSubscriptions, onReactDevToolsConnect } = (() => {
  const fastRefreshSubscriptions = new Set<(event: unknown) => void>();
  const operationsSubscriptions = new Set<(event: unknown) => void>();
  const connectSubscriptions = new Set<(event: unknown) => void>();

  const connectReactDevTools = () => {
    const global = getGlobalThis(window);

    if (isNil(global.__REACT_DEVTOOLS_GLOBAL_HOOK__?.listeners?.operations)) {
      setTimeout(connectReactDevTools, 100);

      return;
    }

    const { __REACT_DEVTOOLS_GLOBAL_HOOK__ } = global;
    assertIsNonNullable(__REACT_DEVTOOLS_GLOBAL_HOOK__, '__REACT_DEVTOOLS_GLOBAL_HOOK__ should be defined');

    const { listeners } = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    assertIsNonNullable(listeners, 'listeners should be defined');

    const { operations, fastRefreshScheduled } = listeners;
    assertIsNonNullable(operations, 'operations should be defined');
    assertIsNonNullable(fastRefreshScheduled, 'fastRefreshScheduled should be defined');

    operations.push((event) => {
      operationsSubscriptions.forEach((callback) => callback(event));
    });

    fastRefreshScheduled.push((event) => {
      fastRefreshSubscriptions.forEach((callback) => callback(event));
    });
  };

  /**
   * Add a callback to be invoked when React DevTools connects to the page.
   */
  const onReactDevToolsConnect = (callback: (event: unknown) => void) => {
    connectSubscriptions.add(callback);

    return () => {
      connectSubscriptions.delete(callback);
    };
  };

  const addFastRefreshSubscription = (callback: (event: unknown) => void) => {
    fastRefreshSubscriptions.add(callback);

    return () => {
      fastRefreshSubscriptions.delete(callback);
    };
  };

  const addOperationsSubscriptions = (callback: (event: unknown) => void) => {
    operationsSubscriptions.add(callback);

    return () => {
      operationsSubscriptions.delete(callback);
    };
  };

  connectReactDevTools();

  return {
    addFastRefreshSubscription,
    addOperationsSubscriptions,
    onReactDevToolsConnect,
  };
})();
