import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SparkleBackground } from '../../components/SparkleBackground';
import { colors, spacing } from '../../theme';
import { OnboardingHeroMedia } from './OnboardingHeroMedia';
import { ProgressBar } from './ProgressBar';

interface OnboardingScreenShellProps {
  onBack?: () => void;
  progress?: { current: number; total: number };
  tone?: 'accent' | 'navy';
  scroll?: boolean;
  /** Full-bleed artwork behind the sparkle layer, see OnboardingHeroMedia. */
  heroMedia?: ImageSourcePropType;
  children: ReactNode;
}

/**
 * Shared chrome for most onboarding steps: background, optional back arrow,
 * optional question-bank progress bar, and a content area. Full-bleed
 * "tap to continue" narrative beats (Welcome/Problem/Solution/Bridge) skip
 * this entirely in favor of `TapToContinue`, which has no back affordance.
 *
 * The content settles in with a soft rise-and-fade every time the step
 * changes — keyed on `progress.current` rather than mount, since several
 * steps in a row reuse the same component (SingleChoiceStep, MultiChoiceStep)
 * with different props, and React won't remount a same-typed component just
 * because its props changed.
 */
export function OnboardingScreenShell({
  onBack,
  progress,
  tone = 'navy',
  scroll = false,
  heroMedia,
  children,
}: OnboardingScreenShellProps) {
  const Content = scroll ? ScrollView : View;
  const insets = useSafeAreaInsets();

  const reveal = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    reveal.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) {
      reveal.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.current, reduceMotion]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 16 }, { scale: 0.985 + reveal.value * 0.015 }],
  }));

  return (
    <View style={styles.container}>
      {heroMedia && <OnboardingHeroMedia source={heroMedia} />}
      <SparkleBackground tone={tone} starCount={8} />

      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={[styles.backArrow, !!heroMedia && styles.backArrowOnMedia]}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backArrowSpacer} />
        )}
      </View>

      {progress && <ProgressBar current={progress.current} total={progress.total} />}

      <Animated.View style={[styles.flex, revealStyle]}>
        <Content
          style={scroll ? styles.scroll : [styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
          contentContainerStyle={scroll ? [styles.scrollContent, { paddingBottom: spacing.xl + insets.bottom }] : undefined}
        >
          {children}
        </Content>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  backArrowOnMedia: {
    color: colors.background,
  },
  backArrowSpacer: {
    height: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
});
