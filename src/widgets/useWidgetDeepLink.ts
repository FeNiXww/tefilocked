import { useEffect } from 'react';
import * as Linking from 'expo-linking';

/**
 * Fires when the app is opened via `tefillahlock://pray` — the URL the home
 * screen widget sets as its tap target while today's prayer is still
 * outstanding, so the user lands directly in the prayer flow instead of just
 * Home. Separate from `usePendingLockTrigger` (which owns the app-locking
 * shield/deep-link contract) since this is a plain, unrelated URL scheme
 * case and RN's `Linking` happily supports multiple independent listeners.
 */
export function useWidgetDeepLink(onTriggered: () => void): void {
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const { hostname } = Linking.parse(url);
      if (hostname === 'pray') onTriggered();
    };
    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrl({ url });
      })
      .catch(() => {});
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTriggered]);
}
