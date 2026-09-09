import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import { IOS_APP_GROUP } from '../constants/appGroup';
import { updateAndroid } from '../../modules/streak-widget';

const iosStorage = new ExtensionStorage(IOS_APP_GROUP);

function candlesToCsv(candles: boolean[]): string {
  return candles.map((completed) => (completed ? '1' : '0')).join(',');
}

/**
 * Pushes the current streak to the home-screen widget and asks the OS to
 * redraw it immediately — call this everywhere `Home` recomputes
 * `streak`/`litToday` so the widget never lags behind the in-app hero star.
 *
 * `candles` mirrors `getStreakCandles()` (oldest first, today last, capped at
 * 9) so the large widget's weekly row matches the app's חנוכייה row exactly.
 * `celebrating` is a transient one-shot flag for the "just completed" frame —
 * see `celebrateStreakWidget` below.
 */
export function syncStreakWidget(streak: number, litToday: boolean, candles: boolean[] = [], celebrating = false): void {
  const candlesCsv = candlesToCsv(candles);

  if (Platform.OS === 'ios') {
    iosStorage.set('streak', streak);
    iosStorage.set('litToday', litToday ? 1 : 0);
    iosStorage.set('candles', candlesCsv);
    iosStorage.set('celebrating', celebrating ? 1 : 0);
    ExtensionStorage.reloadWidget();
    return;
  }
  if (Platform.OS === 'android') {
    // `updateAndroid` bridges synchronously, so a native-side rejection
    // (e.g. the OS refusing an oversized widget bitmap) throws here rather
    // than rejecting a promise — this is a best-effort background sync, not
    // something that should ever crash the screen that triggered it.
    try {
      updateAndroid(streak, litToday, candlesCsv, celebrating);
    } catch {
      // Ignored — the widget just misses this update; the next sync retries.
    }
  }
}

let celebrateTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Pushes a brief "just completed" frame — brighter halo, sparkle accent —
 * then settles back to the normal lit state about a second later. Neither
 * WidgetKit nor RemoteViews support a custom in-widget animation timeline, so
 * this is two ordinary state pushes a beat apart; the OS's own cross-fade
 * between them is what reads as "the star lighting up."
 */
export function celebrateStreakWidget(streak: number, candles: boolean[]): void {
  if (celebrateTimeout) clearTimeout(celebrateTimeout);
  syncStreakWidget(streak, true, candles, true);
  celebrateTimeout = setTimeout(() => {
    syncStreakWidget(streak, true, candles, false);
    celebrateTimeout = null;
  }, 1100);
}
