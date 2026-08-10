import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../theme';

// A two-layer flame silhouette (bigger outer tongue + smaller hotter core),
// same anatomy as a real candle flame. Drawn in a 100x100 box so `size` scales
// cleanly.
const OUTER_FLAME =
  'M50 4C38 20 22 38 22 60C22 79.3 34.5 94 50 94C65.5 94 78 79.3 78 60C78 38 62 20 50 4Z';
const INNER_FLAME =
  'M50 38C43 49 36 59 36 70C36 80.5 42.3 88 50 88C57.7 88 64 80.5 64 70C64 59 57 49 50 38Z';

const EMBER_COUNT = 3;
// Fixed per-ember horizontal drift and cadence — varied, not literally
// random, so the handful of embers scatter rather than move as one unit.
const EMBER_DRIFT = [0.28, -0.22, 0.1];
const EMBER_DURATION_MS = [1050, 1300, 1450];
const EMBER_DELAY_MS = [120, 520, 900];

const Ember = memo(function Ember({
  index,
  size,
  lit,
  reduceMotion,
}: {
  index: number;
  size: number;
  lit: boolean;
  reduceMotion: boolean;
}) {
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !lit) {
      rise.value = 0;
      return;
    }
    rise.value = withDelay(
      EMBER_DELAY_MS[index],
      withRepeat(withTiming(1, { duration: EMBER_DURATION_MS[index], easing: Easing.out(Easing.quad) }), -1, false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lit, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (1 - rise.value) * 0.7,
    transform: [
      { translateY: -rise.value * size * 0.8 },
      { translateX: rise.value * size * EMBER_DRIFT[index] },
      { scale: 1 - rise.value * 0.55 },
    ],
  }));

  const dotSize = Math.max(size * 0.07, 2);

  return (
    <Animated.View
      style={[
        styles.ember,
        { width: dotSize, height: dotSize, borderRadius: dotSize / 2, top: size * 0.12 },
        animatedStyle,
      ]}
    />
  );
});

export interface FlameIconProps {
  size?: number;
  /** Dormant flames render as a flat gray silhouette, matching the star's unlit state. */
  lit?: boolean;
  /** Static tilt in degrees, applied before the flicker sway — used to angle flanking flames outward. */
  tiltDeg?: number;
}

/**
 * An actual flame shape (not just a glow) — used to flank the Magen David
 * streak centerpiece. Gradient stays in the app's signature blue-fire palette
 * (see MagenDavidStreak) rather than a literal orange flame, so it reads as
 * this app's fire, not a generic icon.
 *
 * Sway is two layered wobbles — a slow lean plus a quicker, smaller jitter —
 * pivoting from the flame's base (`transformOrigin: bottom`) so the tip is
 * what actually flickers, like a flame anchored to a wick, rather than the
 * whole shape swinging like a pendulum.
 */
export const FlameIcon = memo(function FlameIcon({ size = 32, lit = true, tiltDeg = 0 }: FlameIconProps) {
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(1);
  const lean = useSharedValue(0);
  const jitter = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !lit) {
      flicker.value = 1;
      lean.value = 0;
      jitter.value = 0;
      return;
    }
    flicker.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 620, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.04, { duration: 460, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 540, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // Slow, uneven lean — deliberately asymmetric durations/amounts so it
    // doesn't read as a metronome swinging side to side.
    lean.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 950, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.6, { duration: 1150, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1050, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // Fast, tiny jitter on top of the lean — the quick restless flicker a
    // real flame tip has, at a distinctly different frequency from the lean.
    jitter.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(-0.7, { duration: 130, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.4, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 100, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lit, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tiltDeg}deg` },
      { scaleY: flicker.value },
      { rotate: `${lean.value * 4 + jitter.value * 2.2}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }]}>
      {lit &&
        Array.from({ length: EMBER_COUNT }).map((_, i) => (
          <Ember key={i} index={i} size={size} lit={lit} reduceMotion={reduceMotion} />
        ))}
      <Animated.View style={[styles.pivotBottom, animatedStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="flameOuter" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lit ? colors.accentLight : colors.surfacePressed} />
              <Stop offset="0.55" stopColor={lit ? colors.accent : colors.textMuted} stopOpacity={lit ? 1 : 0.5} />
              <Stop offset="1" stopColor={lit ? colors.accentDark : colors.textMuted} stopOpacity={lit ? 1 : 0.35} />
            </LinearGradient>
            <LinearGradient id="flameInner" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={lit ? 0.95 : 0.25} />
              <Stop offset="1" stopColor={colors.accentLight} stopOpacity={lit ? 0.85 : 0.15} />
            </LinearGradient>
          </Defs>
          <Path d={OUTER_FLAME} fill="url(#flameOuter)" />
          <Path d={INNER_FLAME} fill="url(#flameInner)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pivotBottom: {
    transformOrigin: 'bottom',
  },
  ember: {
    position: 'absolute',
    backgroundColor: colors.accentLight,
  },
});
