import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type ThemeColors, type Typography, type Spacing } from '../../theme';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    title: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primary,
      marginHorizontal: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
  });
}
