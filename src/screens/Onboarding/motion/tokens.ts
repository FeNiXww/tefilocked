import { useTheme } from '../../../theme';

/**
 * The onboarding's own light palette — warm ember/gold tones that don't exist
 * in the app's global navy/light-blue/parchment brand palette (theme/colors.ts).
 * Deliberately scoped to onboarding + paywall only: the "cold digital world →
 * warm spiritual world" progression (see WORLD below) is a narrative device
 * for this one flow, not a brand change, so it stays out of ThemeColors.
 */
export interface OnboardingPalette {
  /** Cool light used for "digital distraction" moments — phone, apps, scrolling. */
  coldGlow: string;
  coldDeep: string;
  /** Warm light used for prayer, commitment, and other spiritually-charged moments. */
  warmGlow: string;
  warmDeep: string;
  /** The warmest accent — embers, focal points at the most intentional beats. */
  ember: string;
  /** Dark-mode-only depth wash; kept empty/transparent in light mode so parchment never muddies. */
  vignette: string;
}

// Gold/champagne, not orange — an earlier pass leaned the warm side of the
// palette too far toward literal orange, which read as harsh rather than
// warm. These stay in the same "warm light" family (higher green channel,
// lower saturation) without tipping into orange.
const LIGHT_PALETTE: OnboardingPalette = {
  coldGlow: '#8FB6E0',
  coldDeep: '#3E6E99',
  warmGlow: '#EDD8A0',
  warmDeep: '#C9A24A',
  ember: '#D4A83A',
  vignette: 'rgba(22, 32, 46, 0.05)',
};

const DARK_PALETTE: OnboardingPalette = {
  coldGlow: '#4C7FAE',
  coldDeep: '#16233A',
  warmGlow: '#F0DBA0',
  warmDeep: '#C7A050',
  ember: '#E3C169',
  vignette: 'rgba(0, 0, 0, 0.5)',
};

/** The active onboarding light palette for the current light/dark theme. */
export function useOnboardingPalette(): OnboardingPalette {
  const { scheme } = useTheme();
  return scheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/**
 * How "settled" a scene should feel — drives particle density, glow layer
 * count, and star count, so the flow has rhythm instead of every screen
 * looking like "dark gradient + glowing card + button."
 */
export type OnboardingRichness = 'quiet' | 'balanced' | 'rich' | 'dramatic';

/**
 * 0 = cold digital distraction, 1 = warm spiritual intention. The single
 * emotional throughline every scene's atmosphere/light is positioned along.
 * Values are the plan's own judgment call per beat, not a strict formula —
 * nudge a scene's number if its treatment should read colder/warmer.
 */
export const WORLD = {
  logoIntro: 0.08,
  embrace: 0.05,
  lockdown: 0.15,
  name: 0.15,
  gender: 0.15,
  age: 0.15,
  phoneUsage: 0.1,
  bombshellOpening: 0.02,
  bombshellReveal: 0.12,
  purposeStart: 0.15,
  purposeEnd: 0.6,
  coreLoopDemo: 0.55,
  coreLoopStreak: 0.85,
  planReady: 0.7,
  commitmentSelect: 0.55,
  commitmentHold: 0.95,
  appSelection: 0.3,
  permissionSetup: 0.4,
  notificationPrimer: 0.45,
  widgetPrimer: 0.45,
  valueBridgeCompare: 0.35,
  valueBridgeThesis: 0.7,
  paywall: 0.55,
  paywallExitOffer: 0.65,
} as const;
