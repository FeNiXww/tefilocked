import { useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { SettingsScreenProps } from '../../navigation/types';
import { DEV_RESET_ONBOARDING_EVENT } from '../../dev/devReset';
import { getDevForcedContentId, setDevForcedContentId } from '../../dev/devContentOverride';
import { setDevForcedNow } from '../../dev/devTimeOverride';
import { haptics } from '../../haptics';
import { devDeleteAllUnlockEvents, getCurrentStreak, recordUnlockEvent } from '../../data/storage/db';
import { setLastKnownStreak, setStoredZmanimLocation } from '../../data/storage/mmkv';
import { useTheme, type ThemeColors, type Typography, type Spacing } from '../../theme';
import { AddWidgetRow } from './AddWidgetRow';
import { SettingsSection } from './SettingsSection';
import { SubscriptionRow } from './SubscriptionRow';
import { ThemeModeRow } from './ThemeModeRow';

const DAY_MS = 24 * 60 * 60 * 1000;

// Fixed test coordinates (Jerusalem) + hand-picked UTC instants for
// 2026-08-26/27 (an ordinary weekday, no Yom Tov/Shabbat interference) that
// were verified offline (see the final-hardening-pass report) to actually
// exercise Shema's distinct real-zmanim states via the engine — used only
// to drive the on-device Shema audit below, never shown to real users.
const DEV_SHEMA_TEST_LOCATION = { latitude: 31.7683, longitude: 35.2137, elevation: 754, timestamp: Date.now() };
const DEV_SHEMA_TEST_STATES: { label: string; iso: string }[] = [
  { label: '(1/4) לפני הזמן — חלון הלילה הקודם כבר ננעל', iso: '2026-08-27T01:30:00.000Z' },
  { label: '(2/4) בתוך חלון הקיום המלא (בוקר, אחרי משיכיר)', iso: '2026-08-27T04:00:00.000Z' },
  { label: '(3/4) בתקופת הבדיעבד (שכר מופחת)', iso: '2026-08-27T06:00:00.000Z' },
  { label: '(4/4) אחרי סוף זמן קריאת שמע', iso: '2026-08-27T12:00:00.000Z' },
];

/**
 * Seeds the 8 days before today as a completed streak (leaving today itself
 * open) so tapping the חנוכייה's real "start today" candle right after this
 * — an actual prayer, through the real flow — lands the 9th, driving
 * recordUnlockEvent's completion-transition check (see db.ts) and the full
 * celebration cinematic, whether that prayer happens from inside Tefillok or
 * via a locked-app interception.
 */
function devSeedEightDayStreak() {
  devDeleteAllUnlockEvents();
  const now = Date.now();
  for (let daysAgo = 8; daysAgo >= 1; daysAgo--) {
    recordUnlockEvent({
      occurredAt: new Date(now - daysAgo * DAY_MS),
      mood: 'grateful',
      connectionRating: 5,
      contentId: 'dev-seed',
      platform: 'android',
    });
  }
}

/**
 * Clears all history so getCurrentStreak() computes back to 0, while
 * persisting the real pre-clear streak as the "last known" value Home
 * compares against on its next focus — reproduces a genuine streak break
 * without waiting on real elapsed days. Switch back to the Home tab after
 * tapping this to see the extinguish cinematic.
 */
function devSimulateStreakLoss() {
  const currentStreak = getCurrentStreak();
  if (currentStreak <= 0) return;
  setLastKnownStreak(currentStreak);
  devDeleteAllUnlockEvents();
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

export function Settings({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const [forcingShema, setForcingShema] = useState(() => getDevForcedContentId() === 'prayer-shema');
  const [shemaTestStateIndex, setShemaTestStateIndex] = useState<number | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SettingsSection title="פרופיל">
        <Row label="מגדר" onPress={() => navigation.navigate('EditGender')} />
        <Row label="אזור" onPress={() => navigation.navigate('EditRegion')} />
      </SettingsSection>

      <SettingsSection title="מראה">
        <ThemeModeRow />
      </SettingsSection>

      <SettingsSection title="תוכן">
        <Row label="ניהול אפליקציות נעולות" onPress={() => navigation.getParent()?.navigate('LockList')} />
      </SettingsSection>

      <SettingsSection title="ווידג׳ט">
        <AddWidgetRow />
      </SettingsSection>

      <SettingsSection title="מנוי">
        <SubscriptionRow />
      </SettingsSection>

      <SettingsSection title="מידע">
        <Row label="תנאי שימוש" onPress={() => navigation.navigate('Terms')} />
        <Row label="מדיניות פרטיות" onPress={() => navigation.navigate('Privacy')} />
        <Row label="אודות" onPress={() => navigation.navigate('About')} />
      </SettingsSection>

      {__DEV__ && (
        <SettingsSection title="פיתוח">
          <Row
            label="איפוס תהליך ההיכרות ובדיקה מחדש"
            onPress={() => DeviceEventEmitter.emit(DEV_RESET_ONBOARDING_EVENT)}
          />
          <Row label="דמה רצף של 8 ימים (להשלמת החנוכייה)" onPress={devSeedEightDayStreak} />
          <Row label="דמה איבוד רצף" onPress={devSimulateStreakLoss} />
          <Row
            label={forcingShema ? 'בטל כפיית קריאת שמע בזרימת התפילה' : 'כפה קריאת שמע בזרימת התפילה הבאה (לבדיקה)'}
            onPress={() => {
              const next = !forcingShema;
              setDevForcedContentId(next ? 'prayer-shema' : null);
              setForcingShema(next);
            }}
          />
          <Row
            label={
              shemaTestStateIndex === null
                ? 'בדיקת 4 מצבי קריאת שמע: הגדר מיקום בדיקה + התחל'
                : `${DEV_SHEMA_TEST_STATES[shemaTestStateIndex].label} — הקש למצב הבא`
            }
            onPress={() => {
              setStoredZmanimLocation(DEV_SHEMA_TEST_LOCATION);
              const nextIndex = shemaTestStateIndex === null ? 0 : (shemaTestStateIndex + 1) % DEV_SHEMA_TEST_STATES.length;
              setDevForcedNow(DEV_SHEMA_TEST_STATES[nextIndex].iso);
              setShemaTestStateIndex(nextIndex);
            }}
          />
          {shemaTestStateIndex !== null && (
            <Row
              label="בטל זמן מדומה (חזרה לשעון האמיתי)"
              onPress={() => {
                setDevForcedNow(null);
                setShemaTestStateIndex(null);
              }}
            />
          )}
        </SettingsSection>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.xl,
    },
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfacePressed,
    },
    rowText: {
      ...typography.body,
      textAlign: 'right',
    },
  });
}