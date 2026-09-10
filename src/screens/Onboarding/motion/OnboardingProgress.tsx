import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { spacing, useTheme, type ThemeColors } from '../../../theme';
import { useOnboardingPalette } from './tokens';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

/**
 * A quiet top progress line — reassurance, not a form counter. Keeps the
 * existing thin-bar footprint (works for the ~15-step flow a segmented/dot
 * indicator wouldn't scale to) but the fill now eases into place instead of
 * snapping, with a soft warm glow at its leading edge so progressing itself
 * feels like a small, lit moment rather than a generic SaaS meter.
 */
export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const { colors } = useTheme();
  const palette = useOnboardingPalette();
  const styles = createStyles(colors);
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const fill = useSharedValue(ratio);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fill.value = reduceMotion ? ratio : withTiming(ratio, { duration: 520, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    left: `${fill.value * 100}%`,
    opacity: fill.value > 0.02 && fill.value < 0.99 ? 1 : 0,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]} />
      <Animated.View style={[styles.glow, { backgroundColor: palette.ember }, glowStyle]} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primaryLight,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      overflow: 'visible',
    },
    fill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
    glow: {
      position: 'absolute',
      top: -3,
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: -5,
      opacity: 0.7,
    },
  });
}
