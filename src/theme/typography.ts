import type { TextStyle } from 'react-native';
import { colors } from './colors';

const rtl: Pick<TextStyle, 'writingDirection'> = { writingDirection: 'rtl' };

export const typography = {
  hero: { ...rtl, fontSize: 30, fontWeight: '800', color: colors.textPrimary } satisfies TextStyle,
  title: { ...rtl, fontSize: 26, fontWeight: '700', color: colors.textPrimary } satisfies TextStyle,
  heading: { ...rtl, fontSize: 20, fontWeight: '600', color: colors.textPrimary } satisfies TextStyle,
  body: { ...rtl, fontSize: 16, color: colors.textPrimary } satisfies TextStyle,
  bodySecondary: { ...rtl, fontSize: 15, color: colors.textSecondary } satisfies TextStyle,
  caption: { ...rtl, fontSize: 13, color: colors.textMuted } satisfies TextStyle,
  eyebrow: {
    ...rtl,
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentDark,
    letterSpacing: 1,
  } satisfies TextStyle,
  button: { fontSize: 16, fontWeight: '600', color: colors.background } satisfies TextStyle,
} as const;