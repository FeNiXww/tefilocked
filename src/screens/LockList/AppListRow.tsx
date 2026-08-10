import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface AppListRowProps {
  name: string;
  iconBase64?: string | null;
  selected: boolean;
  onToggle: () => void;
}

export function AppListRow({ name, iconBase64, selected, onToggle }: AppListRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
    >
      {iconBase64 ? (
        <Image source={{ uri: `data:image/png;base64,${iconBase64}` }} style={styles.icon} />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconPlaceholderLetter}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.accentLight,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderLetter: {
    ...typography.bodySecondary,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfacePressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});