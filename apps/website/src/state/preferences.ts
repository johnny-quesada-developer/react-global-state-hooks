import { createGlobalState } from 'react-global-state-hooks';
import { useHydrated } from './useHydrated';
import { CODE_THEME_IDS, DEFAULT_CODE_THEME, resolveCodeTheme } from '../lib/code-themes.mjs';
import { useSyncExternalStore } from 'react';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

/** 'system' follows prefers-color-scheme; the other two override it for this browser. */
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface Preferences {
  packageManager: PackageManager;
  codeTheme: string;
  theme: Theme;
}

const defaults: Preferences = {
  packageManager: 'npm',
  codeTheme: DEFAULT_CODE_THEME,
  theme: 'system',
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

      const { packageManager, codeTheme, theme } = restored as Partial<Preferences>;

      return {
        packageManager: PACKAGE_MANAGERS.includes(packageManager as PackageManager)
          ? (packageManager as PackageManager)
          : initial.packageManager,
        codeTheme: CODE_THEME_IDS.includes(codeTheme as string) ? (codeTheme as string) : initial.codeTheme,
        theme: THEMES.includes(theme as Theme) ? (theme as Theme) : initial.theme,
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

/** The stored code theme after hydration, the default before it (see useHydrated). */
export function useCodeTheme(): string {
  const hydrated = useHydrated();
  const [codeTheme] = usePreferences((preferences) => preferences.codeTheme);

  return hydrated ? codeTheme : defaults.codeTheme;
}

/** The stored theme after hydration, 'system' before it (see useHydrated). */
export function useTheme(): Theme {
  const hydrated = useHydrated();
  const [theme] = usePreferences((preferences) => preferences.theme);

  return hydrated ? theme : defaults.theme;
}

/** True when the page is currently painted dark, whether that came from the choice or the system. */
export function useDarkAppearance(): boolean {
  const theme = useTheme();
  const systemDark = useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener('change', notify);

      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );

  return theme === 'system' ? systemDark : theme === 'dark';
}

/** The code theme actually in use: the stored one, or the one that matches the appearance. */
export function useResolvedCodeTheme(): string {
  const stored = useCodeTheme();
  const dark = useDarkAppearance();

  return resolveCodeTheme(stored, dark);
}
