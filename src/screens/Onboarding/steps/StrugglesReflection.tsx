import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, typography } from '../../../theme';
import { pickG, type Gender, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { FadeInLines } from '../FadeInLines';

function reflectionLines(gender: Gender | null): string[] {
  return [
    '**תודה** על הכנות.',
    'קשיים כאלה הם חלק מהדרך של אמונה בעולם לא פשוט.',
    'גם דוד המלך כתב על **מאבקים מתמשכים** בתהלים.',
    `${pickG(gender, 'אתה', 'את')} **לא לבד** בזה.`,
    `החדשות הטובות: **תפילה** היא בדיוק הדרך לגשת לחסד ולעזרה ש${pickG(gender, 'אתה צריך', 'את צריכה')}, יום אחר יום.`,
  ];
}

export function StrugglesReflection({ answers, onNext, onBack, progress }: StepComponentProps) {
  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <View style={styles.center}>
        <Text style={styles.eyebrow}>תודה על הכנות</Text>
        <FadeInLines lines={reflectionLines(answers.gender)} />
      </View>
      <PrimaryButton label="המשך" onPress={onNext} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xxl,
  },
});
