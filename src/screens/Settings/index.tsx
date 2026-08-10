import { DevSettings, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { SettingsScreenProps } from '../../navigation/types';
import { setOnboardingComplete } from '../../data/storage/mmkv';
import { colors, spacing, typography } from '../../theme';
import { SettingsSection } from './SettingsSection';
import { SubscriptionRow } from './SubscriptionRow';

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

// react-native-web doesn't implement the DevSettings native module, so
// DevSettings.reload() throws there instead of reloading — fall back to a
// real page reload on web so the dev reset button works in the browser too.
function reloadApp() {
  if (Platform.OS === 'web') {
    window.location.reload();
  } else {
    DevSettings.reload();
  }
}

export function Settings({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SettingsSection title="פרופיל">
        <Row label="מגדר" onPress={() => navigation.navigate('EditGender')} />
      </SettingsSection>

      <SettingsSection title="תוכן">
        <Row label="ניהול אפליקציות נעולות" onPress={() => navigation.getParent()?.navigate('LockList')} />
      </SettingsSection>

      <SettingsSection title="מנוי">
        <SubscriptionRow />
      </SettingsSection>

      <SettingsSection title="מידע">
        <Row label="תנאי שימוש" onPress={() => navigation.navigate('Terms')} />
        <Row label="אודות" onPress={() => navigation.navigate('About')} />
      </SettingsSection>

      {__DEV__ && (
        <SettingsSection title="פיתוח">
          <Row
            label="איפוס Onboarding ובדיקה מחדש"
            onPress={() => {
              setOnboardingComplete(false);
              reloadApp();
            }}
          />
        </SettingsSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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