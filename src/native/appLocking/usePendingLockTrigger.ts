import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { addPendingUnlockListener, checkAndClearPendingUnlock, getAndroidLockedApps } from './index';

export interface PendingLockTrigger {
  lockedAppPackage?: string;
}

/**
 * Bridges both platforms' "a locked app was opened" signal into one React
 * callback. iOS delivers this as a shield-button-tap event (opaque tokens —
 * no package/app-name survives); Android delivers it as a deep link carrying
 * the real package name (expo-app-blocker's documented deep-link contract:
 * `<scheme>://blocked?app=&package=&reason=`). Uses the guarded wrapper in
 * ./index (not expo-app-blocker directly) so this stays safe when the
 * native module isn't linked (Expo Go).
 */
export function usePendingLockTrigger(onTriggered: (trigger: PendingLockTrigger) => void): void {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (checkAndClearPendingUnlock()) {
        onTriggered({});
      }
      const subscription = addPendingUnlockListener(() => onTriggered({}));
      return () => subscription.remove();
    }

    const handleUrl = ({ url }: { url: string }) => {
      const { hostname, queryParams } = Linking.parse(url);
      if (hostname !== 'blocked') return;
      // The scheme is exported (any installed app can send this intent), so the
      // package name it claims isn't trustworthy on its own — only accept it if
      // it's actually one of the user's configured locked apps.
      const claimedPackage = queryParams?.package as string | undefined;
      const lockedAppPackage = claimedPackage && getAndroidLockedApps().includes(claimedPackage) ? claimedPackage : undefined;
      onTriggered({ lockedAppPackage });
    };
    const linkingSubscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrl({ url });
      })
      .catch((error) => {
        console.warn('[tefillah-lock] Failed to read initial deep link:', error);
      });
    return () => linkingSubscription.remove();
  }, [onTriggered]);
}