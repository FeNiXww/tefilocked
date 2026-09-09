import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getStoredThemeMode, setStoredThemeMode, type StoredThemeMode } from '../data/storage/mmkv';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { createTypography, headlineFontFamily, type Typography } from './typography';
import { spacing } from './spacing';

export type ThemeMode = StoredThemeMode;
export type ResolvedScheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's chosen preference — 'system' follows the OS setting. */
  mode: ThemeMode;
  /** 'light' | 'dark' — `mode` resolved against the current OS appearance when mode is 'system'. */
  scheme: ResolvedScheme;
  colors: ThemeColors;
  typography: Typography;
  spacing: typeof spacing;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const systemScheme = useColorScheme();

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setStoredThemeMode(next);
  };

  const scheme: ResolvedScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const themeColors = scheme === 'dark' ? darkColors : lightColors;
  const themeTypography = useMemo(() => createTypography(themeColors), [themeColors]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors: themeColors, typography: themeTypography, spacing, setMode }),
    [mode, scheme, themeColors, themeTypography]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The single entry point for theme-aware colors/typography — use this instead of the static `colors`/`typography` exports so screens react to the user's light/dark/system choice. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be called within a ThemeProvider (see App.tsx).');
  }
  return ctx;
}

export { headlineFontFamily };
