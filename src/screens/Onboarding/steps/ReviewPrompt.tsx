import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { colors, spacing, typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';

/**
 * Shown right at the emotional peak (streak just lit), not at the end of
 * onboarding when energy has faded — the reference app's timing insight
 * behind its unusually high review rate. `requestReview` shows the native
 * iOS/Android in-context rating sheet at most a few times a year — the OS
 * silently no-ops if that quota is already used, so this never blocks onNext.
 */
export function ReviewPrompt({ answers, onNext }: StepComponentProps) {
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    StoreReview.isAvailableAsync()
      .then((available) => (available ? StoreReview.requestReview() : undefined))
      .catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <SparkleBackground tone="accent" starCount={8} />
      <Text style={styles.emoji}>🌟</Text>
      <Text style={styles.title}>{pickG(answers.gender, 'נהנה', 'נהנית')} מתפילוקט?</Text>
      <Text style={styles.subtitle}>הדירוג שלך עוזר ליהודים נוספים למצוא את האפליקציה</Text>
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
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
});
