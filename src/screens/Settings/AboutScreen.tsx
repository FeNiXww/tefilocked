import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../../components/Logo';
import { colors, spacing, typography } from '../../theme';

export function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <Logo variant="mark" size={72} />
        <Text style={styles.appName}>תפילוקט</Text>
        <Text style={styles.tagline}>Put Hashem Before the Scroll</Text>
      </View>

      <Text style={styles.body}>
        תפילוקט עוזרת לך לעצור לפני שאתה פותח אפליקציות שמסיחות את דעתך, ולהקדיש רגע קצר לתפילה,
        פרק תהלים או מחשבה יהודית — לפני שאתה ממשיך.
      </Text>

      <Text style={styles.version}>גרסה {version}</Text>
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
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  appName: {
    ...typography.title,
  },
  tagline: {
    ...typography.bodySecondary,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  version: {
    ...typography.caption,
    marginTop: spacing.xl,
  },
});