import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../../haptics';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { useOnboardingPalette } from '../motion/tokens';

interface AppSealRowProps {
  name: string;
  iconBase64?: string | null;
  selected: boolean;
  onToggle: () => void;
}

/**
 * Onboarding's own take on AppListRow (LockList/AppListRow.tsx) — same
 * icon/name layout, but selecting an app seals it with a small settling lock
 * badge instead of a plain checkbox, so the choice reads as a commitment
 * rather than a form field. Deliberately a separate component rather than a
 * prop-flag on AppListRow: that one is shared with Settings' everyday app
 * list, which should stay a plain, fast utility list, not gain onboarding's
 * heavier motion.
 */
export function AppSealRow({ name, iconBase64, selected, onToggle }: AppSealRowProps) {
  const { colors, scheme, typography } = useTheme();
  const palette = useOnboardingPalette();
  const styles = createStyles(colors, scheme === 'dark', typography);
  const reduceMotion = useReducedMotion();
  const seal = useSharedValue(selected ? 1 : 0);
  const settle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      seal.value = selected ? 1 : 0;
      return;
    }
    seal.value = withSpring(selected ? 1 : 0, { damping: 14, stiffness: 220 });
    if (selected) {
      settle.value = withSequence(
        withTiming(-4, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 10, stiffness: 180 })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, reduceMotion]);

  const handlePress = () => {
    haptics.selection();
    onToggle();
  };

  const sealStyle = useAnimatedStyle(() => ({
    opacity: seal.value,
    transform: [{ scale: 0.6 + seal.value * 0.4 }],
  }));

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settle.value }],
  }));

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={name}
      >
        {iconBase64 ? (
          <Image source={{ uri: `data:image/png;base64,${iconBase64}` }} style={[styles.icon, selected && styles.iconSealed]} />
        ) : (
          <View style={[styles.iconPlaceholder, selected && styles.iconSealed]}>
            <Text style={styles.iconPlaceholderLetter}>{name.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.sealSlot}>
          <Animated.View style={[styles.seal, { backgroundColor: palette.ember }, sealStyle]}>
            <Ionicons name="lock-closed" size={13} color={lightColors.background} />
          </Animated.View>
          {!selected && <View style={styles.sealEmpty} />}
        </View>
      </Pressable>
    </Animated.View>
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
    iconSealed: {
      opacity: 0.9,
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
      color: lightColors.primary,
    },
    name: {
      ...typography.body,
      flex: 1,
      textAlign: 'right',
    },
    nameSelected: {
      color: isDark ? colors.textPrimary : lightColors.textPrimary,
      fontWeight: '600',
    },
    sealSlot: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seal: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sealEmpty: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.surfacePressed,
    },
  });
}
