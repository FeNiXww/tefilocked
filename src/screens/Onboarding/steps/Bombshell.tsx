import { useEffect, useState } from 'react';
import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
import { computePhoneTimeStats, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

type Phase = 'opening' | 'question' | 'revealHours' | 'revealYears';

const OPENING_HOLD_MS = 1500;
const QUESTION_HOLD_MS = 2100;

// The smaller, concrete figure ("1,095 hours this year") lands first and
// holds just long enough to register before the scene cross-fades into the
// bigger, more abstract lifetime figure — the small number makes the big one
// legible instead of the big one arriving cold.
const HOURS_DIGIT_STAGGER_MS = 90;
const HOURS_DIGIT_DURATION_MS = 500;
const HOURS_HOLD_MS = 1500;

// The hero number's own choreography, all timed relative to the moment the
// 'revealYears' phase starts, in strict reading order: the number itself
// assembles first, then its unit label ("שנים") settles in underneath it,
// then — only after a real pause — the closing line.
const DIGIT_STAGGER_MS = 150;
const DIGIT_DURATION_MS = 680;
// "7.5" is 3 glyphs — the last one starts at 2 * stagger and takes DURATION
// to settle; everything after the number is paced off when it's actually done.
const DIGITS_SETTLE_MS = 2 * DIGIT_STAGGER_MS + DIGIT_DURATION_MS;
const LABEL_DELAY_MS = DIGITS_SETTLE_MS + 200;
// A real pause once the number has landed — spec: "Then pause." — before the
// closing line, not a second line racing in right behind the first.
const CLOSING_LINE_DELAY_MS = DIGITS_SETTLE_MS + 1000;
const CLOSING_LINE_DURATION_MS = 750;
const DISCLAIMER_DELAY_MS = CLOSING_LINE_DELAY_MS + CLOSING_LINE_DURATION_MS + 350;
const CONTINUE_DELAY_MS = DISCLAIMER_DELAY_MS + 500;

const REVEAL_HOURS_START_MS = OPENING_HOLD_MS + QUESTION_HOLD_MS;
const REVEAL_YEARS_START_MS = REVEAL_HOURS_START_MS + HOURS_HOLD_MS;

/**
 * A single glyph of the hero number, materializing into focus rather than
 * counting up to it — starts slightly larger and unfocused-looking (low
 * opacity, oversized), settles to its resting size on a slow timing curve.
 * No spring/bounce: this is the scene's one moment of real gravity, and a
 * springy overshoot here would read as playful instead of weighty.
 */
function AssemblingGlyph({
  char,
  index,
  active,
  reduceMotion,
  style,
  staggerMs = DIGIT_STAGGER_MS,
  durationMs = DIGIT_DURATION_MS,
}: {
  char: string;
  index: number;
  active: boolean;
  reduceMotion: boolean;
  style: TextStyle;
  staggerMs?: number;
  durationMs?: number;
}) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 1.4);

  useEffect(() => {
    if (!active || reduceMotion) return;
    const delay = index * staggerMs;
    opacity.value = withDelay(delay, withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]} numberOfLines={1}>
      {char}
    </Animated.Text>
  );
}

/**
 * The realization beat — arguably the most important single moment in
 * onboarding. Four deliberate beats, each with room to breathe:
 *   1. "if nothing changes…" (existing opening line)
 *   2. "how much of our lives goes to the screen?" — the question, alone
 *   3. the number itself materializes glyph-by-glyph (not a counting
 *      animation — this is a fixed calculated fact, not something
 *      accumulating) while the focal light behind it builds
 *   4. a real pause, then the gut-punch closing line
 * No competing statistics, no bounce, no second sentence competing with the
 * first — restraint is the point here.
 */
