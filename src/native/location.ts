import {
  getStoredZmanimLocation,
  isZmanimLocationDenied,
  setStoredZmanimLocation,
  setZmanimLocationDenied,
  type StoredZmanimLocation,
} from '../data/storage/mmkv';

/**
 * The ONLY place in the app that touches `expo-location`. Foreground-only,
 * one-shot, low-accuracy (city-level is plenty for zmanim — sunrise/sunset
 * barely shift over a few km), and never called automatically: something in
 * the UI (a time-sensitive prayer's "why?" panel) must call
 * `requestZmanimLocation()` in direct response to a user action, with the
 * explanatory copy already shown before the OS permission dialog appears.
 * No background permission is requested and no continuous tracking happens
 * anywhere in this module.
 *
 * `expo-location` is required lazily (inside the function, not as a
 * top-level import) and guarded — the same defensive pattern
 * `data/storage/mmkv.ts` uses for `react-native-mmkv`. A top-level import
 * would evaluate the native module binding as soon as anything imports this
 * file at all (including just reading a cached location, which never
 * touches the native side), which crashes the whole app on any build where
 * the native module hasn't been (re)linked yet — e.g. a JS-only Metro
 * reload after `expo-location` was newly added, before a real
 * `expo run:android`/prebuild. Lazy-requiring means only an actual
 * permission/location request can hit that failure, and it's caught.
 */

export type LocationResult =
  | { status: 'granted'; location: StoredZmanimLocation }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** A cached location, if one was already fetched — never triggers a permission prompt, never touches the native module. */
export function getCachedZmanimLocation(): StoredZmanimLocation | null {
  return getStoredZmanimLocation();
}

/** True once the user has said no — callers should stop offering the location-based flow (a Settings-level "try again" is the only way back in). */
export function hasZmanimLocationBeenDenied(): boolean {
  return isZmanimLocationDenied();
}

/**
 * Requests foreground location permission if not already granted, fetches
 * one low-accuracy fix, and caches it. Call this only from a user-initiated
 * action, after the app has already explained *why* — never on mount, never
 * speculatively.
 */
export async function requestZmanimLocation(): Promise<LocationResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Location = require('expo-location') as typeof import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setZmanimLocationDenied(true);
      return { status: 'denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const stored: StoredZmanimLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      elevation: position.coords.altitude ?? 0,
      timestamp: Date.now(),
    };
    setStoredZmanimLocation(stored);
    setZmanimLocationDenied(false);
    return { status: 'granted', location: stored };
  } catch (error) {
    console.warn('[tefillok] Failed to fetch zmanim location (native module unavailable, or permission/GPS failure):', error);
    return { status: 'unavailable' };
  }
}
