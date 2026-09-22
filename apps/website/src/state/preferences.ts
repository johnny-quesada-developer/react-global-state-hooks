import { createGlobalState } from 'react-global-state-hooks';
import { useHydrated } from './useHydrated';

export const PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export type HeroSound = 'on' | 'off' | null;

export interface Preferences {
  packageManager: PackageManager;
  miniMeHidden: boolean;
  heroSoundOffered: boolean;
  heroSound: HeroSound;
}

const defaults: Preferences = {
  packageManager: 'npm',
  miniMeHidden: false,
  heroSoundOffered: false,
  heroSound: null,
};

/**
 * Visitor preferences shared by every island on every page (install command tab, mini-me strip, and whether
 * the hero video has already played with sound, and the visitor's own sound choice for it).
 * Saved to localStorage; anything unexpected in storage falls back to the defaults.
 */
export const usePreferences = createGlobalState(defaults, {
  name: '_sitePreferences',
  localStorage: {
    key: 'user-preferences',
    validator: ({ restored, initial }) => {
      if (typeof restored !== 'object' || restored === null) return initial;

      const { packageManager, miniMeHidden, heroSoundOffered, heroSound } = restored as Partial<Preferences>;

      return {
        packageManager: PACKAGE_MANAGERS.includes(packageManager as PackageManager)
          ? (packageManager as PackageManager)
          : initial.packageManager,
        miniMeHidden: typeof miniMeHidden === 'boolean' ? miniMeHidden : initial.miniMeHidden,
        heroSoundOffered: typeof heroSoundOffered === 'boolean' ? heroSoundOffered : initial.heroSoundOffered,
        heroSound: heroSound === 'on' || heroSound === 'off' ? heroSound : initial.heroSound,
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

/** The stored mini-me visibility after hydration, the default before it. */
export function useMiniMeHidden(): boolean {
  const hydrated = useHydrated();
  const [hidden] = usePreferences((preferences) => preferences.miniMeHidden);

  return hydrated ? hidden : defaults.miniMeHidden;
}
