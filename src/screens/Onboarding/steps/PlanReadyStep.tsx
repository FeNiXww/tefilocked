import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
import { commitmentLevel, computePhoneTimeStats, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 148;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RING_DURATION_MS = 2400;
const REVEAL_DELAY_MS = RING_DURATION_MS + 350;

/**
 * The bridge between the commitment moment and the practical setup steps: a
 * brief "we're building this for you" beat that closes with a plan-ready
 * reveal, leading into FirstWeekStep's preview of the week ahead. Placed
 * after CommitmentStep specifically so the commitment level is already
 * answered and can be quoted back in the ring's own status messages — this
 * is the one moment the app visibly *does something* with everything
 * answered so far, rather than only asking more.
 */
export function PlanReadyStep({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const [revealed, setRevealed] = useState(reduceMotion);
  const ringProgress = useSharedValue(reduceMotion ? 1 : 0);

  const stats = computePhoneTimeStats(answers);
  const level = commitmentLevel(answers.commitment, answers.gender);
  const stages = [
    'בונים עבורך תוכנית אישית',
    'מעבדים את התשובות שלך',
    `מתאימים את זה לרמת המחויבות ${level.emoji}`,
    'כמעט מוכן…',
  ];

  useEffect(() => {
    if (reduceMotion) return;
    ringProgress.value = withTiming(1, { duration: RING_DURATION_MS, easing: Easing.inOut(Easing.cubic) });
    const stageTimers = stages.slice(1).map((_, i) =>
      setTimeout(() => setStageIndex(i + 1), ((i + 1) / stages.length) * RING_DURATION_MS)
    );
    const revealTimer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => {
      stageTimers.forEach(clearTimeout);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  const [percentDisplay, setPercentDisplay] = useState(reduceMotion ? 100 : 0);
  useAnimatedReaction(
    () => Math.round(ringProgress.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setPercentDisplay)(current);
    }
  );

  const buildingStyle = useAnimatedStyle(() => ({
    opacity: revealed ? 0 : 1,
  }));

  return (
    <OnboardingScreenShell
      onBack={onBack}
      progress={progress}
      world={revealed ? WORLD.planReady : WORLD.permissionSetup}
      richness="balanced"
    >
      <View style={styles.container}>
        {!revealed ? (
          <Animated.View style={[styles.buildingWrap, buildingStyle]}>
            <View style={styles.ringWrap}>
              <FocalLight size={SIZE + 60} tone="warm" peakOpacity={0.22} breathe revealDurationMs={900} style={styles.ringGlow} />
              <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.accentLight} strokeWidth={STROKE_WIDTH} fill="none" />
                <AnimatedCircle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={colors.accent}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={ringProps}
                  rotation={-90}
                  originX={SIZE / 2}
                  originY={SIZE / 2}
                />
              </Svg>
              <Text style={styles.percentText}>{percentDisplay}%</Text>
            </View>

            <Text style={styles.stageText}>{stages[stageIndex]}</Text>

            <View style={styles.dots}>
              {stages.map((_, i) => (
                <View key={i} style={[styles.dot, i <= stageIndex && styles.dotActive]} />
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(500)} style={styles.revealWrap}>
            <FocalLight size={260} tone="warm" peakOpacity={0.34} revealDurationMs={600} breathe style={styles.revealGlow} />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={28} color={colors.background} />
            </View>
            <Text style={styles.revealTitle}>
              {answers.name ? `התוכנית שלך מוכנה, ${answers.name}` : 'התוכנית האישית שלך מוכנה'}
            </Text>
            <Text style={styles.revealBody}>
              {`בהתבסס על מה שסיפרת לנו — תוכנית שתעזור לך להחזיר את ${stats.lifetimeYears} השנים האלה, צעד אחד ביום.`}
            </Text>
            <PrimaryButton label="לצפייה בשבוע הראשון" onPress={onNext} variant="accent" glow style={styles.button} />
          </Animated.View>
        )}
      </View>
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 420,
    },
    buildingWrap: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    ringWrap: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringGlow: {
      position: 'absolute',
    },
    percentText: {
      ...typography.hero,
      fontSize: 34,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    stageText: {
      ...typography.heading,
      fontSize: 17,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingHorizontal: spacing.xl,
      minHeight: 24,
    },
    dots: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primaryLight,
    },
    dotActive: {
      backgroundColor: colors.accent,
    },
    revealWrap: {
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    revealGlow: {
      position: 'absolute',
      top: -40,
    },
    checkBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    revealTitle: {
      ...typography.hero,
      fontSize: 24,
      textAlign: 'center',
    },
    revealBody: {
      ...typography.bodySecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    button: {
      alignSelf: 'stretch',
      marginTop: spacing.lg,
    },
  });
}
