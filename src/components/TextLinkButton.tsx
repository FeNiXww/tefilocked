import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { haptics } from '../haptics';
import { useTheme, type ThemeColors, type Typography } from '../theme';

interface TextLinkButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Plain-text dismissive action — sits beneath a PrimaryButton for optional
 * asks (e.g. "No, thanks" on a permission/widget primer) that must never be
 * visually competitive with the main CTA.
 */
export function TextLinkButton({ label, onPress, style }: TextLinkButtonProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const handlePress = () => {
    haptics.light();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8} style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    button: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      ...typography.bodySecondary,
      color: colors.textMuted,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
