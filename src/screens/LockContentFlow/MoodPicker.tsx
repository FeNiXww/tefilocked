import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { ALL_MOODS } from '../../content/types';
import type { Mood } from '../../content/types';
import { pickG, type Gender } from '../Onboarding/onboardingState';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import { moodLabel } from './moodLabels';

interface MoodPickerProps {
  onSelect: (mood: Mood) => void;
  gender: Gender | null;
}

export function MoodPicker({ onSelect, gender }: MoodPickerProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const handleSelect = (mood: Mood) => {
    haptics.selection();
    onSelect(mood);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{pickG(gender, 'איך אתה מרגיש עכשיו?', 'איך את מרגישה עכשיו?')}</Text>
      <View style={styles.grid}>
        {ALL_MOODS.map((mood) => (
          <Pressable
            key={mood}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => handleSelect(mood)}
          >
            <Text style={styles.chipText}>{moodLabel(mood, gender)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    prompt: {
      ...typography.heading,
      marginBottom: spacing.xl,
    },
    grid: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.md,
    },
    chip: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: 24,
      backgroundColor: colors.surface,
    },
    chipPressed: {
      backgroundColor: colors.surfacePressed,
    },
    chipText: {
      ...typography.body,
    },
  });
}
