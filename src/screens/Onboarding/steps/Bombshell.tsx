import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedCounter } from '../../../components/AnimatedCounter';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { computePhoneTimeStats, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

const OPENING_HOLD_MS = 1400;
const COUNT_DURATION_MS = 1700;
const SENTENCE_START_DELAY_MS = COUNT_DURATION_MS + 250;
const DISCLAIMER_DELAY_MS = SENTENCE_START_DELAY_MS + 900;
const CONTINUE_DELAY_MS = OPENING_HOLD_MS + DISCLAIMER_DELAY_MS + 300;

/**
 * The realization beat: one cinematic reveal building up to a single number
 * — the projected years of life lost to the phone — computed from the
 * user's own age + phone-usage answers. No competing statistics; the next
 * step (Purpose) carries the emotional payoff of what to do about it.
 */
export function Bombshell({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const stats = computePhoneTimeStats(answers);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'opening' | 'reveal'>(reduceMotion ? 'reveal' : 'opening');
  const [canContinue, setCanContinue] = useState(false);

  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.7);

  useEffect(() => {
    if (reduceMotion) {
      setCanContinue(true);
      return;
    }
    const revealTimer = setTimeout(() => setPhase('reveal'), OPENING_HOLD_MS);
    const continueTimer = setTimeout(() => setCanContinue(true), CONTINUE_DELAY_MS);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(continueTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useEffect(() => {
    if (phase !== 'reveal' || reduceMotion) {
      if (reduceMotion) {
        glowOpacity.value = 0.7;
        glowScale.value = 1;
      }
      return;
    }
    glowOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    glowScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    const breatheTimer = setTimeout(() => {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, 900);
    return () => clearTimeout(breatheTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.3,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <View style={styles.stage}>
        {phase === 'opening' ? (
          <Animated.View exiting={reduceMotion ? undefined : FadeOut.duration(350)} style={styles.openingWrap}>
            <HighlightText
              text={`${answers.name ? `${answers.name}, ` : ''}**אם שום דבר לא ישתנה**…`}
              style={styles.opening}
              staggerMs={90}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(550)} style={styles.revealWrap}>
            <Text style={typography.eyebrow}>התחזית שלך</Text>

            <View style={styles.numberWrap}>
              <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
              <AnimatedCounter
                value={stats.lifetimeYearsPrecise}
                duration={COUNT_DURATION_MS}
                formatter={(n) => n.toFixed(1)}
                style={styles.heroNumber}
              />
              <Animated.Text
                entering={reduceMotion ? undefined : FadeIn.delay(COUNT_DURATION_MS - 300).duration(500)}
                style={styles.yearsLabel}
              >
                שנים
              </Animated.Text>
            </View>

            <HighlightText
              text="**זה מה שהמסך** עלול לקחת מהחיים שלך"
              style={styles.sentence}
              startDelayMs={SENTENCE_START_DELAY_MS}
            />

            <Animated.Text
              entering={reduceMotion ? undefined : FadeIn.delay(DISCLAIMER_DELAY_MS).duration(500)}
              style={styles.disclaimer}
            >
              הערכה המבוססת על השימוש היומי שדיווחת עליו
            </Animated.Text>
          </Animated.View>
        )}
      </View>

      <PrimaryButton label="המשך" onPress={onNext} disabled={!canContinue} style={styles.button} />
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
  },
  openingWrap: {
    position: 'absolute',
    paddingHorizontal: spacing.lg,
  },
  opening: {
    ...typography.title,
    fontSize: 24,
    textAlign: 'center',
  },
  revealWrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  numberWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accent,
  },
  heroNumber: {
    ...typography.hero,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  yearsLabel: {
    ...typography.title,
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  sentence: {
    ...typography.heading,
    fontSize: 19,
    textAlign: 'center',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  button: {
    marginTop: spacing.xxl,
  },
  });
}
