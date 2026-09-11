import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { isStreakProtectionEnabled, setStreakProtectionEnabled } from '../../data/storage/mmkv';
import { useTheme, type ThemeColors, type Spacing, type Typography } from '../../theme';

/**
 * Settings row toggling whether a missed prayer on Shabbat/Yom Tov (when
 * phone use is halachically restricted) counts against the streak — see
 * `getCurrentStreak`/`isProtectedStreakDay` in db.ts, the only place that
 * reads this setting.
 */
export function StreakProtectionRow() {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const [enabled, setEnabled] = useState(isStreakProtectionEnabled);

  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>שמירת רצף בשבת ובחגים</Text>
      <Switch
        value={enabled}
        onValueChange={(next) => {
          haptics.selection();
          setEnabled(next);
          setStreakProtectionEnabled(next);
        }}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowText: {
      ...typography.body,
      textAlign: 'right',
      flex: 1,
    },
  });
}
