import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import {
  computeTargetDate,
  formatHebrewDate,
  pickG,
  YEARLY_PRAYER_HOURS,
  type Gender,
  type StepComponentProps,
} from '../onboardingState';
import { getOptionLabels } from '../questionBank';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

function howWeGetYouThere(gender: Gender | null) {
  return [
    {
      emoji: '✍️',
      title: 'תפילה אישית, כל יום',
      body: `לא צריך לדעת מה לומר. ${pickG(gender, 'תקבל', 'תקבלי')} תפילה שנבחרה בשבילך, מותאמת למצב הרוח ולמטרות שלך.`,
    },
    {
      emoji: '🛡️',
      title: 'מבנה שעובד',
      body: `תפילוק יוצרת רגע של עצירה — נועלת הסחות דעת עד ש${pickG(gender, 'אתה מתפלל', 'את מתפללת')}. דרך פשוטה ומוכחת לשים את הקדוש ברוך הוא במקום הראשון.`,
    },
  ];
}

export function PlanSummary({ answers, onNext, onBack, progress }: StepComponentProps) {
  const targetDate = formatHebrewDate(computeTargetDate());
  const optionLabels = getOptionLabels(answers.gender);
  const goalLabels = answers.goals.length > 0 ? answers.goals.map((id) => optionLabels.goals[id]) : ['הרגל תפילה עקבי'];
  const howWeGetThere = howWeGetYouThere(answers.gender);

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} scroll>
      <View style={styles.headerCard}>
        <HighlightText
          text={`${answers.name ? `${answers.name}, ` : ''}יהיה לך רצף תפילה עקבי עד ל-**${targetDate}**`}
          style={styles.headerTitle}
          emphasisStyle={styles.headerDate}
        />

        <View style={styles.chipRow}>
          {goalLabels.map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statPill}>
          <Text style={styles.statPillText}>🙏 {'כ-'}{YEARLY_PRAYER_HOURS}{' שעות בשנה מושקעות בתפילה'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>איך נגיע לשם</Text>
      {howWeGetThere.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
        </View>
      ))}

      <PrimaryButton label="להתחיל את השינוי שלי" onPress={onNext} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    textAlign: 'center',
  },
  headerDate: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '700',
  },
  statPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statPillText: {
    ...typography.bodySecondary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.heading,
    textAlign: 'right',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'right',
  },
  cardBody: {
    ...typography.bodySecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
  },
});
