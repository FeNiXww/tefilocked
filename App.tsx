import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FrankRuhlLibre_800ExtraBold, useFonts } from '@expo-google-fonts/frank-ruhl-libre';
import { MainTabs } from './src/navigation/MainTabs';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OnboardingFlow } from './src/screens/Onboarding';
import { Paywall } from './src/screens/Paywall';
import { LockContentFlow } from './src/screens/LockContentFlow';
import { getPendingLockedApp, getPreferredContentTypes, isOnboardingComplete, setOnboardingComplete } from './src/data/storage/mmkv';
import { DEV_RESET_ONBOARDING_EVENT, reloadApp } from './src/dev/devReset';
import { initDatabase } from './src/data/storage/db';
import { configureStreakNotificationHandler, useStreakNotificationTrigger } from './src/notifications/streakReminders';
import { configureRevenueCat } from './src/subscriptions/revenueCatConfig';
import { hasAppAccess, resetSubscriptionStateForTesting } from './src/subscriptions/subscriptionState';
import { cancelTrialEndingReminder } from './src/subscriptions/trialReminder';
import { usePendingLockTrigger, type PendingLockTrigger } from './src/native/appLocking/usePendingLockTrigger';
import { useWidgetDeepLink } from './src/widgets/useWidgetDeepLink';
import { ThemeProvider, useTheme } from './src/theme';

// How long to wait, after firing the Android direct-launch, for Tefillok to
// actually leave the foreground before giving up and assuming the launch
// silently failed (target app missing/uninstalled — see the "edge case:
// target app no longer exists" behavior below).
const ANDROID_HANDOFF_GRACE_MS = 1500;

