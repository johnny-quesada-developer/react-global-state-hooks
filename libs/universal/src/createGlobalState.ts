import type { CreateGlobalState } from './types';
import { GlobalStore } from './GlobalStore';

/**
 * Creates a global state hook
 */
export const createGlobalState = ((...[state, args]: ConstructorParameters<typeof GlobalStore>) =>
  new GlobalStore(state, args).use) as CreateGlobalState;

export default createGlobalState;
export type { InferActionsType, InferStateApi, AnyActions } from './types';
