import { Platform, Text, View } from 'react-native';
import { storage, StorageKeys } from '../../data/storage/mmkv';
import { colors } from '../../theme';
import type * as AppBlockerNS from 'expo-app-blocker';

/**
 * Thin wrapper around expo-app-blocker (the vendored/forked candidate from
 * the architecture plan's Phase 0). Kept as a single seam so this package
 * can be swapped or hand-rolled against FamilyControls/UsageStatsManager
 * directly without touching call sites elsewhere in the app — see the
 * "Library maturity risk" note in the architecture plan.
 *
 * expo-app-blocker calls `requireNativeModule(...)` at its own module top
 * level, which throws synchronously the moment this module is imported if
 * the native module isn't linked (Expo Go). A plain `import` would crash
 * the whole app before any function here even runs, so it's loaded via a
 * guarded `require()` instead — this is the one place that needs to know
 * about that; every export below just checks `AppBlocker` and falls back.
 * A real dev/production build always has the native module linked and
 * never hits these fallback branches.
 */
type AppBlockerModule = typeof AppBlockerNS;

let AppBlocker: AppBlockerModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppBlocker = require('expo-app-blocker') as AppBlockerModule;
} catch {
  console.warn('[tefillah-lock] expo-app-blocker unavailable (Expo Go?) — app-locking features are mocked.');
}

const NO_PERMISSIONS: AppBlockerNS.PermissionStatus = {
  allGranted: false,
  details: { platform: 'android', overlay: false, usageStats: false, notifications: false },
};

const DEMO_INSTALLED_APPS: AppBlockerNS.AndroidBlockableApp[] = [
  { packageName: 'com.instagram.android', name: 'Instagram (הדגמה)' },
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok (הדגמה)' },
  { packageName: 'com.google.android.youtube', name: 'YouTube (הדגמה)' },
  { packageName: 'com.facebook.katana', name: 'Facebook (הדגמה)' },
];

let mockLockedPackages: string[] = [];

export async function requestLockingPermissions(): Promise<AppBlockerNS.PermissionStatus> {
  if (!AppBlocker) return NO_PERMISSIONS;
  return AppBlocker.requestPermissions();
}

export async function getLockingPermissionStatus(): Promise<AppBlockerNS.PermissionStatus> {
  if (!AppBlocker) return NO_PERMISSIONS;
  return AppBlocker.getPermissionStatus();
}

// --- Android: the two permissions can only be granted from system Settings, not a runtime prompt. ---

export function openAndroidOverlaySettings(): void {
  AppBlocker?.openOverlaySettings();
}

export function openAndroidUsageAccessSettings(): void {
  AppBlocker?.openUsageStatsSettings();
}

// --- Android: locked apps are plain package names, chosen from a custom RN list screen. ---

export function setAndroidLockedApps(packages: string[]): void {
  if (AppBlocker) {
    AppBlocker.setBlockedApps(packages);
  } else {
    mockLockedPackages = packages;
  }
  storage.set(StorageKeys.lockedAppPackages, JSON.stringify(packages));
}

export function getAndroidLockedApps(): string[] {
  if (!AppBlocker) return mockLockedPackages;
  return AppBlocker.getBlockedApps();
}

export async function getAndroidInstalledApps(): Promise<AppBlockerNS.AndroidBlockableApp[]> {
  if (!AppBlocker) return DEMO_INSTALLED_APPS;
  const apps = await AppBlocker.getInstalledApps();
  return apps.length > 0 ? apps : DEMO_INSTALLED_APPS;
}

// --- iOS: locked apps are opaque tokens from FamilyActivityPickerView, persisted as base64 selectionData. ---
// Note: the native picker/list VIEW components below fall back to inert
// placeholders — they can't be meaningfully mocked without the native module.

export async function setIOSLockConfiguration(items: AppBlockerNS.IOSBlockedItem[]) {
  if (!AppBlocker) return;
  await AppBlocker.setBlockConfiguration({ blockedItems: items, isActive: true });
}

export function getIOSLockConfiguration() {
  if (!AppBlocker) return null;
  return AppBlocker.getBlockConfiguration();
}

export function clearIOSLockConfiguration(): void {
  AppBlocker?.clearAllBlocks();
}

export function persistIOSSelectionData(selectionData: string): void {
  storage.set(StorageKeys.lockedAppSelectionData, selectionData);
}

export function getPersistedIOSSelectionData(): string {
  return storage.getString(StorageKeys.lockedAppSelectionData) ?? '';
}

// --- iOS: temporary unlock after the LockContentFlow completes. ---
// Android has its own timed-budget equivalent — see unlockAndLaunchAndroidApp below.

export async function grantTemporaryUnlock(minutes: number) {
  if (!AppBlocker) return { unlocked: true, expiresAt: Date.now() + minutes * 60_000 };
  return AppBlocker.temporaryUnlock(minutes);
}

// --- Android: unlock every blocked app for a duration + direct launch of the app that triggered the lock. ---

export function unlockAndLaunchAndroidApp(packageName: string | undefined, durationMinutes?: number): void {
  if (Platform.OS !== 'android') return;
  AppBlocker?.unlockAndLaunchAndroid(packageName ?? '', durationMinutes);
}

export async function relockNow() {
  if (!AppBlocker) return { relocked: true };
  return AppBlocker.relockApps();
}

// --- Both platforms: seconds left before blocked apps lock again, 0 if nothing is unlocked. ---

export function getRemainingUnlockSeconds(): number {
  if (!AppBlocker) return 0;
  return AppBlocker.getRemainingUnlockTime();
}

// The system briefly shows this cover (SYSTEM_ALERT_WINDOW) while the deep
// link back into the app is still landing — deliberately no title/text/icon/
// spinner. Interception is communicated by a native haptic (fired natively,
// see OverlayManager.show()) and the app's own fade-in once it lands, not an
// on-screen "this app is locked" message. Only the background color is
// configured, so the cover matches the app instead of flashing white.
export function configureAndroidOverlay(): void {
  if (Platform.OS !== 'android') return;
  AppBlocker?.configureAndroid({
    overlayBackgroundColor: colors.background,
  });
}

export function startMonitoring(): void {
  if (Platform.OS !== 'android') return;
  // iOS enforcement is event-driven (ManagedSettings shields + the
  // DeviceActivityMonitor extension) — there's no polling loop to start.
  AppBlocker?.startMonitoring();
}

export function stopMonitoring(): void {
  if (Platform.OS !== 'android') return;
  AppBlocker?.stopMonitoring();
}

export function checkAndClearPendingUnlock(): boolean {
  if (!AppBlocker) return false;
  return AppBlocker.checkAndClearPendingUnlock();
}

export function addPendingUnlockListener(callback: () => void): { remove: () => void } {
  if (!AppBlocker) return { remove: () => {} };
  return AppBlocker.addPendingUnlockListener(callback) ?? { remove: () => {} };
}

function FamilyActivityPickerFallback(props: AppBlockerNS.FamilyActivityPickerViewProps) {
  return (
    <View style={props.style}>
      <Text>בורר האפליקציות של Screen Time אינו זמין בתצוגה מקדימה זו.</Text>
    </View>
  );
}

function BlockedAppsNativeListFallback() {
  return null;
}

export const FamilyActivityPickerView = AppBlocker?.FamilyActivityPickerView ?? FamilyActivityPickerFallback;
export const BlockedAppsNativeList = AppBlocker?.BlockedAppsNativeList ?? BlockedAppsNativeListFallback;

export type { IOSBlockedItem, FamilyActivityPickerSelectionEvent, AndroidPermissions } from 'expo-app-blocker';