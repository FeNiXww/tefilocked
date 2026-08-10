import { useEffect, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface StaggerItemProps {
  index: number;
  children: ReactNode;
  staggerMs?: number;
  startDelayMs?: number;
}

/** Wraps one item in a list so it pops in a beat after the item before it — used for question-bank option lists so the choices feel like they're being presented, not just there. */
export function StaggerItem({ index, children, staggerMs = 70, startDelayMs = 120 }: StaggerItemProps) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = 0;
    progress.value = reduceMotion
      ? 1
      : withDelay(startDelayMs + index * staggerMs, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.4)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }, { scale: 0.94 + progress.value * 0.06 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
