// Navy + light blue + parchment brand palette (from the Tefillah Lock logo)
// — primary/navy is kept identical to app.config.ts's native iOS shield
// config so the native shield UI and JS screens match.
export const colors = {
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
  // Insights chart series — kept distinct in both hue and value from
  // `primary` (and from `accent`, used elsewhere for the mood line's own
  // legend dot) so a two-series line chart reads clearly against it.
  chartConnection: '#1B2A47',
  chartMood: '#5B9E8F',
} as const;

export type ColorToken = keyof typeof colors;