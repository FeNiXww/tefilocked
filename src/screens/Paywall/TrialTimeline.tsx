import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '../../theme';

const MILESTONES = [
  { emoji: '🔓', title: 'היום', subtitle: 'מתחילים בחינם' },
  { emoji: '🔔', title: 'יום 6', subtitle: 'תזכורת לפני החיוב' },
  { emoji: '💳', title: 'יום 7', subtitle: 'המנוי מתחיל' },
];

/**
 * Visual breakdown of the 7-day trial — a filled progress line stopping at
 * "today" (the trial's actual position), animated in on mount rather than
 * appearing instantly, so the paywall reads as alive rather than static.
 */
export function TrialTimeline() {
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [fill]);

  const fillStyle = useAnimatedStyle(() => ({
    // "Today" sits right at the first milestone — the line only fills to there.
    width: `${fill.value * 16}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, fillStyle]} />
      </View>
      <View style={styles.milestones}>
        {MILESTONES.map((milestone, index) => (
          <View key={milestone.title} style={styles.milestone}>
            <View style={[styles.dot, index === 0 && styles.dotActive]}>
              <Text style={styles.dotEmoji}>{milestone.emoji}</Text>
            </View>
            <Text style={styles.milestoneTitle}>{milestone.title}</Text>
            <Text style={styles.milestoneSubtitle}>{milestone.subtitle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfacePressed,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  milestones: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  milestone: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dotEmoji: {
    fontSize: 16,
  },
  milestoneTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  milestoneSubtitle: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
  },
});
