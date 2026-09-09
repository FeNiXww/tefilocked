// Navy + light blue + parchment brand palette (from the Tefillok logo)
// — primary/navy is kept identical to app.config.ts's native iOS shield
// config so the native shield UI and JS screens match. This is the LIGHT
// palette; `darkColors` below mirrors every token for dark mode. Use
// `useTheme().colors` (see ThemeContext.tsx) rather than importing either
// of these directly, so screens react to the user's theme choice.
export const lightColors = {
  primary: '#1B2A47',
  primaryDark: '#101928',
  primaryLight: '#E9EDF4',
  accent: '#7FB2E5',
  accentDark: '#3E6E99',
  accentLight: '#E4EFFA',
  surface: '#F6F1E6',
  surfacePressed: '#EAE0C9',
  background: '#FFFDF9',
  textPrimary: '#16202E',
  textSecondary: '#57616F',
  // Darkened from the original #8B8E94, which fell to ~3.0-3.3:1 contrast
  // against `surface`/`background` — below WCAG AA's 4.5:1 for the caption
  // text it backs app-wide. #666970 clears both with margin.
  textMuted: '#666970',
  border: '#E7DFC9',
  success: '#3A8F6F',
  danger: '#C0455B',
  // Insights chart series — deliberately not `primary`/`accent` (those are
  // UI-chrome colors used everywhere else) so the two data lines read as
  // data, not as reused brand chrome. Connection is warm gold, mood is a
  // calming teal-blue — opposite ends of the color wheel so the two lines
  // never get confused even where they cross.
  chartConnection: '#C0872A',
  chartMood: '#3E93AE',
} as const;

// Dark mirror of `lightColors` — same brand hues (navy + light blue +
// parchment), inverted for a dark navy background instead of parchment.
// Every value re-checked for ~4.5:1 text contrast against the `surface`/
// `background` it's paired with.
export const darkColors: Record<keyof typeof lightColors, string> = {
  primary: '#8FBCEB',
  primaryDark: '#04070C',
  // primaryLight/accentLight are deliberately NOT inverted for dark mode —
  // several decorative gradients (MagenDavidStreak's lit glow, PermissionCard's
  // icon-chip badges) reuse these as "bright highlight" tints, not just
  // chrome backgrounds. A light-tinted badge/glow on a dark surface is a
  // normal, common dark-mode pattern, and keeping the value stable avoids a
  // literal light-token going *dark* and reading as an unlit/broken glow.
  primaryLight: '#E9EDF4',
  accent: '#7FB2E5',
  accentDark: '#8FC5F2',
  accentLight: '#E4EFFA',
  surface: '#161F30',
  surfacePressed: '#22304A',
  background: '#0B121C',
  textPrimary: '#EEF2F7',
  textSecondary: '#A9B4C2',
  textMuted: '#8C93A0',
  border: '#2A3550',
  success: '#4FBE94',
  danger: '#E2637A',
  chartConnection: '#E3A94C',
  chartMood: '#63B8D2',
} as const;

// Back-compat static export — still the light palette, for the handful of
// call sites that aren't inside a component (and thus can't call
// `useTheme()`). Prefer `useTheme().colors` everywhere else.
export const colors = lightColors;

export type ColorToken = keyof typeof lightColors;
export type ThemeColors = Record<ColorToken, string>;
