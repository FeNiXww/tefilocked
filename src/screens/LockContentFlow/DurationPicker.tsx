import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';

interface DurationOption {
  id: string;
  label: string;
  minutes: number;
}

const PRESETS: DurationOption[] = [
  { id: '15min', label: '15 דקות', minutes: 15 },
  { id: '30min', label: '30 דקות', minutes: 30 },
  { id: '1hour', label: 'שעה', minutes: 60 },
  { id: '3hours', label: '3 שעות', minutes: 180 },
  { id: '24hours', label: '24 שעות', minutes: 1440 },
  { id: 'custom', label: 'מותאם אישית', minutes: -1 },
];

interface DurationPickerProps {
  onSelect: (minutes: number) => void;
}

/** Lets the user choose how long the next unlock lasts before the apps lock again. */
export function DurationPicker({ onSelect }: DurationPickerProps) {
  const [selectedId, setSelectedId] = useState(PRESETS[0].id);
  const [customMinutes, setCustomMinutes] = useState(30);

  const handlePick = (option: DurationOption) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedId(option.id);
  };

  const handleConfirm = () => {
    const option = PRESETS.find((p) => p.id === selectedId) ?? PRESETS[0];
    onSelect(option.id === 'custom' ? customMinutes : option.minutes);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>לכמה זמן לפתוח את האפליקציות?</Text>
      <Text style={styles.subtitle}>לאחר מכן הן ייחסמו שוב עד לתפילה הבאה</Text>

      <View style={styles.options}>
        {PRESETS.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handlePick(option)}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedId === 'custom' && (
        <View style={styles.customWrap}>
          <Text style={styles.customValue}>{customMinutes} דקות</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={180}
            step={5}
            value={customMinutes}
            onValueChange={setCustomMinutes}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.surfacePressed}
            thumbTintColor={colors.primary}
          />
        </View>
      )}

      <PrimaryButton label="אישור" onPress={handleConfirm} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  prompt: {
    ...typography.heading,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  options: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
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
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  customWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customValue: {
    ...typography.heading,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  button: {
    marginTop: spacing.md,
  },
});
