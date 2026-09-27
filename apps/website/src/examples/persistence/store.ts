import { createGlobalState } from 'react-global-state-hooks';
import { z } from 'zod';

export const ACCENTS = ['mint', 'sky', 'yellow'] as const;
export const SIZES = ['small', 'medium', 'large'] as const;

// The shape of the whole state, saved fields and the rest alike.
const schema = z.object({
  accent: z.enum(ACCENTS),
  size: z.enum(SIZES),
  compact: z.boolean(),
  draft: z.string(),
});

export type Preferences = z.infer<typeof schema>;

export const defaults: Preferences = { accent: 'mint', size: 'medium', compact: false, draft: '' };

export const STORAGE_KEY = 'examples:preferences';

export const usePreferences = createGlobalState(() => ({ ...defaults }), {
  name: 'persistedPreferences',
  localStorage: {
    key: STORAGE_KEY,

    // save only what should survive a reload
    selector: (state) => ({ accent: state.accent, size: state.size, compact: state.compact }),

    // storage only carries the saved fields, so validate the state they produce, not the fragment
    validator: ({ restored, initial }) => schema.parse({ ...initial, ...(restored as Partial<Preferences>) }),
  },
});
