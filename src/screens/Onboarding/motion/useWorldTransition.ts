import { useEffect } from 'react';
import { Easing, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/**
 * A shared value that eases from `from` to `to` after `delayMs` — for the
 * handful of scenes where the cold→warm shift itself is the point (Scene 5's
 * "hope/reframing" beat, the interruption moment, the commitment hold).
 * Pass the returned value straight into `OnboardingAtmosphere`'s `world` prop.
 */
export function useWorldTransition(from: number, to: number, { delayMs = 0, durationMs = 1400 } = {}) {
  const world = useSharedValue(from);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      world.value = to;
      return;
    }
    world.value = withDelay(delayMs, withTiming(to, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, delayMs, durationMs, reduceMotion]);

  return world;
}
