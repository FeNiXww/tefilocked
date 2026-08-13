import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AndroidPermissions } from '../../native/appLocking';
import {
  getLockingPermissionStatus,
  openAndroidOverlaySettings,
  openAndroidUsageAccessSettings,
  startMonitoring,
} from '../../native/appLocking';
import { colors, spacing, typography } from '../../theme';

interface AndroidPermissionGateProps {
  children: React.ReactNode;
}

/**
 * Granting these two permissions happens in system Settings, not a runtime
 * dialog, so there's no promise that resolves when the user comes back —
 * re-check on every foreground return instead. Mirrors the gate pattern in
 * IOSLockList, but Android needs two separate settings screens and this
 * re-check-on-resume behavior instead of one requestAuthorization() call.
 */
export function AndroidPermissionGate({ children }: AndroidPermissionGateProps) {
  const [details, setDetails] = useState<AndroidPermissions | null>(null);
  const monitoringStarted = useRef(false);

  const refresh = useCallback(async () => {
    const status = await getLockingPermissionStatus();
    if (status.details.platform !== 'android') return;
    setDetails(status.details);

    if (status.details.overlay && status.details.usageStats && !monitoringStarted.current) {
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

  if (details === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const granted = details.overlay && details.usageStats;
  if (granted) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>כדי לנעול אפליקציות, יש לאשר שתי הרשאות מערכת</Text>

      <View style={styles.permissionRow}>
        <View style={styles.permissionText}>
          <Text style={styles.permissionName}>גישה לנתוני שימוש</Text>
          <Text style={styles.permissionHint}>מזהה איזו אפליקציה נפתחת כרגע</Text>
        </View>
        {details.usageStats ? (
          <Text style={styles.grantedMark}>✓</Text>
        ) : (
          <Pressable style={styles.permissionButton} onPress={openAndroidUsageAccessSettings} accessibilityRole="button">
            <Text style={styles.permissionButtonText}>אפשר</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.permissionRow}>
        <View style={styles.permissionText}>
          <Text style={styles.permissionName}>הצגה מעל אפליקציות אחרות</Text>
          <Text style={styles.permissionHint}>מציג את מסך התפילה לפני האפליקציה החסומה</Text>
        </View>
        {details.overlay ? (
          <Text style={styles.grantedMark}>✓</Text>
        ) : (
          <Pressable style={styles.permissionButton} onPress={openAndroidOverlaySettings} accessibilityRole="button">
            <Text style={styles.permissionButtonText}>אפשר</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.footnote}>לאחר האישור בהגדרות, חיזרו לכאן — הבדיקה תתעדכן אוטומטית</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  permissionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionText: {
    flex: 1,
    gap: spacing.xs,
  },
  permissionName: {
    ...typography.body,
    fontWeight: '600',
  },
  permissionHint: {
    ...typography.caption,
  },
  permissionButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.button,
  },
  grantedMark: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
  },
  footnote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
