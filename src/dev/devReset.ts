import { DevSettings, Platform } from 'react-native';

// Emitted by the Settings dev button; App.tsx listens for it so it can
// unmount the tree (letting Reanimated animations clean up) before actually
// reloading — see DEV_RESET_UNMOUNT_GRACE_MS in App.tsx for why.
export const DEV_RESET_ONBOARDING_EVENT = 'tefillok:devResetOnboarding';

// react-native-web doesn't implement the DevSettings native module, so
// DevSettings.reload() throws there instead of reloading — fall back to a
// real page reload on web so the dev reset button works in the browser too.
export function reloadApp() {
  if (Platform.OS === 'web') {
    window.location.reload();
  } else {
    DevSettings.reload();
  }
}
