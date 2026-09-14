import { useEffect, useEffectEvent } from 'react';

type CleanupFunction = () => void;

export const useMountEffect = (callback: () => CleanupFunction | void) => {
  const handler = useEffectEvent(callback);

  useEffect(() => {
    return handler();
  }, []);
};

export default useMountEffect;
