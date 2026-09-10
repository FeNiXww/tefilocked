import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../../haptics';
import { PrimaryButton } from '../../components/PrimaryButton';
import { headlineFontFamily, lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { HighlightText } from './HighlightText';
import { WORLD } from './motion/tokens';
import type { StepComponentProps } from './onboardingState';
import type { SingleChoiceQuestion } from './questionBank';
import { OnboardingScreenShell } from './OnboardingScreenShell';
import { StaggerItem } from './StaggerItem';

interface AutoAdvanceChoiceStepProps extends StepComponentProps {
  question: SingleChoiceQuestion;
}

// A question-bank key isn't always present in WORLD (e.g. `name` reuses the
// shell's default) — only the keys this step actually renders need an entry.
const QUESTION_WORLD: Partial<Record<SingleChoiceQuestion['key'], number>> = {
  gender: WORLD.gender,
  ageRange: WORLD.age,
  phoneHoursRange: WORLD.phoneUsage,
};

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
    <OnboardingScreenShell onBack={onBack} progress={progress} world={QUESTION_WORLD[question.key] ?? WORLD.name}>
      {question.eyebrow ? <Text style={styles.eyebrow}>{question.eyebrow}</Text> : null}
      <HighlightText text={question.title} style={styles.title} />
      {question.subtitle ? <Text style={styles.subtitle}>{question.subtitle}</Text> : null}

      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isSelected = option.id === selected;
          return (
            <StaggerItem key={option.id} index={index}>
              <ChoiceOptionCard
                label={option.emoji ? `${option.emoji}  ${option.label}` : option.label}
                isSelected={isSelected}
                anySelected={selected !== null}
                onPress={() => handleSelect(option.id)}
                styles={styles}
              />
            </StaggerItem>
          );
        })}
      </View>

      <PrimaryButton label="המשך" onPress={onNext} disabled={!selected} style={styles.button} />
    </OnboardingScreenShell>
  );
}

/** A single choice card — the selected card stays at full clarity while its siblings quiet down, so the pick itself reads as a small, felt moment rather than just a border color flipping. */
function ChoiceOptionCard({
  label,
  isSelected,
  anySelected,
  onPress,
  styles,
}: {
  label: string;
  isSelected: boolean;
  anySelected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const reduceMotion = useReducedMotion();
  const quiet = useSharedValue(1);

  useEffect(() => {
    const target = anySelected && !isSelected ? 0.55 : 1;
    quiet.value = reduceMotion ? target : withTiming(target, { duration: 260, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anySelected, isSelected, reduceMotion]);

  const quietStyle = useAnimatedStyle(() => ({ opacity: quiet.value }));

  return (
    <Animated.View style={quietStyle}>
      <Pressable
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={label}
      >
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{label}</Text>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>{isSelected && <View style={styles.radioDot} />}</View>
      </Pressable>
    </Animated.View>
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
