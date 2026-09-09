import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { isPinWidgetSupportedAndroid, requestPinWidgetAndroid } from '../../../modules/streak-widget';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const IOS_STEPS = [
  'החזיקו אצבע על מסך הבית עד שהאייקונים מתחילים לרעוד',
  'הקישו על + בפינה העליונה',
  'חפשו את תפילוק ובחרו את הווידג׳ט',
];

/**
 * Lets the user add the home-screen widget from Settings. Android fires the
 * launcher's native pin-request prompt; iOS has no such API, so it shows a
 * numbered manual walkthrough instead.
 */
export function AddWidgetRow() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [pinSupported] = useState(() => Platform.OS === 'android' && isPinWidgetSupportedAndroid());
  const [requested, setRequested] = useState(false);

  const handlePin = () => {
    haptics.light();
    setRequested(requestPinWidgetAndroid());
  };

  if (pinSupported && !requested) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, styles.firstRow, pressed && styles.rowPressed]}
        onPress={handlePin}
      >
        <Text style={styles.rowText}>הוספת הווידג׳ט למסך הבית</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, styles.firstRow]}>
      <Text style={styles.rowText}>הוספת הווידג׳ט למסך הבית</Text>
      {Platform.OS === 'android' ? (
        <Text style={styles.hintText}>
          {requested
            ? 'תוכלו למצוא את הבקשה להוספה בראש מסך הבית'
            : 'החזיקו אצבע על מסך הבית ← ווידג׳טים ← תפילוק'}
        </Text>
      ) : (
        <View style={styles.stepsCard}>
          {IOS_STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  rowText: {
    ...typography.body,
    textAlign: 'right',
  },
  hintText: {
    ...typography.caption,
    textAlign: 'right',
  },
  stepsCard: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentDark,
  },
  stepText: {
    ...typography.caption,
    flex: 1,
    textAlign: 'right',
  },
  });
}
