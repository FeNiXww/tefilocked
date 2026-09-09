import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

// A teardrop/flame silhouette (viewBox 0-100) plus a smaller, lighter inner
// "core" flame nested inside it for a two-tone hot-center look — cheaper and
// more robust than animating the path shape itself, so the flicker below is
// done entirely with transforms.
const FLAME_OUTER = 'M50 6 C 74 34 88 52 84 70 C 81 84 68 94 50 94 C 32 94 19 84 16 70 C 12 52 26 34 50 6 Z';
const FLAME_INNER = 'M50 34 C 62 50 68 60 66 70 C 64 80 58 86 50 86 C 42 86 36 80 34 70 C 32 60 38 50 50 34 Z';

const EMBER_COUNT = 4;
// Fixed per-ember horizontal drift target and cadence, chosen to look
// scattered rather than synchronized — not literally random (would refire
// differently every render), just varied enough that the embers don't read
// as one repeating unit.
const EMBER_DRIFT = [0.22, -0.3, 0.12, -0.16];
const EMBER_DURATION_MS = [1000, 1300, 1150, 1450];
const EMBER_DELAY_MS = [0, 340, 700, 1050];

const Ember = memo(function Ember({
  index,
  size,
  active,
  reduceMotion,
  color,
  tempo,
  startDelay,
}: {
  index: number;
  size: number;
  active: boolean;
  reduceMotion: boolean;
  color: string;
  tempo: number;
  startDelay: number;
}) {
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) {
      rise.value = 0;
      return;
    }
    rise.value = withDelay(
      startDelay + EMBER_DELAY_MS[index],
      withRepeat(withTiming(1, { duration: Math.round(EMBER_DURATION_MS[index] * tempo), easing: Easing.out(Easing.quad) }), -1, false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (1 - rise.value) * 0.75,
    transform: [
      { translateY: -rise.value * size * 0.85 },
      { translateX: rise.value * size * EMBER_DRIFT[index] },
      { scale: 1 - rise.value * 0.55 },
    ],
  }));

  const dotSize = Math.max(size * 0.07, 2);

  return (
    <Animated.View
      style={[
        styles.ember,
        { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, top: size * 0.1 },
        animatedStyle,
      ]}
    />
  );
});

export interface FlameProps {
  size?: number;
  /** Whether the flame is burning — false renders nothing (matches GlowLayer's `active`). */
  active?: boolean;
  opacity?: number;
  outerColor?: string;
  outerColorDark?: string;
  innerColor?: string;
  /** Small embers drifting up off the tip — off by default (used behind soft ambient halos), on for an actual foreground flame. */
  particles?: boolean;
  /** Ignition-burst scale (0 → 1.4 → spring to 1), driven by the parent when a new day lights. Omit for flames that should just render at a constant scale. */
  burst?: SharedValue<number>;
}

/**
 * A small animated blue flame — the app's streak visuals (the Magen David's
 * halo, each day-of-week cell) use this instead of a plain glowing circle,
 * so "the streak is lit" reads as fire, not just a blurred dot.
 *
 * The sway is two layered wobbles — a slow directional lean plus a quicker,
 * smaller jitter on top — rather than one clean back-and-forth sweep, so it
 * doesn't read as a metronome. Both pivot from the flame's base, like a real
 * flame anchored to a wick: the base stays put and the tip is what actually
 * moves.
 */
