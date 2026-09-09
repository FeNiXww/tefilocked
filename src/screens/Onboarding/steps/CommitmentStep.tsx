import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../../haptics';
import { FingerprintConfirmButton } from '../FingerprintConfirmButton';
import { headlineFontFamily, lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import type { StepComponentProps } from '../onboardingState';
import type { SingleChoiceQuestion } from '../questionBank';
import { OnboardingScreenShell } from '../OnboardingScreenShell';
import { StaggerItem } from '../StaggerItem';

interface CommitmentStepProps extends StepComponentProps {
  question: SingleChoiceQuestion;
}

// Short beat on the confirmed checkmark before auto-advancing — long enough to
// read as a deliberate confirmation, short enough that it never feels like a
// second "Continue" the user has to wait through.
const SUCCESS_HOLD_MS = 550;

/**
 * The commitment question, but the generic "המשך" continue button is replaced
 * with a press-and-hold fingerprint gesture: choosing a level only *selects*
 * it, holding the fingerprint circle is what actually *confirms* it (see
 * `commitmentConfirmed` in onboardingState.ts). This is a decorative, purely
 * in-app gesture — no OS biometric API or real fingerprint check is involved.
 */
export function CommitmentStep({ answers, update, onNext, onBack, progress, question }: CommitmentStepProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const selected = answers.commitment;
  const [confirmed, setConfirmed] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const handleSelect = (id: string) => {
    if (confirmed) return;
    haptics.selection();
    update({ commitment: id, commitmentConfirmed: false });
  };

  const handleConfirmed = () => {
    update({ commitmentConfirmed: true });
    setConfirmed(true);
    advanceTimer.current = setTimeout(onNext, SUCCESS_HOLD_MS);
  };

  return (
    <OnboardingScreenShell onBack={confirmed ? undefined : onBack} progress={progress}>
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
                disabled={confirmed}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            </StaggerItem>
          );
        })}
      </View>

      <FingerprintConfirmButton disabled={!selected} onConfirmed={handleConfirmed} />
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
  });
}
