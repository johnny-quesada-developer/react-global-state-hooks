import { EffectCallback, useEffect } from 'react';

export const useInitialEffect = (effect: EffectCallback) => {
  useEffect(effect, []);
};
