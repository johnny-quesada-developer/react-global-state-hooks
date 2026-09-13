export type {
  InferActionsType,
  InferStateApi,
  AnyActions,
} from 'react-hooks-global-states/createGlobalState';

import type { CreateGlobalState } from './types';
import GlobalStore from './GlobalStore';

/**
 * Creates a global state hook.
 * @param state - The initial state value.
 * @param args - Optional configuration arguments.
 * @returns A state hook for managing the global state, the hook also embeds the state api methods.
 */
export const createGlobalState = ((...args: ConstructorParameters<typeof GlobalStore>) => {
  return new GlobalStore(...args).use;
}) as CreateGlobalState;

export default createGlobalState;
