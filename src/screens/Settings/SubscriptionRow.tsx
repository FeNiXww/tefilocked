import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { restorePurchases } from '../../subscriptions/revenueCatConfig';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const SUBSCRIPTION_MANAGEMENT_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export function SubscriptionRow() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [restoring, setRestoring] = useState(false);

  const handleManage = () => {
    haptics.selection();
    Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL);
  };

  const handleRestore = async () => {
    haptics.selection();
    setRestoring(true);
    try {
      await restorePurchases();
    } catch (error) {
      console.warn('[tefillok] Failed to restore purchases:', error);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={[styles.row, styles.firstRow]} onPress={handleManage}>
        <Text style={styles.rowText}>ניהול מנוי</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={handleRestore} disabled={restoring}>
        <Text style={styles.rowText}>{restoring ? 'משחזר...' : 'שחזר רכישות'}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      gap: 0,
    },
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    firstRow: {
      borderTopWidth: 0,
    },
    rowText: {
      ...typography.body,
      textAlign: 'right',
    },
  });
}
