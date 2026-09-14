import { EffectCallback, useEffect } from 'react';

export const useInitialEffect = (effect: EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};