// How long to let the tree sit unmounted (see isDevResetting below) before
// actually reloading — gives Reanimated's UI-thread animation drivers (e.g.
// SparkleBackground's infinite spins, still running on Home behind whatever
// screen the dev button was pressed from) a frame to be torn down by the
// ordinary Fabric unmount path. Without this, DevSettings.reload() nukes the
// JS context instantly while those animations are still live, and they keep
// trying to update view tags on a surface that's being destroyed underneath
// them — Reanimated logs each failed frame as a full stack trace, thousands
// of times a second, which pegs the UI thread and freezes/ANRs the app.
const DEV_RESET_UNMOUNT_GRACE_MS = 50;

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { colors, scheme } = useTheme();
  const [fontsLoaded] = useFonts({ FrankRuhlLibre_800ExtraBold });
  const [onboarded, setOnboarded] = useState(isOnboardingComplete());
  // See DEV_RESET_UNMOUNT_GRACE_MS above — true while we've unmounted
  // everything to let animations clean up, just before actually reloading.
  const [isDevResetting, setIsDevResetting] = useState(false);
  // Gates onboarded users behind the paywall until they've started a trial
  // or hold a real entitlement — see subscriptions/subscriptionState.ts.
  // Only meaningful once onboarded, so a fresh install with onboarded=false
  // computing this is harmless (hasAppAccess() reads unset storage -> false).
  const [hasAccess, setHasAccess] = useState(hasAppAccess);
  // Resumes an interception that was still in progress when the process was
  // last killed (e.g. the user backgrounded Tefillok mid-prayer and Android
  // reclaimed it) — without this, that in-progress flow would just vanish and
  // the user would land on the normal Home screen instead of back where they
  // left off. usePendingLockTrigger below still handles the live deep-link case.
  const [lockTrigger, setLockTrigger] = useState<PendingLockTrigger | null>(() => {
    if (!isOnboardingComplete()) return null;
    const pending = getPendingLockedApp();
    if (!pending) return null;
    console.log('[tefillok] Resuming interception after relaunch, target package:', pending.packageName);
    return { lockedAppPackage: pending.packageName };
  });

  // True while we've fired the Android direct-launch (see LockContentFlow's
  // finishAndUnlock) and are waiting to find out whether it actually took
  // over the foreground, before letting MainTabs/Home mount underneath it.
  //
  // Why this exists: Home's own useFocusEffect (src/screens/Home/index.tsx)
  // fires notification-permission requests and widget syncs the instant it
  // mounts. If MainTabs mounted immediately after firing the launch, that
  // focus effect can win the race against the OS actually switching to the
  // target app — and because Tefillok holds SYSTEM_ALERT_WINDOW, Android
  // lets it start activities (like the notification permission prompt) from
  // the background, yanking focus right back and stranding the user on
  // Tefillok's own Home screen instead of the app they meant to open. Not
  // mounting MainTabs until Tefillok has genuinely left (and later
  // re-entered) the foreground avoids that race entirely.
  const [awaitingAndroidHandoff, setAwaitingAndroidHandoff] = useState(false);

  useEffect(() => {
    initDatabase();
    configureStreakNotificationHandler();
    configureRevenueCat();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(DEV_RESET_ONBOARDING_EVENT, () => {
      setIsDevResetting(true);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isDevResetting) return;
    const timer = setTimeout(() => {
      setOnboardingComplete(false);
      // Also clear trial/entitlement state — otherwise, once a test trial
      // has ever been started on this install, hasAppAccess() stays true
      // forever and every subsequent onboarding run silently skips the
      // paywall (see resetSubscriptionStateForTesting's own comment).
      resetSubscriptionStateForTesting();
      cancelTrialEndingReminder().catch(() => {});
      reloadApp();
    }, DEV_RESET_UNMOUNT_GRACE_MS);
    return () => clearTimeout(timer);
  }, [isDevResetting]);

  // Bumped every time a lock trigger is (re)set, so the stale-handoff cleanup
  // below can tell whether it's still looking at the handoff it started with —
  // see the comment on that effect for why this matters.
  const lockTriggerGenerationRef = useRef(0);

  // Fires when the user tapped a locked app (YouTube, etc.) and got bounced
  // back here by the native shield/overlay — gate them behind the prayer
  // flow instead of just dropping them on the normal Home tab. Locking isn't
  // configured before onboarding finishes (or before the paywall is cleared),
  // so ignore stray triggers then.
  const handleLockTrigger = useCallback(
    (trigger: PendingLockTrigger) => {
      if (!onboarded || !hasAccess) return;
      // A fresh interception (e.g. the unlock grant just expired while the
      // user was still in the target app) always takes priority over an
      // old flow's pending handoff wait below.
      lockTriggerGenerationRef.current += 1;
      setAwaitingAndroidHandoff(false);
      setLockTrigger(trigger);
    },
    [onboarded, hasAccess]
  );
  usePendingLockTrigger(handleLockTrigger);

  const handleFlowUnlocked = useCallback(() => {
    if (Platform.OS === 'android' && lockTrigger?.lockedAppPackage) {
      setAwaitingAndroidHandoff(true);
    } else {
      lockTriggerGenerationRef.current += 1;
      setLockTrigger(null);
    }
  }, [lockTrigger]);

  useEffect(() => {
    if (!awaitingAndroidHandoff) return;
    // Snapshot which lock trigger this handoff wait belongs to. If the app's
    // return-to-foreground below is actually a brand-new interception (the
    // unlock grant expiring again while still inside the target app, or the
    // target app being missing), handleLockTrigger has already bumped this
    // past our snapshot — in that case AppState going 'active' is that new
    // interception's own deep-link arriving, not the user genuinely coming
    // back from the target app, so this stale cleanup must not clobber it.
    const generationAtStart = lockTriggerGenerationRef.current;
    let leftForeground = false;
    const graceTimer = setTimeout(() => {
      if (leftForeground) return;
      console.warn('[tefillok] Target app never left foreground after launch — assuming it failed, returning to Tefillok.');
      setAwaitingAndroidHandoff(false);
      if (lockTriggerGenerationRef.current === generationAtStart) {
        lockTriggerGenerationRef.current += 1;
        setLockTrigger(null);
      }
    }, ANDROID_HANDOFF_GRACE_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        leftForeground = true;
        clearTimeout(graceTimer);
        return;
      }
      if (leftForeground) {
        setAwaitingAndroidHandoff(false);
        if (lockTriggerGenerationRef.current !== generationAtStart) {
          console.log('[tefillok] Returned to Tefillok, but a fresh interception already superseded this handoff — leaving it alone.');
          return;
        }
        console.log('[tefillok] Returned to Tefillok after the handoff — resuming normal navigation.');
        lockTriggerGenerationRef.current += 1;
        setLockTrigger(null);
      }
    });
    return () => {
      clearTimeout(graceTimer);
      subscription.remove();
    };
  }, [awaitingAndroidHandoff]);

  // The widget's "learning needed today" tap opens tefillok://pray —
  // drop the user straight into the prayer flow, same as a locked-app bounce.
  useWidgetDeepLink(
    useCallback(() => {
      if (!onboarded || !hasAccess) return;
      setAwaitingAndroidHandoff(false);
      setLockTrigger({});
    }, [onboarded, hasAccess])
  );

  // Tapping a streak reminder/motivational notification — same destination.
  useStreakNotificationTrigger(
    useCallback(() => {
      if (!onboarded || !hasAccess) return;
      setAwaitingAndroidHandoff(false);
      setLockTrigger({});
    }, [onboarded, hasAccess])
  );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {isDevResetting || !fontsLoaded ? (
          <View style={{ flex: 1, backgroundColor: colors.background }} />
        ) : lockTrigger && !awaitingAndroidHandoff ? (
          <LockContentFlow
            preferredContentTypes={getPreferredContentTypes()}
            lockedAppPackage={lockTrigger.lockedAppPackage}
            onUnlocked={handleFlowUnlocked}
          />
        ) : awaitingAndroidHandoff ? (
          // Nothing meaningful to show here — the target app is (or is about
          // to be) covering this entirely. Matches the overlay's own
          // text-free brand-colored cover rather than a spinner/message.
          <View style={{ flex: 1, backgroundColor: colors.background }} />
        ) : onboarded && hasAccess ? (
          <NavigationContainer
            theme={{
              dark: scheme === 'dark',
              colors: {
                primary: colors.primary,
                background: colors.background,
                card: colors.surface,
                text: colors.textPrimary,
                border: colors.border,
                notification: colors.accent,
              },
              fonts: DefaultTheme.fonts,
            }}
          >
            <MainTabs />
          </NavigationContainer>
        ) : onboarded ? (
          <Paywall onTrialStarted={() => setHasAccess(true)} />
        ) : (
          <OnboardingFlow onComplete={() => setOnboarded(true)} />
        )}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
