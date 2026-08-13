import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainTabs } from './src/navigation/MainTabs';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OnboardingFlow } from './src/screens/Onboarding';
import { LockContentFlow } from './src/screens/LockContentFlow';
import { getPreferredContentTypes, isOnboardingComplete } from './src/data/storage/mmkv';
import { initDatabase } from './src/data/storage/db';
import { configureStreakNotificationHandler, useStreakNotificationTrigger } from './src/notifications/streakReminders';
import { configureRevenueCat } from './src/subscriptions/revenueCatConfig';
import { usePendingLockTrigger, type PendingLockTrigger } from './src/native/appLocking/usePendingLockTrigger';
import { useWidgetDeepLink } from './src/widgets/useWidgetDeepLink';

export default function App() {
  const [onboarded, setOnboarded] = useState(isOnboardingComplete());
  const [lockTrigger, setLockTrigger] = useState<PendingLockTrigger | null>(null);

  useEffect(() => {
    initDatabase();
    configureStreakNotificationHandler();
    configureRevenueCat();
  }, []);

  // Fires when the user tapped a locked app (YouTube, etc.) and got bounced
  // back here by the native shield/overlay — gate them behind the prayer
  // flow instead of just dropping them on the normal Home tab. Locking isn't
  // configured before onboarding finishes, so ignore stray triggers then.
  const handleLockTrigger = useCallback(
    (trigger: PendingLockTrigger) => {
      if (!onboarded) return;
      setLockTrigger(trigger);
    },
    [onboarded]
  );
  usePendingLockTrigger(handleLockTrigger);

  // The widget's "learning needed today" tap opens tefillok://pray —
  // drop the user straight into the prayer flow, same as a locked-app bounce.
  useWidgetDeepLink(
    useCallback(() => {
      if (!onboarded) return;
      setLockTrigger({});
    }, [onboarded])
  );

  // Tapping a streak reminder/motivational notification — same destination.
  useStreakNotificationTrigger(
    useCallback(() => {
      if (!onboarded) return;
      setLockTrigger({});
    }, [onboarded])
  );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {lockTrigger ? (
          <LockContentFlow
            preferredContentTypes={getPreferredContentTypes()}
            lockedAppPackage={lockTrigger.lockedAppPackage}
            onUnlocked={() => setLockTrigger(null)}
          />
        ) : onboarded ? (
          <NavigationContainer>
            <MainTabs />
          </NavigationContainer>
        ) : (
          <OnboardingFlow onComplete={() => setOnboarded(true)} />
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
