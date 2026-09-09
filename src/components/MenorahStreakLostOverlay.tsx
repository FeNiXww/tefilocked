import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { spacing, useTheme, type ThemeColors, type Typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import {
  BUTTON_REVEAL_DELAY_MS,
  BUTTON_REVEAL_DURATION_MS,
  TEXT_REVEAL_DURATION_MS,
  TEXT_TRANSLATE_Y,
  type MenorahAnchorRect,
} from './menorahCinematic';

const CARD_GAP = spacing.lg;
const ESTIMATED_CARD_HEIGHT = 240;

export interface MenorahStreakLostOverlayProps {
  visible: boolean;
  previousStreak: number;
  /** The real חנוכייה card's on-screen rect, measured by Home right after
   * its cinematic scroll/focus sequence settles — see
   * presentMenorahCinematic in Home/index.tsx. By the time this is visible,
   * Home has already run the real row's staggered gutter-out sequence
   * (HanukkiahStreakRow's Candle) and the silence pause that follows it — the
   * חנוכייה is already dark and quiet. This overlay only anchors the
   * acknowledgment card to it. */
  anchorRect: MenorahAnchorRect | null;
  onDismiss: () => void;
}

/**
 * The other half of the cinematic system — same "scroll → focus → pause"
 * opening as MenorahCompleteOverlay, emotionally reversed: by the time this
 * becomes visible, the real candles have already gone dark on the real
 * חנוכייה (Home's staggered extinguish) and a warning haptic has already
 * fired at the true moment the last flame went out. This overlay is just
 * the quiet aftermath — backdrop, then headline, then button — using the
 * exact same reveal timing as MenorahCompleteOverlay so completion and loss
 * read as one product, not two different UI styles.
 */
export function MenorahStreakLostOverlay({ visible, previousStreak, anchorRect, onDismiss }: MenorahStreakLostOverlayProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const backdropOpacity = useSharedValue(0);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(TEXT_TRANSLATE_Y);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(TEXT_TRANSLATE_Y);

  useEffect(() => {
    if (!visible) {
      backdropOpacity.value = 0;
      headlineOpacity.value = 0;
      headlineTranslateY.value = TEXT_TRANSLATE_Y;
      buttonOpacity.value = 0;
      buttonTranslateY.value = TEXT_TRANSLATE_Y;
      return;
    }

    if (reduceMotion) {
      backdropOpacity.value = 1;
      headlineOpacity.value = 1;
      headlineTranslateY.value = 0;
      buttonOpacity.value = 1;
      buttonTranslateY.value = 0;
      return;
    }

    // Gentler/shorter than the old version — the real candles + the silence
    // pause already did the emotional work before this ever mounts, so the
    // backdrop no longer needs to race them.
    backdropOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
    headlineOpacity.value = withTiming(1, { duration: TEXT_REVEAL_DURATION_MS, easing: Easing.out(Easing.cubic) });
    headlineTranslateY.value = withTiming(0, { duration: TEXT_REVEAL_DURATION_MS, easing: Easing.out(Easing.cubic) });
    buttonOpacity.value = withDelay(
      BUTTON_REVEAL_DELAY_MS,
      withTiming(1, { duration: BUTTON_REVEAL_DURATION_MS, easing: Easing.out(Easing.cubic) })
    );
    buttonTranslateY.value = withDelay(
      BUTTON_REVEAL_DELAY_MS,
      withTiming(0, { duration: BUTTON_REVEAL_DURATION_MS, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const anchor = anchorRect ?? {
    x: windowWidth / 2 - 80,
    y: windowHeight / 2 - 80,
    width: 160,
    height: 160,
  };

  const fitsBelow = anchor.y + anchor.height + CARD_GAP + ESTIMATED_CARD_HEIGHT <= windowHeight - insets.bottom - spacing.lg;
  const cardPositionStyle = fitsBelow
    ? { top: anchor.y + anchor.height + CARD_GAP }
    : { bottom: windowHeight - anchor.y + CARD_GAP };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value * 0.5 }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable style={styles.fill} onPress={onDismiss} accessibilityLabel="סגירה">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        <Animated.View style={[styles.card, cardPositionStyle]} pointerEvents={visible ? 'auto' : 'none'}>
          <Animated.View style={[styles.headline, headlineStyle]}>
            <Text style={styles.title}>הרצף נשבר</Text>
            <Text style={styles.subtitle}>
              {previousStreak > 0
                ? `היה לך רצף של ${previousStreak} ימים — אפשר להתחיל רצף חדש היום`
                : 'אפשר להתחיל רצף חדש היום'}
            </Text>
          </Animated.View>
          <Animated.View style={buttonStyle}>
            <PrimaryButton label="להתחיל מחדש" variant="navy" onPress={onDismiss} style={styles.button} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: colors.primaryDark,
  },
  card: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  headline: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  button: {
    minWidth: 180,
    marginTop: spacing.xs,
  },
  });
}
