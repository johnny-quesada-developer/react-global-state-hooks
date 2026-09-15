import { createContext } from 'react-global-state-hooks';

export type FormState = {
  name: string;
  email: string;
};

/**
 * Context-scoped state (state lives per-Provider instance rather than globally).
 * Exercises the `createContext` path with actions so context stores also appear
 * in the DevTools panel.
 */
export const FormContext = createContext(
  { name: '', email: '' } as FormState,
  {
    name: 'form-context',
    actions: {
      setField(field: keyof FormState, value: string) {
        return ({ setState }) => {
          setState((s) => ({ ...s, [field]: value }));
        };
      },

      reset() {
        return ({ setState }) => {
          setState({ name: '', email: '' });
        };
      },
    },
  },
);
