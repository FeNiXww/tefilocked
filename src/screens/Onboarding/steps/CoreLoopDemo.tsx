import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { MagenDavidStreak } from '../../../components/MagenDavidStreak';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { pickContentForMood, previewLine } from '../../../content/index';
import { ALL_CONTENT_TYPES } from '../../../content/types';
import type { ContentItem, Mood } from '../../../content/types';
import { getCurrentStreak, recordUnlockEvent } from '../../../data/storage/db';
import { HighlightText } from '../HighlightText';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { OnboardingAtmosphere } from '../motion/OnboardingAtmosphere';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
import { pickG, type StepComponentProps } from '../onboardingState';
import { ConnectionCheckIn } from '../../LockContentFlow/ConnectionCheckIn';
import { ContentDisplay } from '../../LockContentFlow/ContentDisplay';
import { MoodPicker } from '../../LockContentFlow/MoodPicker';

type DemoStep = 'stop' | 'intro' | 'connection' | 'mood' | 'content' | 'streakReveal';

// Real prayer/mood/content screens shown mid-demo (`connection`/`mood`/
// `content`) are the app's actual daily-flow components, reused verbatim —
// their own chrome should read as calm and focused, not tinted by the
// onboarding world progression, so only the bookend beats (intro, reveal)
// get a world value here.
const STEP_WORLD: Record<DemoStep, number> = {
  stop: 0.15,
  intro: WORLD.coreLoopDemo,
  connection: WORLD.coreLoopDemo,
  mood: WORLD.coreLoopDemo,
  content: WORLD.coreLoopDemo,
  streakReveal: WORLD.coreLoopStreak,
};

// A single quiet beat before the demo begins — the moment this whole product
// is built around, compressed into one line. Everything else on screen holds
// still for it; there's no button here, it just passes.
const STOP_HOLD_MS = 1300;

// How long the star sits dark (with its focal light already building) before
// actually lighting — without this pause, MagenDavidStreak mounts already
// `litToday`, so its own built-in ignition "pop" (see MagenDavidStreak.tsx)
// never gets a false->true edge to animate from, and the star just appears
// lit with no ignition moment at all.
const IGNITION_DELAY_MS = 450;

/**
 * The onboarding "climax": the user actually does the core loop (check in,
 * pick a mood, read real curated content) instead of watching a mock of it.
 * Reuses the exact same components the daily lock-intercept flow uses, then
 * closes with a first-streak reveal — the emotional payoff for having just
 * completed a real prayer, before moving on to the commitment moment.
 */
export function CoreLoopDemo({ answers, onNext }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<DemoStep>(reduceMotion ? 'intro' : 'stop');
  const [content, setContent] = useState<ContentItem | null>(null);
  const [starLit, setStarLit] = useState(false);
  const [streak, setStreak] = useState(0);
  const connectionRatingRef = useRef<number | null>(null);
  const moodRef = useRef<Mood | null>(null);
  // This is a real prayer, not a preview of one — recordUnlockEvent below
  // writes it to the same table the daily lock-intercept flow does (see
  // LockContentFlow/useLockContentFlow.ts), so the streak this scene shows
  // is the exact one Home shows straight after onboarding, instead of the
  // user finishing a "streak of 1" here and landing on a genuine 0.
  const recordedRef = useRef(false);

  const handleConnection = (rating: number) => {
    connectionRatingRef.current = rating;
    setStep('mood');
  };

  const handleMood = (mood: Mood) => {
    moodRef.current = mood;
    setContent(pickContentForMood(mood, ALL_CONTENT_TYPES));
    setStep('content');
  };

  const finishPrayer = () => {
    if (!recordedRef.current && content && moodRef.current && connectionRatingRef.current != null) {
      recordedRef.current = true;
      recordUnlockEvent({
        occurredAt: new Date(),
        mood: moodRef.current,
        connectionRating: connectionRatingRef.current,
        contentId: content.id,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      setStreak(getCurrentStreak());
    }
    setStep('streakReveal');
  };

  useEffect(() => {
    if (step !== 'stop' || reduceMotion) return;
    const timer = setTimeout(() => setStep('intro'), STOP_HOLD_MS);
    return () => clearTimeout(timer);
  }, [step, reduceMotion]);

  useEffect(() => {
    if (step !== 'streakReveal') return;
    const timer = setTimeout(() => setStarLit(true), IGNITION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <View style={styles.container}>
      <OnboardingAtmosphere
        world={STEP_WORLD[step]}
        richness={step === 'stop' ? 'quiet' : step === 'streakReveal' ? 'rich' : 'balanced'}
        particles={step === 'streakReveal'}
      />

      {step === 'stop' && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(400)}
          exiting={reduceMotion ? undefined : FadeOut.duration(400)}
          style={styles.stopContent}
        >
          <Text style={styles.stopWord}>השינוי מתחיל פה.</Text>
        </Animated.View>
      )}

      {step === 'intro' && (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(500)} style={styles.introContent}>
          <Text style={styles.eyebrow}>עכשיו בתורך</Text>
          <Text style={styles.title}>{pickG(answers.gender, 'בוא', 'בואי')} נתרגל את זה יחד</Text>
          <Text style={styles.body}>
            {'ככה זה עובד כל יום: צ׳ק אין קצר, בחירת מצב רוח, ותוכן שנבחר בשבילך.'}
          </Text>
          <PrimaryButton label="בואו נתחיל" onPress={() => setStep('connection')} style={styles.button} />
        </Animated.View>
      )}

      {step === 'connection' && <ConnectionCheckIn onSubmit={handleConnection} />}

      {step === 'mood' && <MoodPicker onSelect={handleMood} gender={answers.gender} />}

      {step === 'content' && content && (
        <ContentDisplay content={content} onContinue={finishPrayer} continuing={false} />
      )}
      {step === 'content' && !content && (
        <View style={styles.introContent}>
          <Text style={styles.body}>{pickG(answers.gender, 'קח', 'קחי')} רגע לנשום עמוק לפני שממשיכים.</Text>
          <PrimaryButton label="המשך" onPress={finishPrayer} style={styles.button} />
        </View>
      )}

      {step === 'streakReveal' && (
        <View style={styles.introContent}>
          <HighlightText text="**יישר כוח!**" style={styles.streakTitle} emphasisStyle={styles.streakTitleEmphasis} />
          <Text style={styles.body}>השלמת את התפילה הראשונה שלך</Text>
          <View style={styles.starWrap}>
            <FocalLight size={220} tone="ember" peakOpacity={starLit ? 0 : 0.22} revealDurationMs={300} style={styles.starGlow} />
            <MagenDavidStreak streak={streak} litToday={starLit} size={140} />
          </View>
          <Text style={styles.eyebrow}>{`יום ${Math.max(streak, 1)} ברצף`}</Text>
          {content && (
            <View style={styles.card}>
              <Text style={styles.cardText} numberOfLines={3}>
                {previewLine(content)}
              </Text>
              <Text style={styles.cardSource}>{content.source}</Text>
            </View>
          )}
          <PrimaryButton label="המשך" onPress={onNext} variant="accent" style={styles.button} />
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  introContent: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  stopContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stopWord: {
    ...typography.hero,
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'center',
  },
  body: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  streakTitle: {
    ...typography.hero,
    fontSize: 28,
    color: colors.accentDark,
  },
  streakTitleEmphasis: {
    color: colors.primary,
  },
  starWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  starGlow: {
    position: 'absolute',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  cardText: {
    ...typography.body,
    textAlign: 'right',
  },
  cardSource: {
    ...typography.caption,
    textAlign: 'right',
  },
  });
}
