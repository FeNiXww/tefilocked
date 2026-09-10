import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
import { useWorldTransition } from '../motion/useWorldTransition';
import { computePhoneTimeStats, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

const HEADLINE_START_DELAY_MS = 250;
const BODY_START_DELAY_MS = HEADLINE_START_DELAY_MS + 900;
// The cold->warm shift starts right as the headline itself lands — the
// reframe from loss to possibility should be felt in the light a beat before
// the words underneath say it outright.
const WORLD_SHIFT_DELAY_MS = HEADLINE_START_DELAY_MS + 200;

/**
 * The payoff beat right after Bombshell — reframes the years the user just
 * saw as time that can still be reclaimed. Echoes that same number, small
 * and muted, so the two screens read as one continuous realization → hope
 * story rather than an unrelated statistic followed by a pitch.
 */
export function Purpose({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const stats = computePhoneTimeStats(answers);
  const world = useWorldTransition(WORLD.purposeStart, WORLD.purposeEnd, { delayMs: WORLD_SHIFT_DELAY_MS, durationMs: 1800 });

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} world={world} richness="quiet">
      <View style={styles.stage}>
        <FocalLight size={320} tone="warm" peakOpacity={0.24} revealDurationMs={1600} style={styles.headlineGlow} />

        <Animated.View entering={FadeIn.duration(450)} style={styles.echo}>
          <Text style={styles.echoText}>
            {stats.lifetimeYearsPrecise.toFixed(1)} <Text style={styles.echoUnit}>שנים</Text>
          </Text>
        </Animated.View>

        <HighlightText
          text={`**מה אם חלק מהזמן הזה** יחזור אליך${answers.name ? `, ${answers.name}` : ''}?`}
          style={styles.headline}
          startDelayMs={HEADLINE_START_DELAY_MS}
        />

        <HighlightText
          text="בכל פעם שהטלפון קורא לך, **תפילוק עוצר אותך לרגע של תפילה** — ומחזיר לך חלק מהזמן שהיה הולך לאיבוד"
          style={styles.body}
          startDelayMs={BODY_START_DELAY_MS}
        />
      </View>

      <PrimaryButton label="המשך" onPress={onNext} style={styles.button} />
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    stage: {
      flex: 1,
      minHeight: 420,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xl,
    },
    headlineGlow: {
      position: 'absolute',
      top: '30%',
    },
    echo: {
      opacity: 0.55,
    },
    echoText: {
      ...typography.title,
      fontSize: 22,
      fontWeight: '700',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    echoUnit: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    headline: {
      ...typography.hero,
      fontSize: 28,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    body: {
      ...typography.heading,
      fontSize: 18,
      fontWeight: '500',
      textAlign: 'center',
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
    },
    button: {
      marginTop: spacing.xxl,
    },
  });
}
