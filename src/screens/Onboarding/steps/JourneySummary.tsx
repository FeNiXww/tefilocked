import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, spacing, typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { pickG, type StepComponentProps } from '../onboardingState';
import { getOptionLabels } from '../questionBank';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

function Card({ eyebrow, children }: { eyebrow: string; children: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{eyebrow}</Text>
      <Text style={styles.cardBody}>{children}</Text>
    </View>
  );
}

/** Mirrors the user's own goals/current-state/obstacles answers back to them — the reference's "thanks, let's look at your journey together" beat. */
export function JourneySummary({ answers, onNext, onBack, progress }: StepComponentProps) {
  const gender = answers.gender;
  const optionLabels = getOptionLabels(gender);
  const topGoal = answers.goals[0] ? optionLabels.goals[answers.goals[0]] : 'לבנות חיבור עמוק יותר עם הקדוש ברוך הוא';
  const currentState = answers.relationshipStatus
    ? optionLabels.relationshipStatus[answers.relationshipStatus]
    : 'יש לזה עליות וירידות';
  const obstacleLabels = answers.obstacles.map((id) => optionLabels.obstacles[id]).filter(Boolean);

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <HighlightText
        text={answers.name ? `תודה, **${answers.name}**.` : '**תודה**.'}
        style={styles.title}
      />
      <Text style={styles.subtitle}>לפי מה ששיתפת, {pickG(gender, 'בוא', 'בואי')} נסתכל יחד על המסע שלך.</Text>

      <Card eyebrow={`לאן ${pickG(gender, 'אתה', 'את')} רוצה להגיע`}>{topGoal}</Card>
      <Card eyebrow={`איפה ${pickG(gender, 'אתה נמצא', 'את נמצאת')} עכשיו`}>{currentState}</Card>
      {obstacleLabels.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>מה עומד בדרך</Text>
          {obstacleLabels.map((label) => (
            <Text key={label} style={styles.cardBullet}>
              {'•  '}
              {label}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.closing}>
        {answers.name ? `${answers.name}, ` : ''}
        {`אנחנו רואים איפה ${pickG(gender, 'אתה נמצא', 'את נמצאת')} ולאן ${pickG(gender, 'אתה שואף', 'את שואפת')} להגיע. יחד, נבנה תוכנית אישית שתחזק את אמונתך.`}
      </Text>

      <PrimaryButton label="המשך" onPress={onNext} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardEyebrow: {
    ...typography.eyebrow,
    textAlign: 'right',
  },
  cardBody: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'right',
  },
  cardBullet: {
    ...typography.body,
    textAlign: 'right',
  },
  closing: {
    ...typography.bodySecondary,
    textAlign: 'right',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.xl,
  },
});
