import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { commitmentPercent, MONTHLY_PRAYER_HOURS, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

function GaugeBar({ ratio, delayMs = 0 }: { ratio: number; delayMs?: number }) {
  const clamped = Math.min(1, Math.max(0, ratio));
  const fill = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fill.value = reduceMotion
      ? clamped
      : withDelay(delayMs, withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, delayMs, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View>
      <View style={styles.gaugeTrack}>
        <Animated.View style={[styles.gaugeFill, fillStyle]} />
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeLabel}>גבוה</Text>
        <Text style={styles.gaugeLabel}>נמוך</Text>
      </View>
    </View>
  );
}

/** The final personalized reflection before the paywall — computed live from the user's own answers, not generic copy. */
export function FaithSnapshot({ answers, onNext, onBack, progress }: StepComponentProps) {
  const habitRatio = answers.prayerDaysPerWeek / 7;
  const commitment = commitmentPercent(answers.commitment);

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} scroll>
      <HighlightText text=" **תמונת המצב הרוחנית** שלך" style={styles.title} />
      <Text style={styles.subtitle}>לפי מה ששיתפת, ככה זה נראה עכשיו:</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}> הרגל התפילה הנוכחי</Text>
        <GaugeBar ratio={habitRatio} delayMs={150} />
        <Text style={styles.cardValue}>{answers.prayerDaysPerWeek}/7 ימים</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏳ זמן חודשי עם הקדוש ברוך הוא</Text>
        <Text style={styles.cardHint}>מוערך לפי 5 דקות ביום</Text>
        <Text style={styles.bigValue}>{MONTHLY_PRAYER_HOURS} שעות</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔥 רמת המחויבות</Text>
        <GaugeBar ratio={commitment / 100} delayMs={350} />
        <Text style={styles.cardValue}>{commitment}%</Text>
      </View>

      <PrimaryButton label="המשך" onPress={onNext} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.hero,
    fontSize: 22,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'right',
  },
  cardHint: {
    ...typography.caption,
    textAlign: 'right',
  },
  cardValue: {
    ...typography.caption,
    textAlign: 'right',
  },
  bigValue: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'right',
    color: colors.primary,
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfacePressed,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  gaugeLabels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  gaugeLabel: {
    ...typography.caption,
  },
  button: {
    marginTop: spacing.lg,
  },
});
