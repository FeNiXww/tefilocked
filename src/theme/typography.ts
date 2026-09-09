import type { TextStyle } from 'react-native';
import { colors, type ThemeColors } from './colors';

const rtl: Pick<TextStyle, 'writingDirection'> = { writingDirection: 'rtl' };

// Display serif for the onboarding narrative beats (intro pager + question
// headers) — a deliberate departure from the system-font weight scale below,
// which read as generic/AI-generated for those headline moments. Scoped to
// just those screens rather than folded into `hero`, since most `hero`
// consumers (paywall, settings) are meant to keep the plain system font.
export const headlineFontFamily = 'FrankRuhlLibre_800ExtraBold';

/** Builds the typography scale against a given palette — call with `useTheme().colors` so headings/body text follow the active light/dark theme. */
export function createTypography(themeColors: ThemeColors) {
  return {
    hero: { ...rtl, fontSize: 30, fontWeight: '800', color: themeColors.textPrimary } satisfies TextStyle,
    title: { ...rtl, fontSize: 26, fontWeight: '700', color: themeColors.textPrimary } satisfies TextStyle,
    heading: { ...rtl, fontSize: 20, fontWeight: '600', color: themeColors.textPrimary } satisfies TextStyle,
    body: { ...rtl, fontSize: 16, color: themeColors.textPrimary } satisfies TextStyle,
    bodySecondary: { ...rtl, fontSize: 15, color: themeColors.textSecondary } satisfies TextStyle,
    caption: { ...rtl, fontSize: 13, color: themeColors.textMuted } satisfies TextStyle,
    eyebrow: {
      ...rtl,
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.accentDark,
      letterSpacing: 1,
    } satisfies TextStyle,
    button: { fontSize: 16, fontWeight: '600', color: themeColors.background } satisfies TextStyle,
    // Siddur-style full-text reading screen (ContentDisplay/VerseReader) —
    // none of the tokens above are sized/weighted right for long-form body
    // copy, so this is its own scale rather than a reuse of `hero`/`heading`.
    readingTitle: { ...rtl, fontSize: 26, fontWeight: '700', color: themeColors.textPrimary } satisfies TextStyle,
    readingSource: { ...rtl, fontSize: 14, color: themeColors.textMuted } satisfies TextStyle,
    verseText: { ...rtl, fontSize: 26, lineHeight: 42, fontWeight: '500', color: themeColors.textPrimary } satisfies TextStyle,
    verseNumber: { fontSize: 12, fontWeight: '700', color: themeColors.accentDark } satisfies TextStyle,
  } as const;
}

export type Typography = ReturnType<typeof createTypography>;

// Back-compat static export (light palette) — for the handful of call sites
// that aren't inside a component. Prefer `useTheme().typography` elsewhere.
export const typography = createTypography(colors);
