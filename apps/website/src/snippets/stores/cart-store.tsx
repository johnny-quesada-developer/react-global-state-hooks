import { createGlobalState } from 'react-global-state-hooks';

export const useCart = createGlobalState({ items: [] as string[] }, { metadata: { currency: 'USD' } });

export function CartSummary() {
  // [state, setState, metadata]: the third item is the store's non-reactive metadata.
  const [cart, setCart, metadata] = useCart();

  return (
    <button onClick={() => setCart((current) => ({ ...current, items: [...current.items, 'book'] }))}>
      {cart.items.length} items ({metadata.currency})
    </button>
  );
}
