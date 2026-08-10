import { useEffect, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  formatter?: (n: number) => string;
}

/** Counts up to `value` on mount/change instead of appearing as a static number. */
export function AnimatedCounter({ value, duration = 900, style, formatter }: AnimatedCounterProps) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    progress.value = 0;
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduceMotion]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    }
  );

  return <Text style={style}>{formatter ? formatter(display) : String(Math.round(display))}</Text>;
}
