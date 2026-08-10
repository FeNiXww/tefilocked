import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../theme';

interface StatTileProps {
  emoji: string;
  value: string;
  label: string;
  index?: number;
}

export function StatTile({ emoji, value, label, index = 0 }: StatTileProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(index * 80, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    // Entrance should only play once on mount, not on every value refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }, { scale: 0.94 + progress.value * 0.06 }],
  }));

  return (
    <Animated.View style={[styles.tile, animatedStyle]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 28,
  },
  value: {
    ...typography.heading,
  },
  label: {
    ...typography.caption,
  },
});
