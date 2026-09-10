import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Logo } from '../../components/Logo';
import { setOnboardingComplete } from '../../data/storage/mmkv';
import { setUnlockDuration } from '../../native/appLocking';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { OnboardingAtmosphere } from './motion/OnboardingAtmosphere';
import { WORLD } from './motion/tokens';
import { useOnboardingState } from './onboardingState';
import { ONBOARDING_STEPS } from './steps';

const INTRO_AUTO_DISMISS_MS = 1600;
// The user already did one real prayer in CoreLoopDemo (see that step's own
// comment — it records a genuine unlock_events row, not a preview one), so
// the very next locked-app tap right after finishing onboarding shouldn't
// immediately demand another one. A day-long grace grant covers whatever
// apps AppSelectionStep just locked.
const POST_ONBOARDING_GRACE_MINUTES = 24 * 60;

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
      <OnboardingAtmosphere world={WORLD.logoIntro} richness="quiet" particles vignette />
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
  const reduceMotion = useReducedMotion();

  // Every step swap dips through a very brief hold instead of hard-cutting
  // straight from one screen's content to the next — `displayIndex` is what
  // actually renders, lagging `stepIndex` by one short fade-out. Deliberately
  // does NOT also fade the new content back in here: each step's own
  // entrance (OnboardingScreenShell's reveal, or a step's own FadeIn) already
  // does that, and stacking a second outer fade on top of it doubled up into
  // a much longer, more noticeable "flash to white" on every single step —
  // this layer's only job is smoothing the moment content disappears.
  const [displayIndex, setDisplayIndex] = useState(0);
  const crossfade = useSharedValue(1);

  useEffect(() => {
    if (stepIndex === displayIndex) return;
    if (reduceMotion) {
      setDisplayIndex(stepIndex);
      return;
    }
    crossfade.value = withTiming(0.25, { duration: 130, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setDisplayIndex)(stepIndex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, reduceMotion]);

  useEffect(() => {
    // Snap back to fully opaque the instant the new step mounts — no
    // animated fade here, see the comment above.
    crossfade.value = 1;
  }, [displayIndex]);

  const crossfadeStyle = useAnimatedStyle(() => ({ opacity: crossfade.value }));

  const total = ONBOARDING_STEPS.length;
  const isLast = stepIndex === total - 1;

  const handleNext = () => {
    if (isLast) {
      setOnboardingComplete(true);
      // Fire-and-forget, same as the real post-prayer unlock grant (see
      // useLockContentFlow's finishAndUnlock) — nothing here should block
      // handing off to the app.
      setUnlockDuration(POST_ONBOARDING_GRACE_MINUTES).catch(() => {});
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

  const step = ONBOARDING_STEPS[displayIndex];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.container, crossfadeStyle]}>
        {step.render({
          answers,
          update,
          onNext: handleNext,
          onBack: displayIndex > 0 ? handleBack : undefined,
          progress: { current: displayIndex + 1, total },
        })}
      </Animated.View>
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
