import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { hasPremiumEntitlement, restorePurchases } from '../../subscriptions/revenueCatConfig';
import { colors, spacing, typography } from '../../theme';

const SUBSCRIPTION_MANAGEMENT_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

export function SubscriptionRow() {
  const [active, setActive] = useState<boolean | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    hasPremiumEntitlement().then(setActive);
  }, []);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      setActive(restored);
    } catch (error) {
      console.warn('[tefillah-lock] Failed to restore purchases:', error);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text style={styles.label}>סטטוס מנוי</Text>
        <Text style={styles.value}>{active ? 'פעיל' : active === false ? 'לא פעיל' : '—'}</Text>
      </View>
      <Pressable style={styles.row} onPress={() => Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL)}>
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
  statusRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.body,
  },
  value: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    ...typography.body,
    textAlign: 'right',
  },
});