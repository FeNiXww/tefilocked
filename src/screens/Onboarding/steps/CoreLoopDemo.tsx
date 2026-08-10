import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { pickContentForMood } from '../../../content/index';
import { ALL_CONTENT_TYPES } from '../../../content/types';
import type { ContentItem, Mood } from '../../../content/types';
import { colors, spacing, typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';
import { ConnectionCheckIn } from '../../LockContentFlow/ConnectionCheckIn';
import { ContentDisplay } from '../../LockContentFlow/ContentDisplay';
import { MoodPicker } from '../../LockContentFlow/MoodPicker';

type DemoStep = 'intro' | 'connection' | 'mood' | 'content';

/**
 * The onboarding "climax": the user actually does the core loop (check in,
 * pick a mood, read real curated content) instead of watching a mock of it.
 * Reuses the exact same components the daily lock-intercept flow uses.
 */
export function CoreLoopDemo({ answers, update, onNext }: StepComponentProps) {
  const [step, setStep] = useState<DemoStep>('intro');
  const [content, setContent] = useState<ContentItem | null>(null);

  const handleConnection = (rating: number) => {
    update({ demoConnection: rating });
    setStep('mood');
  };

  const handleMood = (mood: Mood) => {
    const picked = pickContentForMood(mood, ALL_CONTENT_TYPES);
    update({
      demoMood: mood,
      demoContentText: picked?.hebrewText ?? null,
      demoContentSource: picked?.source ?? null,
    });
    setContent(picked);
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

      {step === 'content' && content && <ContentDisplay content={content} onContinue={onNext} continuing={false} />}
      {step === 'content' && !content && (
        <View style={styles.introContent}>
          <Text style={styles.body}>{pickG(answers.gender, 'קח', 'קחי')} רגע לנשום עמוק לפני שממשיכים.</Text>
          <PrimaryButton label="המשך" onPress={onNext} style={styles.button} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
});
