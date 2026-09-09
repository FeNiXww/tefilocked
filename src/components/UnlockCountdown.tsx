import { Pressable, StyleSheet, Text } from 'react-native';
import { haptics } from '../haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme, type ThemeColors, type Typography } from '../theme';

export function formatRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

interface UnlockCountdownProps {
  remainingSeconds: number;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Tappable countdown to the next re-lock — shows the active grace period and opens the timer editor. */
export function UnlockCountdown({ remainingSeconds, onPress }: UnlockCountdownProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const active = remainingSeconds > 0;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 220 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };
  const handlePress = () => {
    haptics.light();
    onPress();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'שינוי טיימר הנעילה' : 'פתיחת זמן שימוש'}
      style={[styles.wrap, animatedStyle]}
    >
      <Text style={[styles.text, !active && styles.textInactive]}>
        {active ? `האפליקציות ננעלות שוב בעוד ${formatRemaining(remainingSeconds)}` : 'הקש כדי לפתוח זמן שימוש'}
      </Text>
      <Text style={styles.hint}>הקש לשינוי</Text>
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: 2,
    },
    text: {
      ...typography.bodySecondary,
      color: colors.accentDark,
      fontWeight: '700',
      textAlign: 'center',
    },
    textInactive: {
      color: colors.textMuted,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
    },
  });
}
