import { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
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
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Circle as SvgCircle, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { Flame } from './Flame';
import { tierForStreak } from './streakTiers';

const SPARKLE_ANGLES = [-100, -35, 15, 75, 145, 205];

function hexagramPoints(cx: number, cy: number, r: number, startAngleDeg: number): string {
  return [0, 120, 240]
    .map((offset) => {
      const angle = ((startAngleDeg + offset) * Math.PI) / 180;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

const GlowLayer = memo(function GlowLayer({
  size,
  duration,
  delay,
  peakOpacity,
  reduceMotion,
  active,
}: {
  size: number;
  duration: number;
  delay: number;
  peakOpacity: number;
  reduceMotion: boolean;
  active: boolean;
}) {
  const opacity = useSharedValue(active && reduceMotion ? peakOpacity : 0);

  useEffect(() => {
    if (!active) {
      opacity.value = withTiming(0, { duration: 300 });
      return;
    }
    if (reduceMotion) {
      opacity.value = peakOpacity;
      return;
    }
    opacity.value = withSequence(
      withTiming(peakOpacity, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(peakOpacity * 0.6, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(peakOpacity, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion, peakOpacity, duration]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.glow, { width: size, height: size }, animatedStyle]}>
      <Flame size={size} active={active} />
    </Animated.View>
  );
});

/** A single twinkling mote orbiting the halo — only earned at the top tier,
 * a small "you've leveled up" flourish rather than a core mechanic. */
const Sparkle = memo(function Sparkle({
  angleDeg,
  radius,
  delay,
  reduceMotion,
}: {
  angleDeg: number;
  radius: number;
  delay: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(reduceMotion ? 0.65 : 0.15);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.65;
      return;
    }
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, delay]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const angle = (angleDeg * Math.PI) / 180;

  return (
    <Animated.View
      style={[
        styles.sparkle,
        { transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }] },
        animatedStyle,
      ]}
    />
  );
});

export interface MagenDavidStreakProps {
  /** Consecutive-day streak count — drives the evolution tier. */
  streak: number;
  /** Whether today's prayer is already logged — dormant gray vs. lit blue. */
  litToday: boolean;
  size?: number;
}

/**
 * The Magen David streak centerpiece: a dormant gray outline star before
 * today's prayer, a glowing blue star (with more halo layers, a glossier
 * inner highlight, and a stronger breathing pulse at higher streaks) after.
 * A same-session flip from dormant to lit plays a one-shot "pop" — the daily
 * lighting moment.
 */
export function MagenDavidStreak({ streak, litToday, size = 96 }: MagenDavidStreakProps) {
  const reduceMotion = useReducedMotion();
  const tier = tierForStreak(streak);

  const glow = useSharedValue(litToday ? 1 : 0);
  const pop = useSharedValue(1);
  const breathe = useSharedValue(1);
  const idleBreathe = useSharedValue(1);
  const rotate = useSharedValue(0);
  const wasLit = useRef(litToday);

  useEffect(() => {
    const justLit = litToday && !wasLit.current;
    wasLit.current = litToday;

    if (reduceMotion) {
      glow.value = litToday ? 1 : 0;
      pop.value = 1;
      return;
    }

    glow.value = withTiming(litToday ? 1 : 0, { duration: 450, easing: Easing.out(Easing.cubic) });
    if (justLit) {
      pop.value = 0.7;
      pop.value = withSequence(
        withTiming(1.18, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.sin) })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litToday, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !litToday) {
      breathe.value = 1;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1 + tier.pulseScale, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litToday, reduceMotion, tier.pulseScale]);

  useEffect(() => {
    // A barely-there idle breathing while dormant — enough that the star
    // reads as "waiting," not broken or static, without competing with the
    // much bigger, more energetic breathing it earns once lit.
    if (reduceMotion || litToday) {
      idleBreathe.value = 1;
      return;
    }
    idleBreathe.value = withRepeat(
      withSequence(
        withTiming(1.015, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litToday, reduceMotion]);

  useEffect(() => {
    // The top tier earns a slow shimmer rotation — a full 360° loop reads as
    // seamless (start and end orientation are identical), so no easing trick
    // is needed to hide the restart.
    if (reduceMotion || !litToday || !tier.sparkles) {
      rotate.value = 0;
      return;
    }
    rotate.value = withRepeat(withTiming(360, { duration: 26000, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litToday, reduceMotion, tier.sparkles]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value * breathe.value * idleBreathe.value }, { rotate: `${rotate.value}deg` }],
  }));

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const strokeWidth = Math.max(size * 0.05, 1.5);
  const fillGradientId = 'magenDavidStreakFill';
  const highlightGradientId = 'magenDavidStreakHighlight';

  const haloBase = size * tier.haloReach;
  const showSparkles = litToday && tier.sparkles;

  return (
    <View style={[styles.container, { width: haloBase, height: haloBase }]}>
      {Array.from({ length: tier.glowLayers }).map((_, i) => {
        const layerScale = 1 - i * 0.28;
        return (
          <GlowLayer
            key={i}
            size={haloBase * layerScale}
            duration={1600 + i * 500}
            delay={i * 150}
            peakOpacity={tier.haloOpacity * (1 - i * 0.18)}
            reduceMotion={reduceMotion}
            active={litToday}
          />
        );
      })}

      {showSparkles &&
        SPARKLE_ANGLES.map((angleDeg, i) => (
          <Sparkle
            key={angleDeg}
            angleDeg={angleDeg}
            radius={haloBase * 0.46}
            delay={i * 260}
            reduceMotion={reduceMotion}
          />
        ))}

      <Animated.View style={starAnimatedStyle}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            {/* userSpaceOnUse + explicit coordinates spanning the whole star:
                the two triangles have different bounding boxes (one apex-up,
                one apex-down), so the default per-shape objectBoundingBox
                gradient sampled each one's 0-100% independently — same fill,
                but with a visible seam where they overlap, reading as "two
                triangles" instead of one lit star. Anchoring both triangles
                to the same absolute coordinates removes the seam. */}
            <LinearGradient id={fillGradientId} gradientUnits="userSpaceOnUse" x1={cx} y1={cy - r} x2={cx} y2={cy + r}>
              <Stop offset="0" stopColor={colors.accentLight} />
              <Stop offset="0.55" stopColor={colors.accent} />
              <Stop offset="1" stopColor={colors.accentDark} />
            </LinearGradient>
            <RadialGradient id={highlightGradientId} cx="50%" cy="50%" r="60%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Lit state is hollow (stroke only, no fill): a solid-filled
              hexagram reads as a generic six-pointed blob once the gradient
              seam is gone — the interlocking-triangle outline is what actually
              reads as "Magen David." A thicker gradient-colored stroke keeps
              it visually weighty without filling the shape in. */}
          <Polygon
            points={hexagramPoints(cx, cy, r, -90)}
            fill={litToday ? 'none' : colors.surfacePressed}
            fillOpacity={litToday ? 0 : 0.6}
            stroke={litToday ? `url(#${fillGradientId})` : colors.textMuted}
            strokeWidth={litToday ? strokeWidth * 1.9 : strokeWidth}
            strokeLinejoin="round"
          />
          <Polygon
            points={hexagramPoints(cx, cy, r, 90)}
            fill={litToday ? 'none' : colors.surfacePressed}
            fillOpacity={litToday ? 0 : 0.6}
            stroke={litToday ? `url(#${fillGradientId})` : colors.textMuted}
            strokeWidth={litToday ? strokeWidth * 1.9 : strokeWidth}
            strokeLinejoin="round"
          />
          {/* A faint glow filling the hollow center — subtle at low tiers,
              brighter at high ones, so evolution still reads as "more
              radiant" without going back to a solid-filled star. */}
          {litToday && (
            <SvgCircle cx={cx} cy={cy} r={r * 0.55} fill={`url(#${highlightGradientId})`} opacity={tier.highlightOpacity * 1.4} />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
});
