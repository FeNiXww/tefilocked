import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PermissionCard } from '../../components/PermissionCard';
import { useAndroidLockingPermissions } from '../../native/appLocking/useAndroidLockingPermissions';
import { spacing, useTheme, type Typography } from '../../theme';

interface AndroidPermissionGateProps {
  children: React.ReactNode;
}

/**
 * Fallback gate for the Locked Apps page — reads from the same
 * `useAndroidLockingPermissions` hook the onboarding permission-setup step
 * uses, so this is a recovery path rather than a second, independent
 * permission flow. Permissions are normally already granted by the time a
 * user reaches this page (onboarding handles that), but a permission can be
 * revoked later from system Settings, so this still needs to gracefully
 * detect and explain that.
 */
export function AndroidPermissionGate({ children }: AndroidPermissionGateProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(typography);
  const { status, granted, attempted, requestUsageAccess, requestOverlay } = useAndroidLockingPermissions();

  if (status === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (granted) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>כדי לנעול אפליקציות, יש לאשר שתי הרשאות מערכת</Text>

      <PermissionCard
        icon="eye-outline"
        title="גישה לנתוני שימוש"
        what="מזהה איזו אפליקציה נפתחת כרגע"
        granted={status.usageStats}
        deniedAfterAttempt={attempted.usageStats && !status.usageStats}
        onPress={requestUsageAccess}
      />

      <PermissionCard
        icon="layers-outline"
        title="הצגה מעל אפליקציות אחרות"
        what="מציג את מסך התפילה לפני האפליקציה החסומה"
        granted={status.overlay}
        deniedAfterAttempt={attempted.overlay && !status.overlay}
        onPress={requestOverlay}
      />

      <Text style={styles.footnote}>לאחר האישור בהגדרות, חיזרו לכאן — הבדיקה תתעדכן אוטומטית</Text>
    </View>
  );
}

function createStyles(typography: Typography) {
  return StyleSheet.create({
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
    footnote: {
      ...typography.caption,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });
}