export function Bombshell({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const stats = computePhoneTimeStats(answers);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduceMotion ? 'revealYears' : 'opening');
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setCanContinue(true);
      return;
    }
    const questionTimer = setTimeout(() => setPhase('question'), OPENING_HOLD_MS);
    const revealHoursTimer = setTimeout(() => setPhase('revealHours'), REVEAL_HOURS_START_MS);
    const revealYearsTimer = setTimeout(() => setPhase('revealYears'), REVEAL_YEARS_START_MS);
    const continueTimer = setTimeout(() => setCanContinue(true), REVEAL_YEARS_START_MS + CONTINUE_DELAY_MS);
    return () => {
      clearTimeout(questionTimer);
      clearTimeout(revealHoursTimer);
      clearTimeout(revealYearsTimer);
      clearTimeout(continueTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const hoursDigits = stats.hoursPerYear.toLocaleString('en-US').split('');
  const yearsDigits = stats.lifetimeYearsPrecise.toFixed(1).split('');
  const revealingYears = phase === 'revealYears';

  return (
    <OnboardingScreenShell
      onBack={onBack}
      progress={progress}
      world={phase === 'revealHours' || phase === 'revealYears' ? WORLD.bombshellReveal : WORLD.bombshellOpening}
      richness="quiet"
      vignette
    >
      <View style={styles.stage}>
        {phase === 'opening' && (
          <Animated.View exiting={reduceMotion ? undefined : FadeOut.duration(400)} style={styles.centeredWrap}>
            <HighlightText
              text={`${answers.name ? `${answers.name}, ` : ''}**אם שום דבר לא ישתנה**…`}
              style={styles.opening}
              staggerMs={90}
            />
          </Animated.View>
        )}

        {phase === 'question' && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(500)}
            exiting={reduceMotion ? undefined : FadeOut.duration(450)}
            style={styles.centeredWrap}
          >
            {/* Completes the opening line's "…" as one continuous thought —
                "if nothing changes… how much of your life will pass in
                front of the screen?" — rather than a fresh, unrelated
                question dropped in right after it. */}
            <HighlightText text="**כמה מהחיים שלך** יעברו מול המסך?" style={styles.question} staggerMs={90} />
          </Animated.View>
        )}

        {phase === 'revealHours' && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(400)}
            exiting={reduceMotion ? undefined : FadeOut.duration(400)}
            style={styles.centeredWrap}
          >
            <View style={styles.hoursWrap}>
              <View style={styles.hoursNumberRow}>
                {hoursDigits.map((char, i) => (
                  <AssemblingGlyph
                    key={i}
                    char={char}
                    index={i}
                    active={phase === 'revealHours'}
                    reduceMotion={reduceMotion}
                    style={styles.hoursNumber}
                    staggerMs={HOURS_DIGIT_STAGGER_MS}
                    durationMs={HOURS_DIGIT_DURATION_MS}
                  />
                ))}
              </View>
              <Animated.Text
                entering={reduceMotion ? undefined : FadeIn.delay(hoursDigits.length * HOURS_DIGIT_STAGGER_MS + 150).duration(400)}
                style={styles.hoursLabel}
              >
                שעות על הטלפון השנה
              </Animated.Text>
            </View>
          </Animated.View>
        )}

        {phase === 'revealYears' && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(400)} style={styles.revealWrap}>
            <Animated.Text
              entering={reduceMotion ? undefined : FadeIn.duration(400)}
              style={styles.lifetimeEyebrow}
            >
              לאורך החיים שלך, זה
            </Animated.Text>

            <View style={styles.numberWrap}>
              <FocalLight
                size={300}
                tone="ember"
                peakOpacity={0.3}
                revealDurationMs={DIGITS_SETTLE_MS + 250}
                breathe
                style={styles.glow}
              />
              <View style={styles.heroNumberRow}>
                {yearsDigits.map((char, i) => (
                  <AssemblingGlyph
                    key={i}
                    char={char}
                    index={i}
                    active={revealingYears}
                    reduceMotion={reduceMotion}
                    style={styles.heroNumber}
                  />
                ))}
              </View>
              <Animated.Text
                entering={reduceMotion ? undefined : FadeIn.delay(LABEL_DELAY_MS).duration(500)}
                style={styles.yearsLabel}
              >
                שנים
              </Animated.Text>
            </View>

            {/* Deliberately doesn't repeat "שנים" (years) — the label right
                above the number already says it; this line refers back to
                it rather than restating it. */}
            <HighlightText
              text="זמן **שאי אפשר להחזיר**."
              style={styles.closingLine}
              startDelayMs={CLOSING_LINE_DELAY_MS}
              staggerMs={110}
            />

            <Animated.Text
              entering={reduceMotion ? undefined : FadeIn.delay(DISCLAIMER_DELAY_MS).duration(500)}
              style={styles.disclaimer}
            >
              הערכה המבוססת על השימוש היומי שדיווחת עליו
            </Animated.Text>
          </Animated.View>
        )}
      </View>

      <PrimaryButton label="המשך" onPress={onNext} disabled={!canContinue} style={styles.button} />
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredWrap: {
    position: 'absolute',
    paddingHorizontal: spacing.lg,
  },
  opening: {
    ...typography.title,
    fontSize: 24,
    textAlign: 'center',
  },
  question: {
    ...typography.title,
    fontSize: 23,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  hoursWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  hoursNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  hoursNumber: {
    ...typography.hero,
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  hoursLabel: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  lifetimeEyebrow: {
    ...typography.bodySecondary,
    textAlign: 'center',
    color: colors.textMuted,
  },
  revealWrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  numberWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  glow: {
    position: 'absolute',
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  heroNumber: {
    ...typography.hero,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
  },
  yearsLabel: {
    ...typography.title,
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  closingLine: {
    ...typography.heading,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  button: {
    marginTop: spacing.xxl,
  },
  });
}
