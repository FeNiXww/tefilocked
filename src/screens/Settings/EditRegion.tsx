import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getOnboardingGender, getUserRegion, setUserRegion, type UserRegion } from '../../data/storage/mmkv';
import { pickG } from '../Onboarding/onboardingState';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

interface EditRegionProps {
  onComplete: () => void;
}

const OPTIONS: { id: UserRegion; label: string }[] = [
  { id: 'israel', label: 'ישראל' },
  { id: 'diaspora', label: 'חו״ל' },
];

/**
 * Israel-vs-Diaspora affects a small, specific set of calendar facts (the
 * extra Yom Tov Sheni day on Sukkot/Pesach/Shavuot, and Simchat Torah's
 * date) that the liturgical eligibility engine uses — never inferred from
 * GPS, never forced during onboarding; a user who hasn't set this stays
 * `'unknown'`, and the engine documents exactly what conservative fallback
 * it uses in that case (see `liturgicalEligibility.ts`). This screen is the
 * only way to set it, reachable only if someone goes looking in Settings —
 * not surfaced proactively, since most users never need to touch it.
 */
export function EditRegion({ onComplete }: EditRegionProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const [selected, setSelected] = useState<UserRegion>(() => getUserRegion());
  const gender = getOnboardingGender();

  const handleSelect = (id: UserRegion) => {
    haptics.selection();
    setSelected(id);
  };

  const handleSave = () => {
    setUserRegion(selected);
    onComplete();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{pickG(gender, 'באיזה אזור אתה נמצא?', 'באיזה אזור את נמצאת?')}</Text>
      <Text style={styles.subtitle}>
        זה משפיע רק על כמה עובדות לוח שנה עדינות (כמו יום טוב שני של גלויות) שמשמשות את מנוע ההקשר ההלכתי של
        האפליקציה.
      </Text>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const isSelected = option.id === selected;
          return (
            <Pressable
              key={option.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handleSelect(option.id)}
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

      <PrimaryButton label="שמור" onPress={handleSave} style={styles.button} />
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
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
}
