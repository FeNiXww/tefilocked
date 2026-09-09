import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getAndroidLockedApps, getLockingPermissionStatus, openAndroidOverlaySettings, openAndroidUsageAccessSettings, startMonitoring } from './index';

export type AndroidPermissionKey = 'usageStats' | 'overlay';

export interface AndroidLockingPermissionState {
  usageStats: boolean;
  overlay: boolean;
}

interface UseAndroidLockingPermissionsResult {
  /** null until the first real check comes back. */
  status: AndroidLockingPermissionState | null;
  /** Both permissions granted. */
  granted: boolean;
  /** Whether the user has been sent to Settings for each permission at least once this mount — lets callers distinguish "not asked yet" from "went and came back still missing it". */
  attempted: Record<AndroidPermissionKey, boolean>;
  requestUsageAccess: () => void;
  requestOverlay: () => void;
  refresh: () => Promise<void>;
}

/**
 * Single source of truth for the two Android app-locking permissions (usage
 * access + overlay) — real system state only, never assumed. Both the
 * onboarding permission step and the Locked Apps page's fallback gate read
 * from this same hook, so there's one place that knows how to check status,
 * re-check on foreground return, and kick off monitoring once both are granted.
 *
 * Granting either permission happens in system Settings, not a runtime
 * dialog, so there's no promise that resolves when the user comes back —
 * re-check on every foreground return instead.
 */
export function useAndroidLockingPermissions(): UseAndroidLockingPermissionsResult {
  const [status, setStatus] = useState<AndroidLockingPermissionState | null>(null);
  const [attempted, setAttempted] = useState<Record<AndroidPermissionKey, boolean>>({
    usageStats: false,
    overlay: false,
  });
  const monitoringStarted = useRef(false);

  const refresh = useCallback(async () => {
    const result = await getLockingPermissionStatus();
    if (result.details.platform !== 'android') return;
    setStatus({ usageStats: result.details.usageStats, overlay: result.details.overlay });

    // Starting the service the moment both permissions are granted — even
    // before the user has picked any apps to block — would show Android's
    // "running in background" notification for a service with nothing to
    // do yet. setAndroidLockedApps (see index.tsx) starts it the moment the
    // user actually picks a first app, and stops it if the list is ever
    // emptied back out; this only covers the other case, where permissions
    // are (re-)granted while a non-empty block list already exists (e.g. a
    // permission was revoked and regranted, or the app was reinstalled).
    if (result.details.usageStats && result.details.overlay && !monitoringStarted.current && getAndroidLockedApps().length > 0) {
      monitoringStarted.current = true;
      startMonitoring();
    }
  }, []);

  useEffect(() => {
    const safeRefresh = () => {
      refresh().catch((error) => {
        console.warn('[tefillok] Failed to read Android locking permissions:', error);
      });
    };
    safeRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') safeRefresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const requestUsageAccess = useCallback(() => {
    setAttempted((prev) => ({ ...prev, usageStats: true }));
    openAndroidUsageAccessSettings();
  }, []);

  const requestOverlay = useCallback(() => {
    setAttempted((prev) => ({ ...prev, overlay: true }));
    openAndroidOverlaySettings();
  }, []);

  const granted = !!status && status.usageStats && status.overlay;

  return { status, granted, attempted, requestUsageAccess, requestOverlay, refresh };
}
