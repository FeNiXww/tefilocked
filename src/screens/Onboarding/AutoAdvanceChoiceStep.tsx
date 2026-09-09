import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { PrimaryButton } from '../../components/PrimaryButton';
import { headlineFontFamily, lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { HighlightText } from './HighlightText';
import type { StepComponentProps } from './onboardingState';
import type { SingleChoiceQuestion } from './questionBank';
import { OnboardingScreenShell } from './OnboardingScreenShell';
import { StaggerItem } from './StaggerItem';

interface AutoAdvanceChoiceStepProps extends StepComponentProps {
  question: SingleChoiceQuestion;
}

/**
 * A single-choice question screen: tapping an option only selects it — the
 * "המשך" button (disabled until something's picked) is the one and only way
 * to advance. No auto-advance-on-tap, so there's never a chance a second tap
 * (re-picking, or changing your mind to another option) doubles as "continue"
 * and jumps a screen.
 */
export function AutoAdvanceChoiceStep({ answers, update, onNext, onBack, progress, question }: AutoAdvanceChoiceStepProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const selected = answers[question.key] as string | null;

  const handleSelect = (id: string) => {
    haptics.selection();
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
                  {option.emoji ? `${option.emoji}  ${option.label}` : option.label}
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

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    fontFamily: headlineFontFamily,
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
  // `accentLight` is a fixed light tone in both themes (see colors.ts), so
  // the selected label is fixed to match — `colors.primary` would hand dark
  // mode its light pastel-blue inversion (meant for text on a dark
  // background) against this always-light pill, which reads as low-contrast.
  optionLabelSelected: {
    color: lightColors.primary,
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
}
