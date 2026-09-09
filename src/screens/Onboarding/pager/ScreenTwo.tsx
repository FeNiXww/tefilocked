import { Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { headlineFontFamily, useTheme, type ThemeColors, type Spacing, type Typography } from '../../../theme';
import { ContinueNodeButton } from '../ContinueNodeButton';
import { HighlightText } from '../HighlightText';
import { ThemeToggleButton } from '../ThemeToggleButton';
import type { PagerPageProps } from './OnboardingPager';
import { useBreathingScale, usePageActive, usePageProgress } from './pagerAnimations';

const hit = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(() => {});

/**
 * Placeholder until the "shepherd embracing the lamb" artwork exists —
 * reuses the walking-shepherd hero so this screen renders correctly today.
 * Pass `illustration` (or swap this default) once the real asset lands.
 */
const EMBRACE_ILLUSTRATION = require('../../../../assets/onboarding/welcome-hero.png') as ImageSourcePropType;

interface ScreenTwoProps extends PagerPageProps {
  illustration?: ImageSourcePropType;
}

/** Screen 2 — "The Embrace": the solution beat, swiped in right after the Welcome page. */
export function ScreenTwo({ index, scrollX, pageWidth, illustration, onNext }: ScreenTwoProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const progress = usePageProgress(scrollX, index, pageWidth);
  const isActive = usePageActive(scrollX, index, pageWidth);
  const breathingScale = useBreathingScale(isActive);
  const pressProgress = useSharedValue(0);

  const textStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [-1, 0], [28, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [-1, -0.35, 0], [0, 0.3, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const illustrationStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [-1, 0], [40, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [-1, -0.4, 0], [0, 0.4, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }, { scale: breathingScale.value }] };
  });

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    hit(Haptics.ImpactFeedbackStyle.Rigid);
  };
  const handlePressOut = () => {
    pressProgress.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    hit(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={[styles.root, { paddingTop: insets.top + 56 }]}>
      <SparkleBackground tone="navy" starCount={8} />
      <ThemeToggleButton />

      <Animated.View style={textStyle}>
        <HighlightText
          text="התמכרות לרשתות החברתיות מרחיקה אותך **מ ה׳**"
          style={styles.headline}
        />
      </Animated.View>

      <Animated.View style={[styles.illustrationSlot, illustrationStyle]} pointerEvents="none">
        <Image
          source={illustration ?? EMBRACE_ILLUSTRATION}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Pressable
        style={[styles.continueWrap, { bottom: spacing.xl + insets.bottom }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onNext}
      >
        <ContinueNodeButton pressProgress={pressProgress} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
    },
    headline: {
      ...typography.hero,
      fontFamily: headlineFontFamily,
      fontSize: 30,
      textAlign: 'center',
    },
    illustrationSlot: {
      flex: 1,
      alignSelf: 'stretch',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      marginHorizontal: -spacing.xl,
    },
    illustrationImage: {
      flex: 1,
      width: '100%',
    },
    continueWrap: {
      position: 'absolute',
      right: spacing.xl,
    },
  });
}
