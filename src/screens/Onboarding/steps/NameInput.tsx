import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import type { StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

export function NameInput({ answers, update, onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [name, setName] = useState(answers.name);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update({ name: trimmed });
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <Text style={styles.eyebrow}>קודם כל</Text>
      <Text style={styles.title}>איך לקרוא לך?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="השם שלך"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleContinue}
        textAlign="right"
      />
      <PrimaryButton label="המשך" onPress={handleContinue} disabled={!name.trim()} style={styles.button} />
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
      fontSize: 26,
      textAlign: 'right',
      marginBottom: spacing.xl,
    },
    input: {
      ...typography.body,
      fontSize: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    button: {
      marginTop: spacing.xl,
    },
  });
}
