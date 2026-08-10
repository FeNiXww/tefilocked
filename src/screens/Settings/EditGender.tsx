import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getOnboardingGender, setOnboardingGender, type StoredGender } from '../../data/storage/mmkv';
import { GENDER_QUESTION } from '../Onboarding/questionBank';
import { colors, spacing, typography } from '../../theme';

interface EditGenderProps {
  onComplete: () => void;
}

/** Settings' gender editor — same options as the onboarding gender step, so the change also affects gendered copy (e.g. the prayer mood picker) going forward. */
export function EditGender({ onComplete }: EditGenderProps) {
  const [selected, setSelected] = useState<StoredGender | null>(() => getOnboardingGender());

  const handleSelect = (id: StoredGender) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(id);
  };

  const handleSave = () => {
    if (!selected) return;
    setOnboardingGender(selected);
    onComplete();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{GENDER_QUESTION.title}</Text>
      {GENDER_QUESTION.subtitle ? <Text style={styles.subtitle}>{GENDER_QUESTION.subtitle}</Text> : null}

      <View style={styles.options}>
        {GENDER_QUESTION.options.map((option) => {
          const isSelected = option.id === selected;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleSelect(option.id as StoredGender)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="שמור" onPress={handleSave} disabled={!selected} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
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
