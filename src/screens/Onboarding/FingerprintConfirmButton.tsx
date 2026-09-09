import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../haptics';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 96;
const STROKE_WIDTH = 5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Long enough to read as deliberate (can't be mis-tapped), short enough not to feel like a chore.
const HOLD_DURATION_MS = 900;

interface FingerprintConfirmButtonProps {
  disabled?: boolean;
  onConfirmed: () => void;
}

/**
 * Press-and-hold commitment gesture: a ring fills in around a fingerprint glyph
 * while held, completing into a checkmark. Entirely custom-drawn in JS — no OS
 * biometric API involved. This is a deliberate, weighted confirmation tap
 * standing in for "I stand behind this," not a real fingerprint/security check,
 * so it must never be described to the user as biometric authentication.
 */
export function FingerprintConfirmButton({ disabled, onConfirmed }: FingerprintConfirmButtonProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const confirmedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    setConfirmed(true);
    setHolding(false);
    haptics.success();
    onConfirmed();
  }, [onConfirmed]);

  const handlePressIn = () => {
    if (disabled || confirmedRef.current) return;
    setHolding(true);
    haptics.light();
    scale.value = withTiming(0.94, { duration: 150 });
    progress.value = withTiming(1, { duration: HOLD_DURATION_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(handleComplete)();
    });
  };

  const handlePressOut = () => {
    if (confirmedRef.current) return;
    setHolding(false);
    cancelAnimation(progress);
    scale.value = withTiming(1, { duration: 200 });
    progress.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
  };

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const hint = confirmed ? 'המחויבות אושרה' : holding ? 'ממשיכים להחזיק…' : 'החזק לאישור';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || confirmed}
        accessibilityRole="button"
        accessibilityLabel="החזק לאישור המחויבות"
        accessibilityHint="לחצו והחזיקו כדי לאשר"
        accessibilityState={{ disabled: disabled || confirmed }}
        hitSlop={12}
      >
        <Animated.View style={[styles.circle, disabled && styles.circleDisabled, scaleStyle]}>
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.accentLight} strokeWidth={STROKE_WIDTH} fill="none" />
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.accent}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={ringProps}
              rotation={-90}
              originX={SIZE / 2}
              originY={SIZE / 2}
            />
          </Svg>
          {/* `circle`'s `accentLight` fill is a fixed light tone in both
              themes (see colors.ts), so the glyph is fixed to match — the
              theme-reactive `colors.primary`/`textMuted` would turn light in
              dark mode against this always-light circle. */}
          <Ionicons
            name={confirmed ? 'checkmark' : 'finger-print'}
            size={34}
            color={disabled ? lightColors.textMuted : lightColors.primary}
          />
        </Animated.View>
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDisabled: {
    opacity: 0.5,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
  });
}
