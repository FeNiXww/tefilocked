import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { WORLD } from '../motion/tokens';
import { commitmentLevel, pickG, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';

interface JourneyDay {
  day: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// Kept short on purpose — a phrase to glance at, not a sentence to read.
// The row's icon + color carry most of the feeling; the text is a caption.
const JOURNEY: JourneyDay[] = [
  { day: 1, icon: 'lock-closed', label: 'הרגע הראשון שלך' },
  { day: 2, icon: 'hand-left', label: 'מתגברים על הפיתוי' },
  { day: 3, icon: 'flame', label: 'ההרגל נקבע' },
  { day: 4, icon: 'heart', label: 'מרגישים שינוי' },
  { day: 5, icon: 'book', label: 'מבט לאחור, בגאווה' },
  { day: 6, icon: 'trending-up', label: 'הביטחון גדל' },
  { day: 7, icon: 'ribbon', label: 'שבוע שלם מאחוריך 🎉' },
];

// One row every ROW_STAGGER_MS — fast enough that all 7 land well under two
// seconds, so this reads as a quick cinematic trailer, not a list the user
// has to sit through.
const ROW_STAGGER_MS = 170;
const ROWS_DONE_MS = JOURNEY.length * ROW_STAGGER_MS + 420;
const TAGLINE_DELAY_MS = ROWS_DONE_MS + 150;
const THESIS_DELAY_MS = TAGLINE_DELAY_MS + 550;
const CTA_DELAY_MS = THESIS_DELAY_MS + 600;

function JourneyRow({ item, index }: { item: JourneyDay; index: number }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      index * ROW_STAGGER_MS,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.3)) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }, { scale: 0.94 + progress.value * 0.06 }],
  }));

  // The last day is the payoff of the whole preview — a full-color card and
  // icon make it read as the "arrival" at a glance, no extra text needed.
  const isFinalDay = index === JOURNEY.length - 1;

  return (
    <Animated.View style={[styles.row, isFinalDay && styles.rowFinal, rowStyle]}>
      <View style={[styles.iconWrap, isFinalDay && styles.iconWrapFinal]}>
        {/* Non-final rows sit on `iconWrap`'s fixed-light `accentLight` fill
            (see colors.ts), so they're fixed to match — `colors.accentDark`
            would turn light pastel-blue in dark mode against it. The final
            row's icon sits on `iconWrapFinal` (theme-reactive `accentDark`
            background) and stays theme-reactive to match. */}
        <Ionicons name={item.icon} size={15} color={isFinalDay ? colors.background : lightColors.accentDark} />
      </View>
      <Text style={[styles.rowLabel, isFinalDay && styles.rowLabelFinal]}>{item.label}</Text>
      <View style={[styles.dayBadge, isFinalDay && styles.dayBadgeFinal]}>
        <Text style={[styles.dayBadgeText, isFinalDay && styles.dayBadgeTextFinal]}>{item.day}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * The onboarding's "here's what's ahead" beat — a fast, auto-playing preview
 * of the week ahead (original beats, not a translation of any reference
 * app's day-by-day copy) instead of a long scrollable list: every row lands
 * within ~1.5s, then the tagline and CTA settle in right after. Placed after
 * CommitmentStep and PlanReadyStep specifically so the commitment level it
 * quotes back is always answered by the time this renders.
 */
export function FirstWeekStep({ answers, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const level = commitmentLevel(answers.commitment, answers.gender);
  const taglineOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const thesisOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const ctaOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    taglineOpacity.value = withDelay(TAGLINE_DELAY_MS, withTiming(1, { duration: 400 }));
    thesisOpacity.value = withDelay(THESIS_DELAY_MS, withTiming(1, { duration: 500 }));
    ctaOpacity.value = withDelay(CTA_DELAY_MS, withTiming(1, { duration: 400 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const thesisStyle = useAnimatedStyle(() => ({ opacity: thesisOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} world={WORLD.planReady} richness="balanced">
      <View style={styles.container}>
        <Text style={styles.title}>
          {answers.name ? `ככה נראה השבוע הראשון שלך, ${answers.name}` : 'ככה נראה השבוע הראשון שלך'}
        </Text>

        <View style={styles.list}>
          {JOURNEY.map((item, index) => (
            <JourneyRow key={item.day} item={item} index={index} />
          ))}
        </View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          {answers.commitment
            ? `${level.emoji} ${pickG(answers.gender, 'סימנת שאתה', 'סימנת שאת')} ${level.label} — בדיוק מה שצריך כדי שזה באמת יקרה.`
            : 'כל יום, עוד רגע קטן שקט — עד שהוא הופך להרגל.'}
        </Animated.Text>

        <Animated.Text style={[styles.thesis, thesisStyle]}>
          תפילוק לא מבקש ממך פחות מהטלפון.{'\n'}הוא עוזר לך לבחור מה חשוב יותר.
        </Animated.Text>

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <PrimaryButton label="המשך" onPress={onNext} variant="accent" style={styles.button} />
        </Animated.View>
      </View>
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.hero,
    fontSize: 19,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  list: {
    alignSelf: 'stretch',
    gap: 7,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm + 2,
  },
  rowFinal: {
    backgroundColor: colors.accent,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFinal: {
    backgroundColor: colors.accentDark,
  },
  rowLabel: {
    ...typography.bodySecondary,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  rowLabelFinal: {
    color: colors.background,
    fontWeight: '700',
  },
  dayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  dayBadgeFinal: {
    backgroundColor: colors.background,
  },
  // `dayBadge`'s `accentLight` fill is a fixed light tone in both themes
  // (see colors.ts), so this text is fixed to match — `colors.accentDark`
  // would turn light pastel-blue in dark mode against it.
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: lightColors.accentDark,
  },
  dayBadgeTextFinal: {
    color: colors.accent,
  },
  tagline: {
    ...typography.heading,
    fontSize: 14,
    textAlign: 'center',
    color: colors.accentDark,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  // The flow's emotional thesis — deliberately the largest, boldest text on
  // this screen (bigger than `tagline` above it) so it reads as the point
  // of the whole preview, not one more caption.
  thesis: {
    ...typography.hero,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  ctaWrap: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
  button: {
    alignSelf: 'stretch',
  },
  });
}
