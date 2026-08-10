import { StyleSheet, Text, View } from 'react-native';
import { MagenDavidStreak } from '../../../components/MagenDavidStreak';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import type { StepComponentProps } from '../onboardingState';

/** The emotional peak of the flow: the streak lights for the first time, right after the real demo the user just completed. */
export function StreakCelebration({ answers, onNext }: StepComponentProps) {
  return (
    <View style={styles.container}>
      <SparkleBackground tone="accent" starCount={10} />
      <HighlightText text="**יישר כוח!**" style={styles.title} emphasisStyle={styles.titleEmphasis} />
      <Text style={styles.subtitle}>השלמת את התפילה הראשונה שלך</Text>

      <View style={styles.starWrap}>
        <MagenDavidStreak streak={1} litToday size={140} />
      </View>
      <Text style={styles.streakLabel}>יום 1 ברצף</Text>

      {answers.demoContentText && (
        <View style={styles.card}>
          <Text style={styles.cardText} numberOfLines={3}>
            {answers.demoContentText}
          </Text>
          {answers.demoContentSource && <Text style={styles.cardSource}>{answers.demoContentSource}</Text>}
        </View>
      )}

      <Text style={styles.footer}>התפילות שלך יישמרו ביומן כדי לעזור לך לבנות קשר חזק יותר עם הקדוש ברוך הוא.</Text>

      <PrimaryButton label="המשך" onPress={onNext} variant="accent" style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.hero,
    fontSize: 28,
    color: colors.accentDark,
  },
  titleEmphasis: {
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
  },
  starWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: {
    ...typography.caption,
    marginTop: -spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  cardText: {
    ...typography.body,
    textAlign: 'right',
  },
  cardSource: {
    ...typography.caption,
    textAlign: 'right',
  },
  footer: {
    ...typography.caption,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
