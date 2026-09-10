import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { LightTone } from './OnboardingLight';
import { useOnboardingPalette, type OnboardingRichness } from './tokens';

const DENSITY: Record<OnboardingRichness, number> = {
  quiet: 3,
  balanced: 5,
  rich: 8,
  dramatic: 6,
};

function Mote({ x, y, size, color, duration, delay, drift }: { x: number; y: number; size: number; color: string; duration: number; delay: number; drift: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: duration * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.08, { duration: duration * 0.6, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-drift, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mote,
        { left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface OnboardingParticlesProps {
  richness?: OnboardingRichness;
  tone?: LightTone;
}

/**
 * Extremely restrained floating dust/ember motes — a handful of slow, barely
 * visible points, not a particle system. Motion is deliberately slow enough
 * that most users only notice it subconsciously; density is capped by
 * `richness` so it stays cheap even at "rich".
 */
export const OnboardingParticles = memo(function OnboardingParticles({
  richness = 'balanced',
  tone = 'warm',
}: OnboardingParticlesProps) {
  const { width, height } = useWindowDimensions();
  const palette = useOnboardingPalette();
  const color = tone === 'cold' ? palette.coldGlow : tone === 'ember' ? palette.ember : palette.warmGlow;
  const count = DENSITY[richness];

  const motes = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        key: i,
        x: Math.random() * width,
        y: height * 0.15 + Math.random() * height * 0.7,
        size: 2 + Math.random() * 2.5,
        duration: 5000 + Math.random() * 4000,
        delay: Math.random() * 3000,
        drift: 30 + Math.random() * 50,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, width, height]
  );

  return (
    <>
      {motes.map((m) => (
        <Mote key={m.key} x={m.x} y={m.y} size={m.size} color={color} duration={m.duration} delay={m.delay} drift={m.drift} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  mote: {
    position: 'absolute',
  },
});
