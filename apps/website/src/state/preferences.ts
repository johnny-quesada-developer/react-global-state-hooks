import { createGlobalState } from 'react-global-state-hooks';
import { useHydrated } from './useHydrated';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface Preferences {
  packageManager: PackageManager;
}

const defaults: Preferences = {
  packageManager: 'npm',
};

/**
 * Visitor preferences shared by every island on every page (the install command tab).
 * Saved to localStorage; anything unexpected in storage falls back to the defaults.
 */
export const usePreferences = createGlobalState(defaults, {
  name: '_sitePreferences',
  localStorage: {
    key: 'user-preferences',
    validator: ({ restored, initial }) => {
      if (typeof restored !== 'object' || restored === null) return initial;

      const { packageManager } = restored as Partial<Preferences>;

      return {
        packageManager: PACKAGE_MANAGERS.includes(packageManager as PackageManager)
          ? (packageManager as PackageManager)
          : initial.packageManager,
      };
    },
  },
});

/** The stored package manager after hydration, the default before it (see useHydrated). */
export function usePackageManager(): PackageManager {
  const hydrated = useHydrated();
  const [packageManager] = usePreferences((preferences) => preferences.packageManager);

  return hydrated ? packageManager : defaults.packageManager;
}
