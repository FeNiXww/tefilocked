import { StyleSheet, Text, View } from 'react-native';
import type { Mood } from '../../content/types';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { moodLabel } from '../LockContentFlow/moodLabels';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const MOOD_EMOJIS: Record<Mood, string> = {
  stressed: '😣',
  anxious: '😟',
  grateful: '🙏',
  lonely: '😔',
  happy: '😄',
  distracted: '📵',
  tired: '😴',
};

interface MoodBreakdownProps {
  byMood: Partial<Record<Mood, number>>;
}

export function MoodBreakdown({ byMood }: MoodBreakdownProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const entries = (Object.entries(byMood) as [Mood, number][]).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const gender = getOnboardingGender();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מצבי הרוח שלך</Text>
      <View style={styles.rows}>
        {entries.map(([mood, count]) => (
          <View key={mood} style={styles.row}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {MOOD_EMOJIS[mood]} {moodLabel(mood, gender)}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
            </View>
            <Text style={styles.rowCount}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: {
      ...typography.heading,
      fontSize: 17,
    },
    rows: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
    },
    rowLabel: {
      ...typography.bodySecondary,
      width: 122,
    },
    barTrack: {
      flex: 1,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfacePressed,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    rowCount: {
      ...typography.caption,
      minWidth: 22,
      textAlign: 'center',
    },
  });
}
