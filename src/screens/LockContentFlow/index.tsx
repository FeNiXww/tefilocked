import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ContentType } from '../../content/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SparkleBackground } from '../../components/SparkleBackground';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { pickG } from '../Onboarding/onboardingState';
import { colors, spacing, typography } from '../../theme';
import { CompletionScreen } from './CompletionScreen';
import { ConnectionCheckIn } from './ConnectionCheckIn';
import { ContentDisplay } from './ContentDisplay';
import { DurationPicker } from './DurationPicker';
import { MoodPicker } from './MoodPicker';
import { useLockContentFlow } from './useLockContentFlow';

interface LockContentFlowProps {
  preferredContentTypes: ContentType[];
  lockedAppPackage?: string;
  onUnlocked: () => void;
}

/**
 * The one shared screen invoked from both platform entry points: iOS's
 * shield-redirect deep link, and Android's overlay-triggered deep link.
 * Everything below this point is platform-agnostic per the architecture
 * plan's "Cross-platform UX Consistency Strategy".
 */
export function LockContentFlow({ preferredContentTypes, lockedAppPackage, onUnlocked }: LockContentFlowProps) {
  const insets = useSafeAreaInsets();
  const [finishing, setFinishing] = useState(false);
  const [gender] = useState(() => getOnboardingGender());
  const { state, submitConnection, selectMood, confirmPrayed, selectDuration, finishAndUnlock } = useLockContentFlow({
    preferredContentTypes,
    lockedAppPackage,
    onUnlocked,
  });

  // The interception's whole "premium, native-feeling" transition rides on
  // this: no popup, just a native haptic (fired from OverlayManager on
  // Android before this even mounts) immediately followed by this fade —
  // 250–350ms, ease-out, matching a native sheet/shield presentation rather
  // than a generic screen change.
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = 0;
    fade.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  // This is the core prayer ritual the whole app exists to enforce — the
  // Android hardware back button must not be a silent escape hatch out of it
  // (the OS-level shield/overlay will just re-trigger this screen anyway, but
  // letting back fall through to the default "exit app" behavior reads as
  // broken, not as a real way out).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 10 }],
  }));

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await finishAndUnlock();
    } catch (error) {
      // A failed native unlock (e.g. iOS rejects with NO_ACTIVE_BLOCKS when
      // there's no active block config — nothing to unlock in that case
      // anyway) must not trap the user on this screen forever: they've
      // already prayed and the streak is already recorded (see
      // useLockContentFlow's selectDuration), so let them continue back into
      // the app regardless.
      console.warn('[tefillah-lock] Failed to complete unlock:', error);
      onUnlocked();
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SparkleBackground tone="navy" starCount={6} />
      <Animated.View style={fadeStyle}>
        {state.step === 'connection' && <ConnectionCheckIn onSubmit={submitConnection} />}

        {state.step === 'mood' && <MoodPicker onSelect={selectMood} gender={gender} />}

        {state.step === 'prayer' && state.prayerLoading && (
          <View style={styles.fallback}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.fallbackText}>מכינים תפילה בשבילך...</Text>
          </View>
        )}
        {state.step === 'prayer' && !state.prayerLoading && state.prayerItem && (
          <ContentDisplay
            content={state.prayerItem}
            onContinue={confirmPrayed}
            continuing={false}
            continueLabel="התפללתי היום 🙏"
          />
        )}
        {state.step === 'prayer' && !state.prayerLoading && !state.prayerItem && (
          // No bundled item matches this mood + the user's content-type
          // preferences yet (small seed content pool) — don't dead-end.
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>{`${pickG(gender, 'קח', 'קחי')} רגע לנשום עמוק לפני שממשיכים`}</Text>
            <PrimaryButton label="התפללתי היום 🙏" onPress={confirmPrayed} />
          </View>
        )}

        {state.step === 'duration' && <DurationPicker onSelect={selectDuration} />}

        {state.step === 'completion' && (
          <CompletionScreen streak={state.streak} verseItem={state.verseItem} onFinish={handleFinish} finishing={finishing} />
        )}

        {state.step === 'unlocked' && (
          <View style={styles.fallback}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  fallback: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  fallbackText: {
    ...typography.body,
    fontSize: 18,
    textAlign: 'center',
  },
});
