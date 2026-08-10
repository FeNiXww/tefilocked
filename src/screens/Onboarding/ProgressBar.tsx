import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';

interface ProgressBarProps {
  current: number;
  total: number;
}

/** Thin top progress line shown through the question-bank section — replaces the old carousel's dot indicator, which doesn't scale to ~15 steps. */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
