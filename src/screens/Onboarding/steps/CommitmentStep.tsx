import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../../haptics';
import { HoldToCommitButton } from '../HoldToCommitButton';
import { headlineFontFamily, lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import { HighlightText } from '../HighlightText';
import { FocalLight } from '../motion/OnboardingLight';
import { WORLD } from '../motion/tokens';
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
 * with a press-and-hold gesture: choosing a level only *selects* it, holding
 * the circle is what actually *confirms* it (see `commitmentConfirmed` in
 * onboardingState.ts). This is a decorative, purely in-app gesture — no OS
 * biometric API is involved — and the scene's own light warms in step with
 * the hold, so the physical act of holding is what visibly transforms the
 * screen rather than a scripted animation running alongside it.
 */
export function CommitmentStep({ answers, update, onNext, onBack, progress, question }: CommitmentStepProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const selected = answers.commitment;
  const [confirmed, setConfirmed] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drives both the ring in HoldToCommitButton and, via `world` below, the
  // whole scene's ambient light — holding the gesture is what visibly warms
  // the atmosphere, not a scripted timer running alongside it.
  const holdProgress = useSharedValue(0);
  const world = useDerivedValue(
    () => WORLD.commitmentSelect + holdProgress.value * (WORLD.commitmentHold - WORLD.commitmentSelect)
  );

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
    <OnboardingScreenShell onBack={confirmed ? undefined : onBack} progress={progress} world={world} richness="balanced" vignette>
      {question.eyebrow ? <Text style={styles.eyebrow}>{question.eyebrow}</Text> : null}
      <HighlightText text={question.title} style={styles.title} />
      {question.subtitle ? <Text style={styles.subtitle}>{question.subtitle}</Text> : null}

      <View style={styles.options}>
        {question.options.map((option, index) => {
          const isSelected = option.id === selected;
          return (
            <StaggerItem key={option.id} index={index}>
              <CommitmentOptionCard
                label={option.label}
                isSelected={isSelected}
                anySelected={!!selected}
                disabled={confirmed}
                onPress={() => handleSelect(option.id)}
                styles={styles}
              />
            </StaggerItem>
          );
        })}
      </View>

      <View style={styles.holdWrap}>
        <FocalLight size={200} tone="ember" peakOpacity={0.4} reveal={holdProgress} style={styles.holdGlow} />
        <HoldToCommitButton disabled={!selected} onConfirmed={handleConfirmed} progress={holdProgress} />
      </View>
    </OnboardingScreenShell>
  );
}

/** Mirrors AutoAdvanceChoiceStep's ChoiceOptionCard: the selected level stays at full clarity while its siblings quiet down instead of the choice being conveyed by border color alone. */
function CommitmentOptionCard({
  label,
  isSelected,
  anySelected,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  isSelected: boolean;
  anySelected: boolean;
  disabled: boolean;
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
        disabled={disabled}
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
  holdWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdGlow: {
    position: 'absolute',
  },
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
