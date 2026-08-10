import { useEffect, useState } from 'react';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Normalized scroll progress for a given page: 0 when it's centered, -1 when
 * the previous page fills the screen, +1 when the next page does. Every
 * parallax effect on a pager screen is just an interpolation of this one
 * value, so motion stays perfectly attached to the user's finger while
 * dragging instead of triggering on a snap/index change.
 */
export function usePageProgress(scrollX: SharedValue<number>, index: number, pageWidth: number) {
  return useDerivedValue(() => (pageWidth > 0 ? scrollX.value / pageWidth - index : 0));
}

/**
 * True while a page is the one centered in the pager (within `threshold` of
 * a full page-width of center). Mirrors `usePageProgress` but surfaces as a
 * plain JS boolean, for effects that can't live inside a worklet — starting
 * a haptics sequence, kicking off a looping choreography, etc.
 */
export function usePageActive(
  scrollX: SharedValue<number>,
  index: number,
  pageWidth: number,
  threshold = 0.5
) {
  const [isActive, setIsActive] = useState(index === 0);

  useAnimatedReaction(
    () => (pageWidth > 0 ? Math.abs(scrollX.value / pageWidth - index) < threshold : false),
    (active, previous) => {
      if (active !== previous) {
        runOnJS(setIsActive)(active);
      }
    },
    [index, pageWidth]
  );

  return isActive;
}

/** Slow, endless "alive" breathing scale (1 → 1.02 → 1) — runs only while `isActive`. */
export function useBreathingScale(isActive: boolean) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isActive || reducedMotion) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 250 });
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    return () => cancelAnimation(scale);
  }, [isActive, reducedMotion, scale]);

  return scale;
}
