import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface LegalDocumentProps {
  title: string;
  body: string;
}

export function LegalDocument({ title, body }: LegalDocumentProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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