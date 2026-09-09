import { ScrollView, StyleSheet, Text } from 'react-native';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

interface LegalDocumentProps {
  title: string;
  body: string;
}

export function LegalDocument({ title, body }: LegalDocumentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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
      gap: spacing.lg,
    },
    title: {
      ...typography.title,
    },
    body: {
      ...typography.body,
      textAlign: 'right',
      lineHeight: 24,
    },
  });
}
