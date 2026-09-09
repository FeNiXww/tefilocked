import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ContentType } from '../../content/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SparkleBackground } from '../../components/SparkleBackground';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { pickG } from '../Onboarding/onboardingState';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
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
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
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

  // If this screen is pushed by the Android lock timer expiring while the
  // phone is asleep, the overlay's deep link can mount this whole tree
  // before the user ever wakes the device — Android resumes the Activity
  // (confirmed via AppState going 'active') and Reanimated genuinely
  // finishes the fade above (`fade.value` reaches 1) well before the screen
  // physically turns back on. Despite that, the native view that started
  // life off-screen keeps painting as if still at opacity 0 for a long,
  // unpredictable stretch afterward — everything is mounted, laid out, and
  // interactive (a blind tap on the hidden button works), it just never gets
  // a correctly composited frame on its own. Restarting the animation value
  // doesn't fix an already-stale view, so instead force one full remount —
  // fresh native views always paint their current (already-correct) style
  // immediately — the first time the app is genuinely foregrounded after a
  // flow that started this way. Scoped to a single one-shot recovery (not
  // every future background/foreground toggle) so it can never wipe out
  // mid-flow progress like VerseReader's scroll position; safe to fire here
  // regardless because the user can't have interacted with an invisible step.
  const startedInBackground = useRef(AppState.currentState !== 'active');
  const [instanceKey, setInstanceKey] = useState(0);
  useEffect(() => {
    if (!startedInBackground.current) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      startedInBackground.current = false;
      setInstanceKey((k) => k + 1);
    });
    return () => subscription.remove();
  }, []);

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
      console.warn('[tefillok] Failed to complete unlock:', error);
      onUnlocked();
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View key={instanceKey} style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SparkleBackground tone="navy" starCount={6} />
      <Animated.View style={[styles.stepWrap, fadeStyle]}>
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
            continueLabel="סיימתי 🙏"
          />
        )}
        {state.step === 'prayer' && !state.prayerLoading && !state.prayerItem && (
          // No bundled item matches this mood + the user's content-type
          // preferences yet (small seed content pool) — don't dead-end.
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>{`${pickG(gender, 'קח', 'קחי')} רגע לנשום עמוק לפני שממשיכים`}</Text>
            <PrimaryButton label="סיימתי 🙏" onPress={confirmPrayed} />
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

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  // The 'prayer' step's ContentDisplay is flex:1 (a full-height reading
  // screen, not a small centered card) and needs this wrapper to actually
  // stretch to fill the available space; every other step is a compact
  // block that doesn't set flex:1, so `justifyContent: 'center'` here still
  // centers those exactly as before.
  stepWrap: {
    flex: 1,
    justifyContent: 'center',
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
}
