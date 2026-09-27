import { createGlobalState } from 'react-global-state-hooks';
import { z } from 'zod';

// The shape of the whole state, saved fields and the rest alike.
const schema = z.object({
  theme: z.enum(['light', 'dark']),
  language: z.string(),
  sessionOnly: z.string(),
});

export type Preferences = z.infer<typeof schema>;

const initialPreferences: Preferences = { theme: 'light', language: 'en', sessionOnly: 'not saved' };

export const usePreferences = createGlobalState(initialPreferences, {
  localStorage: {
    key: 'docs:preferences',

    // Save only part of the state.
    selector: (state) => ({ theme: state.theme, language: state.language }),

    // Storage only carries the saved fields, so validate the state they produce. A parse error is
    // caught by the store, which then keeps the initial state.
    validator: ({ restored, initial }) => schema.parse({ ...initial, ...(restored as Partial<Preferences>) }),
  },
});
