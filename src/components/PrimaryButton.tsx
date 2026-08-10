import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
import { colors, typography } from '../theme';

const GRADIENTS = {
  navy: [colors.primary, colors.primaryDark] as const,
  accent: [colors.accent, colors.accentDark] as const,
};

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: keyof typeof GRADIENTS;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
          colors={GRADIENTS[variant]}
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

const styles = StyleSheet.create({
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
  },
});
