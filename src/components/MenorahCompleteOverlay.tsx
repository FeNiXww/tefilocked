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
// Used only to decide whether the message card fits below the חנוכייה or
// needs to go above it — doesn't need to be exact, just a safe estimate.
const ESTIMATED_CARD_HEIGHT = 230;

export interface MenorahCompleteOverlayProps {
  visible: boolean;
  streak: number;
  /** The real חנוכייה card's on-screen rect, measured by Home right after
   * its cinematic scroll/focus sequence settles — see
   * presentMenorahCinematic in Home/index.tsx. The message card anchors to
   * this instead of the screen center, so it visibly belongs to the user's
   * actual חנוכייה rather than a generic screen-centered popup. Falls back
   * to a screen-centered position if a measurement was never available. */
  anchorRect: MenorahAnchorRect | null;
  onDismiss: () => void;
}

/**
 * The payoff half of the cinematic. By the time this becomes visible, Home
 * has already done all of the actual work: scrolled the real חנוכייה into
 * view, held a beat of stillness, then made every already-lit candle flare
 * in a small staggered wave (see HanukkiahStreakRow + Home's
 * tryShowPendingCelebration) and fired the single success haptic at that
 * wave's peak. This overlay's only job is the quiet aftermath — a soft
 * backdrop, then the headline, then the button, each its own restrained
 * opacity/position reveal rather than one block appearing all at once.
 * Recurs every day the streak stays at/above 9, same as relighting a
 * hanukkiah fully each of its last nights.
 */
export function MenorahCompleteOverlay({ visible, streak, anchorRect, onDismiss }: MenorahCompleteOverlayProps) {
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
      // Reset instantly (no animation) so a subsequent celebration — the
      // streak stays >=9 into a later day — replays the reveal from scratch
      // instead of finding everything already sitting at its end state.
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

    backdropOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
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

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value * 0.32 }));
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
            <Text style={styles.title}>החנוכייה בוערת במלואה!</Text>
            <Text style={styles.subtitle}>רצף של {streak} ימים ברצף</Text>
          </Animated.View>
          <Animated.View style={buttonStyle}>
            <PrimaryButton label="המשך" variant="accent" onPress={onDismiss} style={styles.button} />
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
