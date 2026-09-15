import { useEffect } from 'react';
import useStableCallback from './useStableCallback';

type CleanupFunction = () => void;

// Run `callback` once on mount using its latest closure. `useStableCallback` returns a stable
// reference (identity never changes), so listing it in the deps array does not re-run the effect
// — it's there only to satisfy the exhaustive-deps lint rule. (Replaces React 19's experimental
// `useEffectEvent` with a React 18-compatible equivalent.)
export const useMountEffect = (callback: () => CleanupFunction | void) => {
  const handler = useStableCallback(callback);

  useEffect(() => {
    return handler();
  }, [handler]);
};

export default useMountEffect;
