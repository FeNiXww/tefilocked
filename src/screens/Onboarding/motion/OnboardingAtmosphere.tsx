import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../../theme';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { AmbientWash } from './OnboardingLight';
import { OnboardingParticles } from './OnboardingParticles';
import { useOnboardingPalette, type OnboardingRichness } from './tokens';

const STAR_COUNT: Record<OnboardingRichness, number> = {
  quiet: 3,
  balanced: 7,
  rich: 10,
  dramatic: 5,
};

interface OnboardingAtmosphereProps {
  /** 0 (cold digital) to 1 (warm spiritual) — see motion/tokens.ts WORLD. Pass a shared value for a scene that shifts world mid-beat (e.g. Purpose, the interruption moment). */
  world: number | SharedValue<number>;
  richness?: OnboardingRichness;
  /** Extra floating dust/ember motes — reserved for scenes where they genuinely add atmosphere (spec: not every screen). */
  particles?: boolean;
  /** Deepens the backdrop in dark mode only — used for the most "quiet"/"dramatic" beats (first impression, time revelation, commitment). Never applied in light mode, so parchment stays parchment. */
  vignette?: boolean;
}

/**
 * The base layer every onboarding scene sits on: the existing Magen-David
 * sparkle motif (brand identity, kept as-is) plus a large, near-invisible
 * cold/warm ambient wash that carries the "distraction → intention"
 * throughline, and — sparingly — a few atmospheric motes. `richness` gives
 * scenes rhythm (a quiet scene shows fewer stars and no particles; a rich
 * one shows more) instead of every screen reusing one identical backdrop.
 */
export function OnboardingAtmosphere({ world, richness = 'balanced', particles = false, vignette = false }: OnboardingAtmosphereProps) {
  const { width, height } = useWindowDimensions();
  const { scheme } = useTheme();
  const palette = useOnboardingPalette();
  const staticWorld = typeof world === 'number' ? world : undefined;
  const tone = staticWorld !== undefined && staticWorld >= 0.5 ? 'accent' : 'navy';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SparkleBackground tone={tone} starCount={STAR_COUNT[richness]} />
      <AmbientWash world={world} width={width} height={height} />
      {vignette && scheme === 'dark' && <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.vignette }]} />}
      {particles && <OnboardingParticles richness={richness} tone={staticWorld !== undefined && staticWorld >= 0.5 ? 'warm' : 'cold'} />}
    </View>
  );
}
