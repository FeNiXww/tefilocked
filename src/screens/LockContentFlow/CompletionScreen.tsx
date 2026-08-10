import { StyleSheet, Text, View } from 'react-native';
import { MagenDavidStreak } from '../../components/MagenDavidStreak';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import type { ContentItem } from '../../content/types';

interface CompletionScreenProps {
  streak: number;
  verseItem: ContentItem | null;
  onFinish: () => void;
  finishing: boolean;
}

/** The reward beat after "I've prayed today": updated streak, then the verse of the day, then access is granted. */
export function CompletionScreen({ streak, verseItem, onFinish, finishing }: CompletionScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>יישר כוח!</Text>

      <MagenDavidStreak streak={streak} litToday size={120} />
      <Text style={styles.streakLabel}>{streak} ימים ברצף</Text>

      {verseItem && (
        <View style={styles.verseCard}>
          <Text style={styles.verseEyebrow}>פסוק היום</Text>
          <Text style={styles.verseText}>{verseItem.hebrewText}</Text>
          <Text style={styles.verseSource}>{verseItem.source}</Text>
        </View>
      )}

      <PrimaryButton
        label={finishing ? 'רגע...' : 'סיימתי!'}
        onPress={onFinish}
        disabled={finishing}
        variant="accent"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    color: colors.accentDark,
  },
  streakLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  verseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  verseEyebrow: {
    ...typography.eyebrow,
    textAlign: 'right',
  },
  verseText: {
    ...typography.body,
    textAlign: 'right',
  },
  verseSource: {
    ...typography.caption,
    textAlign: 'right',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
