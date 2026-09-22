import { createContext, createGlobalState } from 'react-global-state-hooks';

// A function initializer lets reset() restore a fresh state before each test.
export const useCart = createGlobalState(() => ({ items: [] as string[] }), {
  actions: {
    add(item: string) {
      return ({ setState }) => {
        setState((state) => ({ items: [...state.items, item] }));
      };
    },
  },
});

export const CartContext = createContext(
  { items: [] as string[] },
  {
    actions: {
      add(item: string) {
        return ({ setState }) => {
          setState((state) => ({ items: [...state.items, item] }));
        };
      },
    },
  },
);
