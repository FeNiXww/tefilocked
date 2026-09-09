import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../../components/Logo';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

export function AboutScreen() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <Logo variant="mark" size={72} />
        <Text style={styles.appName}>תפילוק</Text>
        <Text style={styles.tagline}>שים את ה' לפני הגלילה</Text>
      </View>

      <Text style={styles.body}>
        תפילוק עוזרת לך לעצור לפני שאתה פותח אפליקציות שמסיחות את דעתך, ולהקדיש רגע קצר לתפילה,
        פרק תהלים או מחשבה יהודית — לפני שאתה ממשיך.
      </Text>

      <Text style={styles.version}>גרסה {version}</Text>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
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
}
