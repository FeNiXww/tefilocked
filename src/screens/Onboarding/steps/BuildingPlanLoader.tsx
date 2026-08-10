import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { colors, spacing, typography } from '../../../theme';
import type { StepComponentProps } from '../onboardingState';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 160;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION = 2200;

const STAGES = ['אוספים את התשובות שלך...', 'מתאימים תפילות ופסוקים בשבילך...', 'בונים את המסגרת הרוחנית שלך...'];

/** Fake-progress transition into the conclusion section — nothing is actually processed, but the ritual of "building your plan" signals the summary that follows is personalized. Auto-advances when the ring completes. */
export function BuildingPlanLoader({ onNext }: StepComponentProps) {
  const progress = useSharedValue(0);
  const [percent, setPercent] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onNext)();
    });
    const stageTimer = setInterval(
      () => setStageIndex((i) => Math.min(i + 1, STAGES.length - 1)),
      DURATION / STAGES.length
    );
    return () => clearInterval(stageTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (value) => runOnJS(setPercent)(Math.round(value * 100))
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      <SparkleBackground tone="navy" starCount={6} />
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.surfacePressed} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            animatedProps={animatedProps}
            rotation={-90}
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        </Svg>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <Text style={styles.stage}>{STAGES[stageIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.background,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    ...typography.hero,
    position: 'absolute',
    fontSize: 32,
  },
  stage: {
    ...typography.body,
    textAlign: 'center',
  },
});
