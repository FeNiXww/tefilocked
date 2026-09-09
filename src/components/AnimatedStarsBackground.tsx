import { memo, useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
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
import { useTheme } from '../theme';

interface StarConfig {
  id: number;
  size: number;
  top: number;
  opacity: number;
  duration: number;
  delay: number;
  reverse: boolean;
}

export interface AnimatedStarsBackgroundProps {
  /** How many stars to scatter across the screen. */
  count?: number;
  /** Star line color — defaults to the theme's primary color. */
  color?: string;
  minSize?: number;
  maxSize?: number;
  minOpacity?: number;
  maxOpacity?: number;
  /** Milliseconds to cross the full screen width, per star. */
  minDuration?: number;
  maxDuration?: number;
  style?: StyleProp<ViewStyle>;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

function buildStars(
  count: number,
  height: number,
  sizeRange: [number, number],
  durationRange: [number, number],
  opacityRange: [number, number]
): StarConfig[] {
  return Array.from({ length: count }, (_, id) => {
    const size = random(sizeRange[0], sizeRange[1]);
    return {
      id,
      size,
      top: random(0, Math.max(height - size, 0)),
      opacity: random(opacityRange[0], opacityRange[1]),
      duration: random(durationRange[0], durationRange[1]),
      // Staggered so stars don't all enter the screen in one visible wave.
      delay: random(0, durationRange[1]),
      reverse: Math.random() < 0.5,
    };
  });
}

/**
 * Minimalist Magen David rendered as two overlapping triangle outlines —
 * the standard line-art construction of the six-pointed star, cheaper to
 * draw than a 12-point hexagram path and crisp at small sizes.
 */
const StarOfDavidIcon = memo(function StarOfDavidIcon({
  size,
  color,
  opacity,
}: {
  size: number;
  color: string;
  opacity: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const strokeWidth = Math.max(size * 0.045, 1);

  const trianglePoints = (startAngleDeg: number) =>
    [0, 120, 240]
      .map((offset) => {
        const angle = ((startAngleDeg + offset) * Math.PI) / 180;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      })
      .join(' ');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon
        points={trianglePoints(-90)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity={opacity}
      />
      <Polygon
        points={trianglePoints(90)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity={opacity}
      />
    </Svg>
  );
});

const FloatingStar = memo(function FloatingStar({
  config,
  width,
  color,
  reduceMotion,
}: {
  config: StarConfig;
  width: number;
  color: string;
  reduceMotion: boolean;
}) {
  const { size, top, opacity, duration, delay, reverse } = config;
  const startX = reverse ? width + size : -size;
  const endX = reverse ? -size : width + size;

  const translateX = useSharedValue(reduceMotion ? (startX + endX) / 2 : startX);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;

    translateX.value = withDelay(
      delay,
      withRepeat(withTiming(endX, { duration, easing: Easing.linear }), -1, false)
    );
    // Gentle vertical drift layered on top of the horizontal drift, so each
    // star reads as floating rather than sliding on a rigid rail.
    bob.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 6, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: duration / 3, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration / 6, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    // These loop forever (-1) and, unlike a normal screen transition, aren't
    // implicitly stopped by a JS-only reload (e.g. the Settings dev "reset
    // onboarding" button) — see the matching comment in SparkleBackground's
    // GlowStar for why that leaves them ticking against a torn-down surface.
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(bob);
    };
    // Animation is (re)started only when reduceMotion changes; startX/endX/delay/duration are fixed per star instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: bob.value * 6 }],
  }));

  return (
    <Animated.View style={[styles.star, { top }, animatedStyle]}>
      <StarOfDavidIcon size={size} color={color} opacity={opacity} />
    </Animated.View>
  );
});

/**
 * Absolutely-filled decorative backdrop of tiny Magen David shapes drifting
 * horizontally at slightly different speeds and depths. Non-interactive —
 * mount it as the first child of a screen's root View, before real content.
 */
export function AnimatedStarsBackground({
  count = 14,
  color,
  minSize = 16,
  maxSize = 34,
  minOpacity = 0.12,
  maxOpacity = 0.28,
  minDuration = 18000,
  maxDuration = 34000,
  style,
}: AnimatedStarsBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const reduceMotion = useReducedMotion();

  const stars = useMemo(
    () => buildStars(count, height, [minSize, maxSize], [minDuration, maxDuration], [minOpacity, maxOpacity]),
    [count, width, height, minSize, maxSize, minDuration, maxDuration, minOpacity, maxOpacity]
  );

  return (
    <View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {stars.map((star) => (
        <FloatingStar key={star.id} config={star} width={width} color={resolvedColor} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    left: 0,
  },
});
