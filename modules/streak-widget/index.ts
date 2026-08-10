import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

// Android-only — the iOS half of the widget goes through @bacons/apple-targets'
// ExtensionStorage instead (see src/widgets/syncStreakWidget.ts), so this
// native module doesn't exist on iOS and must not be required there.
const NativeStreakWidget = Platform.OS === 'android' ? requireNativeModule('StreakWidget') : null;

/**
 * Writes the current streak to the widget's SharedPreferences and redraws
 * every placed instance immediately.
 * `candlesCsv` is a "1,1,0,..." string (oldest day first, today last, capped
 * at 9) mirroring `getStreakCandles()`, for the large widget's weekly row.
 */
export function updateAndroid(streak: number, litToday: boolean, candlesCsv: string, celebrating: boolean): void {
  NativeStreakWidget?.updateAndroid(streak, litToday, candlesCsv, celebrating);
}

/** Whether the device's launcher supports the "pin widget" system prompt (Android 8+ only). */
export function isPinWidgetSupportedAndroid(): boolean {
  return NativeStreakWidget?.isPinWidgetSupported() ?? false;
}

/** Fires the launcher's native "add this widget to your home screen?" confirmation UI. */
export function requestPinWidgetAndroid(): boolean {
  return NativeStreakWidget?.requestPinWidget() ?? false;
}
