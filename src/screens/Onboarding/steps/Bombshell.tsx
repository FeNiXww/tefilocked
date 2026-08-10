import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { computePhoneTimeStats, pickG, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

const REVEAL_DELAY_MS = 2600;

/** The first "aha" moment — a personalized stat computed from the user's own age + phone-usage answers, not a generic claim. */
export function Bombshell({ answers, onNext, onBack, progress }: StepComponentProps) {
  const stats = computePhoneTimeStats(answers);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCanContinue(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <HighlightText
        text={`${answers.name ? `${answers.name}, ` : ''}כאן מוצגות כל השנים ש${pickG(answers.gender, 'תבזבז', 'תבזבזי')} דבוק${pickG(answers.gender, '', 'ה')} למסך הטלפון לפי הכיוון הנוכחי שלך.`}
        style={styles.title}
        staggerMs={130}
      />

      <View style={styles.heroStat}>
        <Text style={typography.eyebrow}>⏳ לפי הקצב הנוכחי שלך</Text>
        <AnimatedCounter value={stats.lifetimeYears} duration={2200} style={styles.heroNumber} />
        <HighlightText text="**שנים שלמות** מחייך ייעלמו לתוך הטלפון" style={styles.heroLabel} startDelayMs={2200} />
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBlock}>
          <AnimatedCounter value={stats.hoursPerYear} duration={1400} style={styles.bigNumber} />
          <Text style={styles.unit}>שעות השנה</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBlock}>
          <AnimatedCounter value={stats.daysPerYear} duration={1600} style={styles.bigNumber} />
          <Text style={styles.unit}>ימים שלמים בשנה</Text>
        </View>
      </View>

      <HighlightText
        text="כמה מהזמן בזה מקרב אותך **לקדוש ברוך הוא**?"
        style={styles.question}
        startDelayMs={2800}
      />

      <PrimaryButton label="המשך" onPress={onNext} disabled={!canContinue} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'right',
    marginTop: spacing.lg,
  },
  heroStat: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 24,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroNumber: {
    ...typography.hero,
    fontSize: 80,
    lineHeight: 88,
    fontWeight: '900',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  heroLabel: {
    ...typography.heading,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  bigNumber: {
    ...typography.heading,
    fontSize: 22,
    color: colors.textSecondary,
  },
  unit: {
    ...typography.caption,
    textAlign: 'center',
  },
  question: {
    ...typography.heading,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  button: {
    marginTop: spacing.xxl,
  },
});
