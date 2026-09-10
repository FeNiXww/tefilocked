import { useEffect, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { spacing, useTheme, type ThemeColors } from '../../theme';
import { OnboardingAtmosphere } from './motion/OnboardingAtmosphere';
import { WORLD, type OnboardingRichness } from './motion/tokens';
import { OnboardingProgress } from './motion/OnboardingProgress';

interface OnboardingScreenShellProps {
  onBack?: () => void;
  progress?: { current: number; total: number };
  /** Position along the cold-digital → warm-spiritual throughline (motion/tokens.ts WORLD). Pass a shared value for a scene whose world shifts mid-beat. */
  world?: number | SharedValue<number>;
  /** How visually "full" the scene's atmosphere should be — gives the flow rhythm instead of every screen looking identical. */
  richness?: OnboardingRichness;
  particles?: boolean;
  vignette?: boolean;
  scroll?: boolean;
  children: ReactNode;
}

/**
 * Shared chrome for every onboarding step: background, optional back arrow,
 * optional question-bank progress bar, and a content area.
 *
 * The content settles in with a soft rise-and-fade every time the step
 * changes — keyed on `progress.current` rather than mount, since several
 * steps in a row reuse the same component (AutoAdvanceChoiceStep) with
 * different props, and React won't remount a same-typed component just
 * because its props changed.
 */
export function OnboardingScreenShell({
  onBack,
  progress,
  world = WORLD.name,
  richness = 'balanced',
  particles = false,
  vignette = false,
  scroll = true,
  children,
}: OnboardingScreenShellProps) {
  const Content = scroll ? ScrollView : View;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
      <OnboardingAtmosphere world={world} richness={richness} particles={particles} vignette={vignette} />

      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backArrowSpacer} />
        )}
      </View>

      {progress && <OnboardingProgress current={progress.current} total={progress.total} />}

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
}