export function Flame({
  size = 48,
  active = true,
  opacity = 1,
  outerColor,
  outerColorDark,
  innerColor,
  particles = false,
  burst,
}: FlameProps) {
  const { colors } = useTheme();
  const resolvedOuterColor = outerColor ?? colors.accent;
  const resolvedOuterColorDark = outerColorDark ?? colors.accentDark;
  const resolvedInnerColor = innerColor ?? colors.accentLight;
  const lean = useSharedValue(0);
  const jitter = useSharedValue(0);
  const stretch = useSharedValue(1);
  const flicker = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  // Two per-instance random numbers, generated once at mount and stable
  // across re-renders — without these every flame on screen (all built from
  // the same fixed durations) would flicker in perfect lockstep, reading as
  // one repeating unit instead of separate candles. `tempo` stretches or
  // compresses every duration below so instances drift out of phase with
  // each other over time (not just start offset), and `startDelay` staggers
  // when each one begins.
  const [tempo] = useState(() => 0.8 + Math.random() * 0.4);
  const [startDelay] = useState(() => Math.random() * 650);

  useEffect(() => {
    if (reduceMotion || !active) {
      lean.value = 0;
      jitter.value = 0;
      stretch.value = 1;
      flicker.value = 1;
      return;
    }
    const d = (ms: number) => Math.round(ms * tempo);
    // Slow, uneven directional lean — the flame's general "drift" from one
    // side to the other, never symmetric so it doesn't feel like a pendulum.
    lean.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: d(900), easing: Easing.inOut(Easing.sin) }),
          withTiming(-0.5, { duration: d(1100), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: d(700), easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: d(1000), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.15, { duration: d(850), easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: d(600), easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // Fast, tiny jitter layered on top of the lean — the quick, restless
    // flicker real flame tips have, distinct in frequency from the slow lean.
    jitter.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: d(90), easing: Easing.inOut(Easing.quad) }),
          withTiming(-0.7, { duration: d(120), easing: Easing.inOut(Easing.quad) }),
          withTiming(0.5, { duration: d(80), easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: d(110), easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: d(100), easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: d(90), easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
    stretch.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: d(260), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: d(360), easing: Easing.inOut(Easing.sin) }),
          withTiming(1.06, { duration: d(230), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: d(310), easing: Easing.inOut(Easing.sin) }),
          withTiming(1.03, { duration: d(200), easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: d(240), easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    flicker.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(0.82, { duration: d(180), easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: d(260), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.88, { duration: d(150), easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: d(300), easing: Easing.inOut(Easing.sin) }),
          withTiming(0.9, { duration: d(190), easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: d(220), easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  // Pivoting from the base is done with an explicit translate/…/translate
  // around the view's own center — not the `transformOrigin` style prop, whose
  // native support has been inconsistent across platforms (it rendered the
  // pivot in the wrong place on Android, making the flame read as tilted).
  // The non-uniform scales (scaleX != scaleY) must happen BEFORE rotate, not
  // after: scaling along axes that are already rotated shears the shape
  // instead of stretching it, which is what actually produced the skewed,
  // tilted-looking flame — rotate must be the last, purely-rigid step.
  const halfSize = size / 2;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity * flicker.value,
    transform: [
      { translateY: halfSize },
      { scaleY: stretch.value },
      { scaleX: 2 - stretch.value * 0.6 },
      { scale: burst ? burst.value : 1 },
      { rotate: `${lean.value * 3.2 + jitter.value * 1.8}deg` },
      { translateY: -halfSize },
    ],
  }));

  if (!active) return null;

  const outerGradientId = `flameOuter-${size}`;
  const innerGradientId = `flameInner-${size}`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {particles &&
        Array.from({ length: EMBER_COUNT }).map((_, i) => (
          <Ember
            key={i}
            index={i}
            size={size}
            active={active}
            reduceMotion={reduceMotion}
            color={i % 2 === 0 ? resolvedInnerColor : resolvedOuterColor}
            tempo={tempo}
            startDelay={startDelay}
          />
        ))}
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={outerGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={resolvedOuterColor} />
              <Stop offset="1" stopColor={resolvedOuterColorDark} />
            </LinearGradient>
            <LinearGradient id={innerGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor={resolvedInnerColor} />
            </LinearGradient>
          </Defs>
          <Path d={FLAME_OUTER} fill={`url(#${outerGradientId})`} />
          <Path d={FLAME_INNER} fill={`url(#${innerGradientId})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ember: {
    position: 'absolute',
  },
});
