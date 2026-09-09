import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FamilyActivityPickerSelectionEvent, IOSBlockedItem } from 'expo-app-blocker';
import {
  BlockedAppsNativeList,
  clearIOSLockConfiguration,
  FamilyActivityPickerView,
  getLockingPermissionStatus,
  getPersistedIOSSelectionData,
  persistIOSSelectionData,
  requestLockingPermissions,
  setIOSLockConfiguration,
} from '../../native/appLocking';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

export function IOSLockList() {
  const insets = useSafeAreaInsets();
  const { colors, typography, scheme } = useTheme();
  const styles = createStyles(colors, typography);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [selectionData, setSelectionData] = useState(() => getPersistedIOSSelectionData());
  const [blockedItems, setBlockedItems] = useState<IOSBlockedItem[]>([]);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    getLockingPermissionStatus()
      .then((status) => setGranted(status.allGranted))
      .catch((error) => {
        console.warn('[tefillok] Failed to read iOS locking permissions:', error);
        setGranted(false);
      });
  }, []);

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const status = await requestLockingPermissions();
      setGranted(status.allGranted);
    } catch (error) {
      console.warn('[tefillok] Failed to request iOS locking permissions:', error);
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleSelectionChange = async (event: FamilyActivityPickerSelectionEvent) => {
    const items = event.items;
    setBlockedItems(items);
    setSelectionData(event.selectionData);
    persistIOSSelectionData(event.selectionData);

    try {
      if (items.length > 0) {
        await setIOSLockConfiguration(items);
      } else {
        clearIOSLockConfiguration();
      }
    } catch (error) {
      console.warn('[tefillok] Failed to apply iOS lock configuration:', error);
    }
  };

  if (granted === null) {
    return (
      <View style={[styles.container, styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <Text style={styles.permissionText}>כדי לנעול אפליקציות, יש לאשר גישה ל-Screen Time</Text>
        <Pressable
          style={styles.permissionButton}
          onPress={handleRequestPermission}
          disabled={requestingPermission}
          accessibilityRole="button"
          accessibilityState={{ disabled: requestingPermission }}
        >
          <Text style={styles.permissionButtonText}>{requestingPermission ? 'רגע...' : 'אפשר גישה'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FamilyActivityPickerView
        initialSelection={selectionData}
        onSelectionChange={handleSelectionChange}
        theme={scheme}
        style={blockedItems.length > 0 ? styles.pickerWithSelection : styles.picker}
      />
      {blockedItems.length > 0 && (
        <View style={styles.currentSection}>
          <Text style={styles.currentTitle}>אפליקציות חסומות</Text>
          <BlockedAppsNativeList items={blockedItems} selectionData={selectionData} style={styles.blockedList} />
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  permissionText: {
    ...typography.body,
    textAlign: 'center',
  },
  permissionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.button,
  },
  picker: {
    flex: 1,
  },
  pickerWithSelection: {
    flex: 2,
  },
  currentSection: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  currentTitle: {
    ...typography.heading,
  },
  blockedList: {
    flex: 1,
    minHeight: 100,
  },
  });
}