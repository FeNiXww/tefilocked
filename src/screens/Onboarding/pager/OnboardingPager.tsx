import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
  type SharedValue,
} from 'react-native-reanimated';
import { spacing, useTheme, type ThemeColors } from '../../../theme';

export interface PagerPageProps {
  index: number;
  /** Raw horizontal scroll offset in px — the single source of truth every page's motion is derived from. */
  scrollX: SharedValue<number>;
  pageWidth: number;
  /** Advance past the pager entirely (e.g. into the next onboarding step). Only the last page typically calls this. */
  onComplete: () => void;
  /** Advances to the next page in the pager, or calls `onComplete` if this is the last one — every page's continue button can wire to this the same way. */
  onNext: () => void;
}

interface OnboardingPagerProps {
  pages: Array<(props: PagerPageProps) => ReactNode>;
  onComplete: () => void;
}

const DOT_SIZE = 8;
const DOT_MAX_WIDTH = 26;

/**
 * The shared architecture behind the onboarding's swipeable intro beats.
 * Tracks scroll as a Reanimated `SharedValue` (via `useScrollViewOffset`,
 * not a `FlatList`/`onScroll` JS-thread listener) so every page's parallax
 * and the pill pagination indicator both stay glued to the user's finger,
 * rather than reacting after the fact to a settled page index.
 */
export function OnboardingPager({ pages, onComplete }: OnboardingPagerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useScrollViewOffset(scrollRef);
  const [pageIndex, setPageIndex] = useState(0);

  const goToPage = (targetIndex: number) => {
    scrollRef.current?.scrollTo({ x: targetIndex * width, animated: true });
    setPageIndex(targetIndex);
  };

  // Mirrors OnboardingFlow's own hardwareBackPress handling (see index.tsx):
  // this pager renders as onboarding's first step, so Android's back button
  // would otherwise exit the app instead of returning to the previous page
  // once the user has swiped forward.
  useEffect(() => {
    if (pageIndex === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goToPage(pageIndex - 1);
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setPageIndex(index);
        }}
      >
        {pages.map((renderPage, index) => (
          <View key={index} style={{ width }}>
            {renderPage({
              index,
              scrollX,
              pageWidth: width,
              onComplete,
              onNext: () => (index < pages.length - 1 ? goToPage(index + 1) : onComplete()),
            })}
          </View>
        ))}
      </Animated.ScrollView>

      <View style={[styles.dots, { top: insets.top + spacing.md }]} pointerEvents="none">
        {pages.map((_, index) => (
          <PagerDot key={index} index={index} scrollX={scrollX} pageWidth={width} />
        ))}
      </View>
    </View>
  );
}

/** One pill of the pagination indicator — its own width/opacity are a pure interpolation of `scrollX`, so it stretches into the next dot mid-drag instead of snapping on release. */
function PagerDot({
  index,
  scrollX,
  pageWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const style = useAnimatedStyle(() => {
    const progress = pageWidth > 0 ? scrollX.value / pageWidth : 0;
    const width = interpolate(
      progress,
      [index - 1, index, index + 1],
      [DOT_SIZE, DOT_MAX_WIDTH, DOT_SIZE],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      progress,
      [index - 1, index, index + 1],
      [0.35, 1, 0.35],
      Extrapolation.CLAMP
    );
    return { width, opacity };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 10,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  });
}
