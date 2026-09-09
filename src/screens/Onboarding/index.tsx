import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Logo } from '../../components/Logo';
import { SparkleBackground } from '../../components/SparkleBackground';
import { setOnboardingComplete } from '../../data/storage/mmkv';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { useOnboardingState } from './onboardingState';
import { ONBOARDING_STEPS } from './steps';

const INTRO_AUTO_DISMISS_MS = 1600;

interface OnboardingFlowProps {
  onComplete: () => void;
}

/**
 * One-time cinematic open: the mark scales/glows in, then hands off to the
 * first step — the "cinematic onboarding journey" CONTEXT.md describes,
 * rather than dropping straight into question content.
 */
function LogoIntro({ onFinish }: { onFinish: () => void }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0.3);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      onFinish();
      return;
    }
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.back(1.2)) });
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    const timer = setTimeout(onFinish, INTRO_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1.4 + glow.value * 0.3 }],
  }));

  return (
    <Pressable style={styles.introContainer} onPress={onFinish}>
      <SparkleBackground tone="accent" starCount={8} />
      <Animated.View style={[styles.introGlow, glowStyle]} />
      <Animated.View style={markStyle}>
        <Logo variant="mark" size={140} />
      </Animated.View>
      <Animated.Text style={[styles.introWordmark, markStyle]}>תפילוק</Animated.Text>
    </Pressable>
  );
}

/** Linear, data-driven onboarding: LogoIntro, then every step in ONBOARDING_STEPS in order, sharing one persisted answers object. */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [showIntro, setShowIntro] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const { answers, update } = useOnboardingState();

  const total = ONBOARDING_STEPS.length;
  const isLast = stepIndex === total - 1;

  const handleNext = () => {
    if (isLast) {
      setOnboardingComplete(true);
      onComplete();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, total - 1));
  };

  const handleBack = () => {
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  // OnboardingFlow renders outside NavigationContainer (see App.tsx), so
  // Android's hardware back button has nothing to fall through to by
  // default except exiting the app — step back through the flow instead,
  // same as the on-screen back arrow, whenever there's a step to return to.
  useEffect(() => {
    if (showIntro || stepIndex === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [showIntro, stepIndex]);

  if (showIntro) {
    return <LogoIntro onFinish={() => setShowIntro(false)} />;
  }

  const step = ONBOARDING_STEPS[stepIndex];

  return (
    <View style={styles.container}>
      {step.render({
        answers,
        update,
        onNext: handleNext,
        onBack: stepIndex > 0 ? handleBack : undefined,
        progress: { current: stepIndex + 1, total },
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  introContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  introGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accent,
  },
  introWordmark: {
    ...typography.eyebrow,
    fontSize: 18,
    letterSpacing: 3,
    color: colors.primary,
  },
  });
}
