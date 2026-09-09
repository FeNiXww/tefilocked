import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { AnimatedStarsBackground } from './AnimatedStarsBackground';
import { useTheme } from '../theme';

/** Two triangles offset 180° apart trace the classic hexagram/Magen David outline. */
function hexagramPoints(cx: number, cy: number, r: number, startAngleDeg: number): string {
  return [0, 120, 240]
    .map((offset) => {
      const angle = ((startAngleDeg + offset) * Math.PI) / 180;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}

function GlowStar({
  size,
  top,
  left,
  color,
  duration,
  delay,
  spinDuration,
}: {
  size: number;
  top: number;
  left: number;
  color: string;
  duration: number;
  delay: number;
  spinDuration: number;
}) {
  const opacity = useSharedValue(0.12);
  const rotate = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.22, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    rotate.value = withRepeat(withTiming(360, { duration: spinDuration, easing: Easing.linear }), -1, false);

    // These loop forever (-1) and, unlike a normal screen transition, aren't
    // implicitly stopped by a JS-only reload (e.g. the Settings dev "reset
    // onboarding" button) — that tears down the JS context without giving
    // React's usual unmount path a chance to run, so the UI-thread animation
    // keeps ticking against a view tag that's being torn down underneath it
    // and floods the log. Cancelling explicitly here covers both cases.
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(rotate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const strokeWidth = size * 0.045;

  return (
    <Animated.View style={[styles.glow, { width: size, height: size, top, left }, animatedStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Polygon
          points={hexagramPoints(cx, cy, r, -90)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <Polygon
          points={hexagramPoints(cx, cy, r, 90)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

interface SparkleBackgroundProps {
  /** "accent" for the paywall/hero moments, "navy" for everyday screens. */
  tone?: 'accent' | 'navy';
  starCount?: number;
}

/**
 * The "magical" backdrop shared by the onboarding, paywall, and daily
 * lock-content flow: the existing star-of-David drift layer plus two large,
 * very soft breathing, slowly spinning Magen David glows behind it, so the
 * light parchment background never reads as flat.
 */
export function SparkleBackground({ tone = 'navy', starCount = 10 }: SparkleBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const glowColor = tone === 'accent' ? colors.accent : colors.primary;
  const starColor = tone === 'accent' ? colors.accent : colors.primary;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <GlowStar
        size={width * 0.9}
        top={-height * 0.08}
        left={-width * 0.25}
        color={glowColor}
        duration={4200}
        delay={0}
        spinDuration={22000}
      />
      <GlowStar
        size={width * 0.7}
        top={height * 0.55}
        left={width * 0.5}
        color={glowColor}
        duration={5000}
        delay={800}
        spinDuration={28000}
      />
      <AnimatedStarsBackground count={starCount} color={starColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
});
