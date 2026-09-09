import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

interface AppListRowProps {
  name: string;
  iconBase64?: string | null;
  selected: boolean;
  onToggle: () => void;
}

export function AppListRow({ name, iconBase64, selected, onToggle }: AppListRowProps) {
  const { colors, scheme, typography } = useTheme();
  const styles = createStyles(colors, scheme === 'dark', typography);
  const handlePress = () => {
    haptics.selection();
    onToggle();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
      onPress={handlePress}
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
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
        {name}
      </Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean, typography: Typography) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    // `accentLight` is a fixed near-white tone in both themes (see
    // colors.ts) — fine for a small decorative badge, but a whole selected
    // row filled with it reads as a blown-out white flash against the dark
    // background. In dark mode, use a low-opacity tint of `primary` instead
    // so selection stays visible without fighting the theme.
    rowSelected: {
      backgroundColor: isDark ? `${colors.primary}33` : colors.accentLight,
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
    // `iconPlaceholder`'s `primaryLight` fill is a fixed light tone in both
    // themes (see colors.ts), so this letter is fixed to match — the
    // theme-reactive `colors.primary` would turn light pastel-blue in dark
    // mode against this always-light circle.
    iconPlaceholderLetter: {
      ...typography.bodySecondary,
      fontWeight: '700',
      color: lightColors.primary,
    },
    name: {
      ...typography.body,
      flex: 1,
      textAlign: 'right',
    },
    // In light mode `rowSelected`'s background stays fixed-light, so the
    // theme-reactive `textPrimary` (which turns near-white in dark mode)
    // would disappear against it — pin to the light-mode value there. In
    // dark mode `rowSelected` is now a dark tint, so the reactive color works.
    nameSelected: {
      color: isDark ? colors.textPrimary : lightColors.textPrimary,
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
}
