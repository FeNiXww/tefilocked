import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { lightColors, useTheme, type ThemeColors, type Spacing, type Typography } from '../theme';

interface PermissionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  what: string;
  /** Optional "why this is needed" line — the onboarding explainer shows it, the plainer Locked Apps fallback gate can skip it. */
  why?: string;
  granted: boolean;
  /** True once the user has been sent to Settings for this permission at least once and it's still not granted — swaps the CTA to a "still not approved" retry state instead of the first-time ask. */
  deniedAfterAttempt?: boolean;
  onPress: () => void;
  /** De-emphasizes the card (lower opacity) while another permission is the guided "do this first" step. */
  emphasized?: boolean;
}

/**
 * One permission's explanation + live status, shared between the onboarding
 * permission-setup step and the Locked Apps page's fallback gate — the single
 * visual representation of "here's a permission, here's why, here's whether
 * it's granted" so the two surfaces never drift into different wording or
 * different truth about what's actually granted.
 */
export function PermissionCard({
  icon,
  title,
  what,
  why,
  granted,
  deniedAfterAttempt = false,
  onPress,
  emphasized = true,
}: PermissionCardProps) {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const reduceMotion = useReducedMotion();
  const checkScale = useSharedValue(granted ? 1 : 0);
  const cardOpacity = useSharedValue(emphasized ? 1 : 0.55);

  useEffect(() => {
    if (!granted) {
      checkScale.value = 0;
      return;
    }
    checkScale.value = reduceMotion
      ? 1
      : withSpring(1, { damping: 9, stiffness: 260, mass: 0.6 });
    haptics.medium();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, reduceMotion]);

  useEffect(() => {
    cardOpacity.value = withTiming(emphasized ? 1 : 0.55, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [emphasized, cardOpacity]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.row}>
        <View style={styles.iconBadge}>
          {/* `accentLight` badge background is a fixed light tone in both
              themes (see colors.ts), so the icon is fixed to match — the
              theme-reactive `colors.accentDark` would turn light pastel-blue
              in dark mode against this always-light badge. */}
          <Ionicons name={icon} size={22} color={lightColors.accentDark} />
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.what}>{what}</Text>
          {why && <Text style={styles.why}>{why}</Text>}
        </View>

        <View style={styles.statusSlot}>
          {granted ? (
            <Animated.View style={[styles.grantedBadge, checkStyle]}>
              <Ionicons name="checkmark" size={16} color={colors.background} />
            </Animated.View>
          ) : (
            <Pressable style={styles.grantButton} onPress={onPress} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.grantButtonText}>אפשר</Text>
            </Pressable>
          )}
        </View>
      </View>

      {!granted && deniedAfterAttempt && (
        <View style={styles.retryRow}>
          <Text style={styles.retryText}>ההרשאה עדיין לא אושרה. כדי שתפילוק תוכל לעבוד, ההרשאה הזו נדרשת.</Text>
          <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.retryLink}>נסו שוב</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'right',
  },
  what: {
    ...typography.bodySecondary,
    textAlign: 'right',
  },
  why: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 2,
  },
  statusSlot: {
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  grantButton: {
    minHeight: 36,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  grantButtonText: {
    ...typography.button,
    fontSize: 14,
  },
  grantedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  retryText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
  retryLink: {
    ...typography.caption,
    color: colors.accentDark,
    fontWeight: '700',
    textAlign: 'right',
  },
  });
}
