import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { haptics } from '../haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { lightColors, useTheme, type ThemeColors, type Typography } from '../theme';

function getGradients(colors: ThemeColors) {
  return {
    // Navy is a fixed dark-navy-to-near-black CTA regardless of the active
    // theme. `colors.primary` intentionally inverts to a light blue in dark
    // mode for decorative reuse elsewhere (glows, badges) — reusing that
    // here would turn this gradient into a light-to-near-black diagonal,
    // which no single label color can stay readable against.
    navy: [lightColors.primary, lightColors.primaryDark] as const,
    accent: [colors.accent, colors.accentDark] as const,
  };
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: keyof ReturnType<typeof getGradients>;
  /** Slow idle breathing glow — used sparingly, e.g. the paywall's purchase CTA. */
  glow?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'navy',
  glow = false,
  icon,
  style,
}: PrimaryButtonProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, variant);
  const gradients = getGradients(colors);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.55);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!glow || reduceMotion) return;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glow, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow ? glowOpacity.value * 0.45 : 0,
    // shadowOpacity/shadowRadius are iOS-only — Android needs elevation for
    // the glow to render at all there. Not worth animating in step with
    // glowOpacity (elevation shadows don't composite the same way); a flat
    // value while glowing vs. none while resting reads close enough.
    elevation: glow ? 8 : 0,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 220 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const handlePress = () => {
    if (disabled) return;
    haptics.light();
    onPress();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.shadowWrap, shadowStyle, style]}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={gradients[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {icon}
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors, typography: Typography, variant: keyof ReturnType<typeof getGradients>) {
  return StyleSheet.create({
    shadowWrap: {
      alignSelf: 'stretch',
      borderRadius: 26,
      shadowColor: colors.accent,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    button: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      borderRadius: 26,
    },
    label: {
      ...typography.button,
      // Navy's gradient is the fixed chrome from `getGradients` above, not
      // theme-reactive, so its label must stay fixed too instead of
      // following typography.button's theme-reactive background token.
      ...(variant === 'navy' ? { color: lightColors.background } : null),
    },
  });
}
