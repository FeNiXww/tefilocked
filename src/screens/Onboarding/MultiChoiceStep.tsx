import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { HighlightText } from './HighlightText';
import type { StepComponentProps } from './onboardingState';
import type { MultiChoiceQuestion } from './questionBank';
import { OnboardingScreenShell } from './OnboardingScreenShell';
import { StaggerItem } from './StaggerItem';

interface MultiChoiceStepProps extends StepComponentProps {
  question: MultiChoiceQuestion;
}

/** Generic multi-select question screen (optionally capped at `maxSelect`) — driven by a `MultiChoiceQuestion` config from questionBank.ts. */
export function MultiChoiceStep({ answers, update, onNext, onBack, progress, question }: MultiChoiceStepProps) {
  const selected = (answers[question.key] as string[] | undefined) ?? [];

  const toggle = (id: string) => {
    const isSelected = selected.includes(id);
    if (!isSelected && question.maxSelect && selected.length >= question.maxSelect) return;
    Haptics.selectionAsync().catch(() => {});
    const next = isSelected ? selected.filter((existing) => existing !== id) : [...selected, id];
    update({ [question.key]: next } as never);
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <HighlightText text={question.title} style={styles.title} />
      <Text style={styles.subtitle}>{question.subtitle}</Text>

      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <StaggerItem key={option.id} index={index}>
              <Pressable
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => toggle(option.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✡</Text>}
                </View>
              </Pressable>
            </StaggerItem>
          );
        })}
      </View>

      <PrimaryButton label="המשך" onPress={onNext} disabled={selected.length === 0} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.hero,
    fontSize: 22,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    marginTop: spacing.xl,
  },
});
