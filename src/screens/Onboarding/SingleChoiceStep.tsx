import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { HighlightText } from './HighlightText';
import type { StepComponentProps } from './onboardingState';
import type { SingleChoiceQuestion } from './questionBank';
import { OnboardingScreenShell } from './OnboardingScreenShell';
import { StaggerItem } from './StaggerItem';

interface SingleChoiceStepProps extends StepComponentProps {
  question: SingleChoiceQuestion;
}

/** Generic single-select question screen — driven entirely by a `SingleChoiceQuestion` config from questionBank.ts. */
export function SingleChoiceStep({ answers, update, onNext, onBack, progress, question }: SingleChoiceStepProps) {
  const selected = answers[question.key] as string | null;

  const handleSelect = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    update({ [question.key]: id } as never);
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      {question.eyebrow ? <Text style={styles.eyebrow}>{question.eyebrow}</Text> : null}
      <HighlightText text={question.title} style={styles.title} />
      {question.subtitle ? <Text style={styles.subtitle}>{question.subtitle}</Text> : null}

      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isSelected = option.id === selected;
          return (
            <StaggerItem key={option.id} index={index}>
              <Pressable
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => handleSelect(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            </StaggerItem>
          );
        })}
      </View>

      <PrimaryButton label="המשך" onPress={onNext} disabled={!selected} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  option: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  button: {
    marginTop: spacing.xl,
  },
});
