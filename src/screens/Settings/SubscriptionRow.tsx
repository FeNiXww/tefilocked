import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { restorePurchases } from '../../subscriptions/revenueCatConfig';
import { colors, spacing, typography } from '../../theme';

const SUBSCRIPTION_MANAGEMENT_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export function SubscriptionRow() {
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
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
      <Pressable style={[styles.row, styles.firstRow]} onPress={() => Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL)}>
        <Text style={styles.rowText}>ניהול מנוי</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={handleRestore} disabled={restoring}>
        <Text style={styles.rowText}>{restoring ? 'משחזר...' : 'שחזר רכישות'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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