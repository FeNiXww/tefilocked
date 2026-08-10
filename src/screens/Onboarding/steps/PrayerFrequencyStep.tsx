import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, spacing, typography } from '../../../theme';
import { pickG, type StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

export function PrayerFrequencyStep({ answers, update, onNext, onBack, progress }: StepComponentProps) {
  const [value, setValue] = useState(answers.prayerDaysPerWeek);

  const handleContinue = () => {
    update({ prayerDaysPerWeek: value });
    onNext();
  };

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress}>
      <Text style={styles.title}>
        בכנות, כמה פעמים בשבוע {pickG(answers.gender, 'אתה מתפלל', 'את מתפללת')}?
      </Text>

      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>ימים</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={7}
        step={1}
        value={value}
        onValueChange={setValue}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surfacePressed}
        thumbTintColor={colors.primary}
      />
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>7</Text>
        <Text style={styles.rangeLabel}>0</Text>
      </View>

      <PrimaryButton label="המשך" onPress={handleContinue} style={styles.button} />
    </OnboardingScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.hero,
    fontSize: 24,
    textAlign: 'right',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  valueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  value: {
    ...typography.hero,
    fontSize: 56,
    color: colors.primary,
  },
  unit: {
    ...typography.body,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: spacing.xl,
  },
  rangeLabels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  rangeLabel: {
    ...typography.caption,
  },
  button: {
    marginTop: spacing.xxl,
  },
});
