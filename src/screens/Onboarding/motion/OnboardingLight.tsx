import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Circle, Stop } from 'react-native-svg';
import { useOnboardingPalette, type OnboardingPalette } from './tokens';

export type LightTone = 'cold' | 'warm' | 'ember';

function toneColor(palette: OnboardingPalette, tone: LightTone): string {
  if (tone === 'cold') return palette.coldGlow;
  if (tone === 'ember') return palette.ember;
  return palette.warmGlow;
}

interface FocalLightProps {
  /** Diameter of the glow's bounding box. */
  size: number;
  tone?: LightTone;
  /** Peak opacity once fully revealed — keep low (0.18-0.35); the light should be felt, not seen as a shape. */
  peakOpacity?: number;
  /** Externally driven reveal — 0 hidden, 1 fully bloomed. Pass a shared value to sync with a scene's own choreography (e.g. a hold gesture); omit for a self-timed reveal-on-mount. */
  reveal?: SharedValue<number>;
  /** Self-timed reveal duration when `reveal` isn't provided. */
  revealDurationMs?: number;
  /** A slow breathing pulse once revealed — off by default; most focal lights should sit still so they read as light, not decoration. */
  breathe?: boolean;
  style?: object;
}

/**
 * A single soft, positioned glow — the "someone is standing behind this"
 * light source used behind a scene's hero content (a headline, a number, the
 * streak star). Built from an SVG radial gradient rather than a flat
 * translucent circle, so it actually falls off like light instead of reading
 * as a colored blob with a hard edge — and rather than a blurred View, since
 * expo-blur isn't part of this project's dependency set.
 */
export function FocalLight({
  size,
  tone = 'warm',
  peakOpacity = 0.28,
  reveal,
  revealDurationMs = 900,
  breathe = false,
  style,
}: FocalLightProps) {
  const palette = useOnboardingPalette();
  const color = toneColor(palette, tone);
  const reduceMotion = useReducedMotion();
  const internalOpacity = useSharedValue(reduceMotion ? peakOpacity : 0);

  useEffect(() => {
    if (reveal) return; // externally driven
    if (reduceMotion) {
      internalOpacity.value = peakOpacity;
      return;
    }
    if (breathe) {
      internalOpacity.value = withSequence(
        withTiming(peakOpacity, { duration: revealDurationMs, easing: Easing.out(Easing.cubic) }),
        withRepeat(
          withSequence(
            withTiming(peakOpacity * 0.72, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            withTiming(peakOpacity, { duration: 2200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    } else {
      internalOpacity.value = withTiming(peakOpacity, {
        duration: revealDurationMs,
        easing: Easing.out(Easing.cubic),
      });
    }
    return () => cancelAnimation(internalOpacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, peakOpacity, revealDurationMs, breathe]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reveal ? reveal.value * peakOpacity : internalOpacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { width: size, height: size }, animatedStyle, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="focal" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.9} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#focal)" />
      </Svg>
    </Animated.View>
  );
}

interface AmbientWashProps {
  /** 0 (cold) to 1 (warm) — cross-fades two large soft washes rather than animating a gradient's colors directly, which is cheaper and avoids per-frame SVG regeneration. */
  world: number | SharedValue<number>;
  width: number;
  height: number;
}

/**
 * The large, barely-there gradient wash that tints a whole scene toward cold
 * or warm without ever reading as a visible shape — the atmospheric half of
 * the "cold digital → warm spiritual" progression. Two full-bleed radial
 * washes (one cold, one warm) sit stacked; only their opacity balance moves.
 */
export function AmbientWash({ world, width, height }: AmbientWashProps) {
  const palette = useOnboardingPalette();
  const isShared = typeof world !== 'number';
  const staticWorld = typeof world === 'number' ? world : 0;

  const warmStyle = useAnimatedStyle(() => ({
    opacity: (isShared ? (world as SharedValue<number>).value : staticWorld) * 0.16,
  }));
  const coldStyle = useAnimatedStyle(() => ({
    opacity: (1 - (isShared ? (world as SharedValue<number>).value : staticWorld)) * 0.14,
  }));

  const size = Math.max(width, height) * 1.3;

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.washWrap, { width: size, height: size, top: -size * 0.35, left: -size * 0.15 }, coldStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="coldWash" cx="35%" cy="20%" r="65%">
              <Stop offset="0" stopColor={palette.coldGlow} stopOpacity={0.8} />
              <Stop offset="1" stopColor={palette.coldGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#coldWash)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.washWrap, { width: size, height: size, top: height - size * 0.65, left: width - size * 0.7 }, warmStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="warmWash" cx="65%" cy="70%" r="65%">
              <Stop offset="0" stopColor={palette.warmGlow} stopOpacity={0.85} />
              <Stop offset="1" stopColor={palette.warmGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#warmWash)" />
        </Svg>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  washWrap: {
    position: 'absolute',
  },
});
