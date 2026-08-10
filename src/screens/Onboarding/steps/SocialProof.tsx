import { ScrollView, StyleSheet, Text } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SparkleBackground } from '../../../components/SparkleBackground';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { pickG, type StepComponentProps } from '../onboardingState';
import { TestimonialsBlock } from '../illustrations/TestimonialsBlock';

/** Last beat before the paywall — "you're not alone in this," removing hesitation right before the ask. */
export function SocialProof({ answers, onNext }: StepComponentProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SparkleBackground tone="accent" starCount={8} />
      <HighlightText
        text={'תפילוקט נבנתה\n**בשבילך**'}
        style={styles.title}
        emphasisStyle={styles.titleAccent}
      />
      <Text style={styles.subtitle}>למה בנינו את תפילוקט</Text>

      <TestimonialsBlock />

      <PrimaryButton
        label={`${pickG(answers.gender, 'הצטרף', 'הצטרפי')} לתפילוקט 🙏`}
        onPress={onNext}
        variant="accent"
        glow
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    ...typography.hero,
    fontSize: 26,
    textAlign: 'center',
  },
  titleAccent: {
    color: colors.accentDark,
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
