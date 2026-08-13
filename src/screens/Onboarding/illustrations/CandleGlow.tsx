import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

// Warm candlelight gold — deliberately outside the navy/blue brand palette
// (theme has no gold token) and distinct from chartConnection, which is
// reserved for chart data so it keeps reading as "data" everywhere else.
const GLOW = '#F3C77A';
const FLAME_OUTER = '#E3A23D';
const FLAME_CORE = '#FFE8B8';

const SIZE = 168;

/**
 * A single peaceful flame with a soft breathing glow — the "light slowly
 * growing brighter" beat for StrugglesReflection. No candle body by design:
 * an abstract flame reads as calm/eternal-light rather than a literal,
 * cartoonish object.
 */
export function CandleGlow() {
  const glowPulse = useSharedValue(0);
  const flicker = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + glowPulse.value * 0.35,
    transform: [{ scale: 1 + glowPulse.value * 0.08 }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${flicker.value * 2.2}deg` },
      { scaleY: 1 + Math.abs(flicker.value) * 0.02 },
      { scaleX: 1 - Math.abs(flicker.value) * 0.03 },
    ],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.glow, glowStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="52%" r="50%">
              <Stop offset="0%" stopColor={GLOW} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={GLOW} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={SIZE / 2} cy={SIZE * 0.52} rx={SIZE / 2} ry={SIZE / 2} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={flameStyle}>
        <Svg width={64} height={92} viewBox="0 0 64 92">
          <Defs>
            <RadialGradient id="core" cx="50%" cy="62%" r="55%">
              <Stop offset="0%" stopColor={FLAME_CORE} />
              <Stop offset="100%" stopColor={FLAME_OUTER} />
            </RadialGradient>
          </Defs>
          <Path
            d="M32 4 C16 32 12 50 22 68 C26 78 38 78 42 68 C52 50 48 32 32 4 Z"
            fill="url(#core)"
          />
          <Path
            d="M32 26 C24 42 22 54 29 66 C31 71 33 71 35 66 C42 54 40 42 32 26 Z"
            fill={FLAME_CORE}
            opacity={0.85}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
