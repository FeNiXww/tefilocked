import { useEffect, useState } from 'react';
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
import { type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { countRevealSteps, HighlightText, WORD_POP_DURATION_MS } from '../HighlightText';
import { CandleGlow } from '../illustrations/CandleGlow';

const HEADLINE_STAGGER_MS = 120;
const BEAT_PAUSE_MS = 320;
const SUPPORTING_FADE_MS = 550;
const ILLUSTRATION_FADE_MS = 700;
const BUTTON_RISE_MS = 480;

function reflectionHeadline(name: string): string {
  const greeting = name.trim() ? `${name.trim()}, ` : '';
  return `${greeting}הכרנו אותך **קצת יותר טוב**`;
}

/**
 * Personal, low-text reflection beat right after the struggles questions —
 * a single headline, two short lines, and a slowly-brightening flame,
 * choreographed as one unhurried sequence rather than a page of prose.
 */
export function StrugglesReflection({ answers, onNext, onBack, progress }: StepComponentProps) {
  const headline = reflectionHeadline(answers.name);
  const reduceMotion = useReducedMotion();

  const supportingOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const illustrationOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const buttonProgress = useSharedValue(reduceMotion ? 1 : 0);
  const [canContinue, setCanContinue] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setCanContinue(true);
      return;
    }

    const headlineSteps = countRevealSteps(headline);
    const headlineEnd = (headlineSteps - 1) * HEADLINE_STAGGER_MS + WORD_POP_DURATION_MS;
    const supportingStart = headlineEnd + BEAT_PAUSE_MS;
    const illustrationStart = supportingStart + SUPPORTING_FADE_MS + BEAT_PAUSE_MS;
    const buttonStart = illustrationStart + ILLUSTRATION_FADE_MS - 200;

    supportingOpacity.value = withDelay(
      supportingStart,
      withTiming(1, { duration: SUPPORTING_FADE_MS, easing: Easing.out(Easing.cubic) })
    );
    illustrationOpacity.value = withDelay(
      illustrationStart,
      withTiming(1, { duration: ILLUSTRATION_FADE_MS, easing: Easing.out(Easing.cubic) })
    );
    buttonProgress.value = withDelay(
      buttonStart,
      withTiming(1, { duration: BUTTON_RISE_MS, easing: Easing.out(Easing.cubic) })
    );

    const timer = setTimeout(() => setCanContinue(true), buttonStart);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, headline]);

  const supportingStyle = useAnimatedStyle(() => ({
    opacity: supportingOpacity.value,
    transform: [{ translateY: (1 - supportingOpacity.value) * 10 }],
  }));

  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [{ scale: 0.9 + illustrationOpacity.value * 0.1 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonProgress.value,
    transform: [{ translateY: (1 - buttonProgress.value) * 20 }],
  }));

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <View style={styles.center}>
        <HighlightText text={headline} style={styles.headline} staggerMs={HEADLINE_STAGGER_MS} />

        <Animated.View style={[styles.supportingBlock, supportingStyle]}>
          <Text style={styles.supportingLine}>לכל אחד יש רגעים של היסח דעת.</Text>
          <Text style={styles.supportingLine}>
            <Text style={styles.emphasis}>ביחד</Text>, נעצור רגע לפני שהם קורים.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.illustration, illustrationStyle]}>
          <CandleGlow />
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonWrap, buttonStyle]}>
        <PrimaryButton label="הצעד הבא" onPress={onNext} disabled={!canContinue} />
      </Animated.View>
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    ...typography.hero,
    fontSize: 29,
    lineHeight: 40,
    textAlign: 'center',
  },
  supportingBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  supportingLine: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 27,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emphasis: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  illustration: {
    marginTop: spacing.xxl,
  },
  buttonWrap: {
    marginTop: spacing.xxl,
  },
});
