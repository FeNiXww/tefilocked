import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { getCachedZmanimLocation } from '../../native/location';
import { isStreakProtectionEnabled, setStreakProtectionEnabled } from '../../data/storage/mmkv';
import { useTheme, type ThemeColors, type Spacing, type Typography } from '../../theme';

/**
 * Settings row toggling whether a missed prayer on Shabbat/Yom Tov (when
 * phone use is halachically restricted) counts against the streak — see
 * `getCurrentStreak`/`isProtectedStreakDay` in db.ts, the only place that
 * reads this setting. Shows a small note when real sunset/tzeit times (see
 * shabbatWindow.ts) are active; the location ask itself lives in onboarding
 * (LocationPrimer) and the "הפעל מיקום" row in the Profile section above —
 * not duplicated here.
 */
export function StreakProtectionRow() {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const [enabled, setEnabled] = useState(isStreakProtectionEnabled);
  const hasLocation = Boolean(getCachedZmanimLocation());

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.rowText}>שמירת רצף בשבת ובחגים</Text>
        <Switch
          value={enabled}
          onValueChange={(next) => {
            haptics.selection();
            setEnabled(next);
            setStreakProtectionEnabled(next);
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          // Android's default Switch thumb ignores trackColor and falls back
          // to the OS's stock Material accent (a green not otherwise used
          // anywhere in this app) unless thumbColor is set explicitly too —
          // a fixed white thumb matches the app's other controls and reads
          // clearly against either track color in both themes.
          thumbColor="#FFFFFF"
        />
      </View>

      {enabled && hasLocation && (
        <View style={styles.locationRow}>
          <Text style={styles.locationInfoText}>זמני שבת וחג מחושבים לפי המיקום שלך (שקיעה וצאת כוכבים)</Text>
        </View>
      )}
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
    locationRow: {
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    locationInfoText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'right',
    },
  });
}
