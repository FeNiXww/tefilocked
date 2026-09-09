import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MagenDavidStreak } from '../../../components/MagenDavidStreak';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { pickContentForMood, previewLine } from '../../../content/index';
import { ALL_CONTENT_TYPES } from '../../../content/types';
import type { ContentItem, Mood } from '../../../content/types';
import { HighlightText } from '../HighlightText';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';
import { ConnectionCheckIn } from '../../LockContentFlow/ConnectionCheckIn';
import { ContentDisplay } from '../../LockContentFlow/ContentDisplay';
import { MoodPicker } from '../../LockContentFlow/MoodPicker';

type DemoStep = 'intro' | 'connection' | 'mood' | 'content' | 'streakReveal';

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
  const [step, setStep] = useState<DemoStep>('intro');
  const [content, setContent] = useState<ContentItem | null>(null);

  const handleConnection = (_rating: number) => {
    setStep('mood');
  };

  const handleMood = (mood: Mood) => {
    setContent(pickContentForMood(mood, ALL_CONTENT_TYPES));
    setStep('content');
  };

  return (
    <View style={styles.container}>
      <SparkleBackground tone="navy" starCount={6} />

      {step === 'intro' && (
        <View style={styles.introContent}>
          <Text style={styles.eyebrow}>עכשיו בתורך</Text>
          <Text style={styles.title}>{pickG(answers.gender, 'בוא', 'בואי')} נתרגל את זה יחד</Text>
          <Text style={styles.body}>
            {'ככה זה עובד כל יום: צ׳ק אין קצר, בחירת מצב רוח, ותוכן שנבחר בשבילך.'}
          </Text>
          <PrimaryButton label="בואו נתחיל" onPress={() => setStep('connection')} style={styles.button} />
        </View>
      )}

      {step === 'connection' && <ConnectionCheckIn onSubmit={handleConnection} />}

      {step === 'mood' && <MoodPicker onSelect={handleMood} gender={answers.gender} />}

      {step === 'content' && content && (
        <ContentDisplay content={content} onContinue={() => setStep('streakReveal')} continuing={false} />
      )}
      {step === 'content' && !content && (
        <View style={styles.introContent}>
          <Text style={styles.body}>{pickG(answers.gender, 'קח', 'קחי')} רגע לנשום עמוק לפני שממשיכים.</Text>
          <PrimaryButton label="המשך" onPress={() => setStep('streakReveal')} style={styles.button} />
        </View>
      )}

      {step === 'streakReveal' && (
        <View style={styles.introContent}>
          <HighlightText text="**יישר כוח!**" style={styles.streakTitle} emphasisStyle={styles.streakTitleEmphasis} />
          <Text style={styles.body}>השלמת את התפילה הראשונה שלך</Text>
          <View style={styles.starWrap}>
            <MagenDavidStreak streak={1} litToday size={140} />
          </View>
          <Text style={styles.eyebrow}>יום 1 ברצף</Text>
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
